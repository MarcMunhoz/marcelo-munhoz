import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createContentfulAdminHandler } from "../middleware/contentfulAdmin.js";

const parse = (response) => JSON.parse(response.body);

const createSession = (roles = []) => ({
  subject: "user-123",
  name: "Guest Writer",
  roles,
});

describe("contentful admin handler", () => {
  it("rejects unauthenticated admin API requests without running an operation", async () => {
    let operationRan = false;
    const handler = createContentfulAdminHandler({
      getSession() {
        return null;
      },
      operations: {
        async createArticleDraft() {
          operationRan = true;
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles", body: "{}" });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(parse(response), { error: "Authentication required" });
    assert.equal(operationRan, false);
  });

  it("allows writer sessions to reach writer article draft routes", async () => {
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      operations: {
        async createArticleDraft({ session }) {
          return { draft: { id: "draft-1" }, writer: session.subject };
        },
      },
    });

    const response = await handler({
      method: "POST",
      path: "/articles",
      body: JSON.stringify({ title: "Draft" }),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(parse(response), { draft: { id: "draft-1" }, writer: "user-123" });
  });

  it("rejects writer sessions before owner-only operations run", async () => {
    let operationRan = false;
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      operations: {
        async publishArticle() {
          operationRan = true;
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles/article-1/publish", body: "{}" });

    assert.equal(response.statusCode, 403);
    assert.deepEqual(parse(response), { error: "Owner role required" });
    assert.equal(operationRan, false);
  });

  it("allows owner sessions to reach owner-only routes", async () => {
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["owner"]);
      },
      operations: {
        async publishArticle({ articleId, session }) {
          return { articleId, approvedBy: session.subject };
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles/article-1/publish", body: "{}" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(parse(response), { articleId: "article-1", approvedBy: "user-123" });
  });

  it("keeps workflow endpoints unimplemented until editorial request storage is added", async () => {
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      env: {},
    });

    const response = await handler({ method: "POST", path: "/articles/article-1/submit", body: "{}" });

    assert.equal(response.statusCode, 501);
    assert.deepEqual(parse(response), { error: "Admin operation not implemented" });
  });

  it("normalizes admin operation failures without leaking raw diagnostics", async () => {
    const messages = [];
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      logger: { error: (...args) => messages.push(args.join(" ")) },
      operations: {
        async createArticleDraft() {
          throw new Error("upstream failed with secret-token");
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles", body: "{}" });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(parse(response), { error: "Admin request failed" });
    assert.doesNotMatch(response.body, /secret-token|upstream failed|stack/i);
    assert.equal(messages.length, 1);
  });
});
