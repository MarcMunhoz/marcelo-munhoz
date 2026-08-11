import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CloudinaryMediaConfigurationError,
  CloudinaryMediaRequestError,
  ContentfulAdminConfigurationError,
  ContentfulVersionConflictError,
  createContentfulAdminHandler,
} from "../middleware/contentfulAdmin.js";

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

  it("rejects authenticated users without writer role before writer operations run", async () => {
    for (const [method, path, operationName] of [
      ["POST", "/articles", "createArticleDraft"],
      ["PUT", "/articles/article-1", "updateArticleDraft"],
      ["POST", "/articles/article-1/submit", "submitArticleForReview"],
      ["POST", "/articles/article-1/unpublication-requests", "requestUnpublication"],
      ["GET", "/media/assets", "listMedia"],
      ["POST", "/media/upload", "uploadMedia"],
    ]) {
      let operationRan = false;
      const handler = createContentfulAdminHandler({
        getSession() {
          return createSession(["viewer"]);
        },
        operations: {
          async [operationName]() {
            operationRan = true;
          },
        },
      });

      const response = await handler({ method, path, query: {}, body: "{}" });

      assert.equal(response.statusCode, 403);
      assert.deepEqual(parse(response), { error: "Writer role required" });
      assert.equal(operationRan, false);
    }
  });

  it("allows owner sessions to reach writer routes", async () => {
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["owner"]);
      },
      operations: {
        async createArticleDraft({ session }) {
          return { writer: session.subject };
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles", body: JSON.stringify({ title: "Owner draft" }) });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(parse(response), { writer: "user-123" });
  });

  it("rejects writer sessions before owner-only operations run", async () => {
    for (const [method, path, operationName] of [
      ["POST", "/articles/article-1/publish", "publishArticle"],
      ["POST", "/articles/article-1/unpublish", "unpublishArticle"],
      ["POST", "/articles/article-1/archive", "archiveArticle"],
      ["DELETE", "/articles/article-1", "deleteArticle"],
    ]) {
      let operationRan = false;
      const handler = createContentfulAdminHandler({
        getSession() {
          return createSession(["writer"]);
        },
        operations: {
          async [operationName]() {
            operationRan = true;
          },
        },
      });

      const response = await handler({ method, path, body: "{}" });

      assert.equal(response.statusCode, 403);
      assert.deepEqual(parse(response), { error: "Owner role required" });
      assert.equal(operationRan, false);
    }
  });

  it("allows owner sessions to reach owner-only routes", async () => {
    for (const [method, path, operationName] of [
      ["POST", "/articles/article-1/publish", "publishArticle"],
      ["POST", "/articles/article-1/unpublish", "unpublishArticle"],
      ["POST", "/articles/article-1/archive", "archiveArticle"],
      ["DELETE", "/articles/article-1", "deleteArticle"],
    ]) {
      const handler = createContentfulAdminHandler({
        getSession() {
          return createSession(["owner"]);
        },
        operations: {
          async [operationName]({ articleId, session }) {
            return { articleId, approvedBy: session.subject, operationName };
          },
        },
      });

      const response = await handler({ method, path, body: "{}" });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(parse(response), { articleId: "article-1", approvedBy: "user-123", operationName });
    }
  });

  it("allows writer sessions to record submit-for-review workflow requests", async () => {
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      operations: {
        async submitArticleForReview({ articleId, session }) {
          return {
            sys: { id: "request-1" },
            articleId,
            writer: session.subject,
          };
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles/article-1/submit", body: JSON.stringify({ version: 5 }) });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(parse(response), { sys: { id: "request-1" }, articleId: "article-1", writer: "user-123" });
  });

  it("allows writer sessions to record unpublication workflow requests", async () => {
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      operations: {
        async requestUnpublication({ articleId, session }) {
          return {
            sys: { id: "request-2" },
            articleId,
            writer: session.subject,
          };
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles/article-1/unpublication-requests", body: JSON.stringify({ version: 5 }) });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(parse(response), { sys: { id: "request-2" }, articleId: "article-1", writer: "user-123" });
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

  it("keeps user-intended admin logs free from secret details and raw diagnostics", async () => {
    const secretValue = "cfmgmt_sanitized_secret_123";
    const messages = [];
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      logger: { error: (...args) => messages.push(args.join(" ")) },
      operations: {
        async createArticleDraft() {
          const error = new Error(
            `CONTENTFUL_MANAGEMENT_KEY=${secretValue} failed upstream at https://api.contentful.com/spaces/private-space`
          );
          error.stack = `Error: ${error.message}\n    at privateFunction (/private/path/contentful.js:42:7)`;
          throw error;
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles", body: "{}" });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(parse(response), { error: "Admin request failed" });
    assert.equal(messages.length, 1);
    assert.doesNotMatch(messages[0], /CONTENTFUL_MANAGEMENT_KEY|cfmgmt_sanitized_secret_123|api\.contentful\.com|privateFunction|\/private\/path|stack/i);
  });

  it("returns safe handler responses for known facade errors", async () => {
    for (const [error, expectedStatus, expectedBody] of [
      [new ContentfulAdminConfigurationError(), 500, { error: "Server configuration error" }],
      [new CloudinaryMediaConfigurationError(), 500, { error: "Media configuration error" }],
      [new ContentfulVersionConflictError(), 409, { error: "Article changed. Reload before saving." }],
      [new CloudinaryMediaRequestError(503), 500, { error: "Media request failed" }],
    ]) {
      const messages = [];
      const handler = createContentfulAdminHandler({
        getSession() {
          return createSession(["writer"]);
        },
        logger: { error: (...args) => messages.push(args.join(" ")) },
        operations: {
          async createArticleDraft() {
            throw error;
          },
        },
      });

      const response = await handler({ method: "POST", path: "/articles", body: "{}" });

      assert.equal(response.statusCode, expectedStatus);
      assert.deepEqual(parse(response), expectedBody);
      assert.doesNotMatch(response.body, /CONTENTFUL|CLOUDINARY|key|secret|token|stack|raw/i);
    }
  });
});
