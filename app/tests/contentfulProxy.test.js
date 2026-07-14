import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createContentfulHandler } from "../middleware/contentfulProxy.js";

function createClient(overrides = {}) {
  return {
    async getEntries(query) {
      return { items: [], total: 0, query };
    },
    async getTags() {
      return { items: [] };
    },
    ...overrides,
  };
}

describe("contentful proxy handler", () => {
  it("fetches paginated article entries with the existing query shape", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [{ sys: { id: "article-1" } }], total: 7 };
        },
      }),
    });

    const response = await handler({ path: "/entries", query: { page: "3", accessToken: "browser-token" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { items: [{ sys: { id: "article-1" } }], total: 7 });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-sys.createdAt,-fields.createAt",
        limit: 3,
        skip: 6,
      },
    ]);
  });

  it("fetches tags through the Contentful client", async () => {
    const handler = createContentfulHandler({
      client: createClient({
        async getTags() {
          return { items: [{ sys: { id: "javascript" } }] };
        },
      }),
    });

    const response = await handler({ path: "/tags", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { items: [{ sys: { id: "javascript" } }] });
  });

  it("fetches tagged articles with the requested tag and pagination", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: 4 };
        },
      }),
    });

    const response = await handler({ path: "/tagged", query: { tag: "vue", page: "2", space: "browser-space" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { items: [], total: 4 });
    assert.deepEqual(calls, [
      {
        "metadata.tags.sys.id[all]": "vue",
        content_type: "article",
        order: "-fields.createAt",
        limit: 3,
        skip: 3,
      },
    ]);
  });

  it("returns a single article by slug", async () => {
    const article = { sys: { id: "article-1" }, fields: { slug: "hello" } };
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries() {
          return { items: [article], total: 1 };
        },
      }),
    });

    const response = await handler({ path: "/article/hello", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), article);
  });

  it("returns 404 JSON when article slug is not found", async () => {
    const handler = createContentfulHandler({ client: createClient() });

    const response = await handler({ path: "/article/missing", query: {} });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Article not found" });
  });

  it("returns a safe configuration error when credentials are missing", async () => {
    const messages = [];
    const handler = createContentfulHandler({ env: {}, logger: { error: (...args) => messages.push(args.join(" ")) } });

    const response = await handler({ path: "/entries", query: {} });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), { error: "Server configuration error" });
    assert.doesNotMatch(response.body, /CONTENTFUL|token|key|secret/i);
    assert.deepEqual(messages, ["Contentful runtime configuration is missing"]);
  });

  it("normalizes upstream errors without leaking diagnostics", async () => {
    const messages = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries() {
          throw new Error("upstream failed with secret-token");
        },
      }),
      logger: { error: (...args) => messages.push(args.join(" ")) },
    });

    const response = await handler({ path: "/entries", query: {} });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), { error: "Failed to fetch content" });
    assert.doesNotMatch(response.body, /secret-token|stack|upstream failed/i);
    assert.equal(messages.length, 1);
  });

  it("returns 404 for unknown proxy routes", async () => {
    const handler = createContentfulHandler({ client: createClient() });

    const response = await handler({ path: "/unknown", query: {} });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Not found" });
  });

  it("normalizes Netlify Function redirect paths before routing", async () => {
    const handler = createContentfulHandler({
      client: createClient({
        async getTags() {
          return { items: [{ sys: { id: "netlify" } }] };
        },
      }),
    });

    const response = await handler({ path: "/.netlify/functions/contentful/tags", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { items: [{ sys: { id: "netlify" } }] });
  });
});
