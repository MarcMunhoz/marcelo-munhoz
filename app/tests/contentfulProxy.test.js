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

  it("returns a public author profile and author articles without identity metadata", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query.content_type === "author") {
            return {
              items: [
                {
                  sys: { id: "author-1" },
                  fields: {
                    name: "Marcelo Munhoz",
                    slug: "marcelo-munhoz",
                    biography: "But first...",
                    email: "private@example.test",
                  },
                },
              ],
              total: 1,
            };
          }

          return {
            items: [{ sys: { id: "article-1" }, fields: { title: "Article", slug: "article" } }],
            total: 1,
          };
        },
      }),
    });

    const response = await handler({ path: "/author/marcelo-munhoz", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      author: {
        sys: { id: "author-1" },
        fields: {
          name: "Marcelo Munhoz",
          slug: "marcelo-munhoz",
          biography: "But first...",
        },
      },
      articles: [{ sys: { id: "article-1" }, fields: { title: "Article", slug: "article" } }],
    });
    assert.deepEqual(calls, [
      {
        content_type: "author",
        "fields.slug": "marcelo-munhoz",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.author.sys.id": "author-1",
        order: "-fields.createAt",
        limit: 100,
      },
    ]);
    assert.doesNotMatch(response.body, /private@example|identity|roles|invite/i);
  });

  it("resolves public author routes from a derived name slug when Contentful slug is missing", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query.content_type === "author" && query["fields.slug"]) {
            return { items: [], total: 0 };
          }

          if (query.content_type === "author") {
            return {
              items: [
                {
                  sys: { id: "author-1" },
                  fields: {
                    name: "Marcelo Munhoz",
                    biography: "But first...",
                    photo: "https://secure.gravatar.com/avatar/example",
                  },
                },
              ],
              total: 1,
            };
          }

          return {
            items: [{ sys: { id: "article-1" }, fields: { title: "Article", slug: "article" } }],
            total: 1,
          };
        },
      }),
    });

    const response = await handler({ path: "/author/marcelo-munhoz", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      author: {
        sys: { id: "author-1" },
        fields: {
          name: "Marcelo Munhoz",
          slug: "marcelo-munhoz",
          biography: "But first...",
          photo: "https://secure.gravatar.com/avatar/example",
        },
      },
      articles: [{ sys: { id: "article-1" }, fields: { title: "Article", slug: "article" } }],
    });
    assert.deepEqual(calls, [
      {
        content_type: "author",
        "fields.slug": "marcelo-munhoz",
        limit: 1,
      },
      {
        content_type: "author",
        limit: 100,
      },
      {
        content_type: "article",
        "fields.author.sys.id": "author-1",
        order: "-fields.createAt",
        limit: 100,
      },
    ]);
  });

  it("resolves public author routes when Contentful rejects the optional slug field filter", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query.content_type === "author" && query["fields.slug"]) {
            throw new Error("InvalidQuery");
          }

          if (query.content_type === "author") {
            return {
              items: [
                {
                  sys: { id: "author-1" },
                  fields: {
                    name: "Marcelo Munhoz",
                    bio: {
                      nodeType: "document",
                      data: {},
                      content: [
                        {
                          nodeType: "paragraph",
                          data: {},
                          content: [{ nodeType: "text", value: "But first...", marks: [], data: {} }],
                        },
                      ],
                    },
                    photo: {
                      fields: {
                        file: {
                          url: "//images.ctfassets.net/space/marcelo.jpg",
                        },
                      },
                    },
                  },
                },
              ],
              total: 1,
            };
          }

          return {
            items: [
              {
                sys: { id: "article-1" },
                fields: {
                  title: "Article",
                  slug: "article",
                  author: { sys: { id: "author-1" } },
                },
              },
            ],
            total: 1,
          };
        },
      }),
    });

    const response = await handler({ path: "/author/marcelo-munhoz", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      author: {
        sys: { id: "author-1" },
        fields: {
          name: "Marcelo Munhoz",
          slug: "marcelo-munhoz",
          biography: "But first...",
          photo: {
            fields: {
              file: {
                url: "//images.ctfassets.net/space/marcelo.jpg",
              },
            },
          },
        },
      },
      articles: [
        {
          sys: { id: "article-1" },
          fields: {
            title: "Article",
            slug: "article",
            author: { sys: { id: "author-1" } },
          },
        },
      ],
    });
    assert.deepEqual(calls, [
      {
        content_type: "author",
        "fields.slug": "marcelo-munhoz",
        limit: 1,
      },
      {
        content_type: "author",
        limit: 100,
      },
      {
        content_type: "article",
        "fields.author.sys.id": "author-1",
        order: "-fields.createAt",
        limit: 100,
      },
    ]);
  });

  it("falls back to local author article matching when Contentful rejects linked author filters", async () => {
    const calls = [];
    const articleForAuthor = {
      sys: { id: "article-1" },
      fields: {
        title: "Article",
        slug: "article",
        author: { sys: { id: "author-1" }, fields: { name: "Marcelo Munhoz" } },
      },
    };
    const articleForOtherAuthor = {
      sys: { id: "article-2" },
      fields: {
        title: "Other",
        slug: "other",
        author: { sys: { id: "author-2" }, fields: { name: "Guest Writer" } },
      },
    };
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query.content_type === "author") {
            return {
              items: [
                {
                  sys: { id: "author-1" },
                  fields: {
                    name: "Marcelo Munhoz",
                    slug: "marcelo-munhoz",
                  },
                },
              ],
              total: 1,
            };
          }

          if (query["fields.author.sys.id"]) {
            throw new Error("InvalidQuery");
          }

          return { items: [articleForAuthor, articleForOtherAuthor], total: 2 };
        },
      }),
    });

    const response = await handler({ path: "/author/marcelo-munhoz", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body).articles, [articleForAuthor]);
    assert.deepEqual(calls, [
      {
        content_type: "author",
        "fields.slug": "marcelo-munhoz",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.author.sys.id": "author-1",
        order: "-fields.createAt",
        limit: 100,
      },
      {
        content_type: "article",
        include: 2,
        order: "-fields.createAt",
        limit: 100,
      },
    ]);
  });

  it("returns 404 JSON when author slug is not found", async () => {
    const handler = createContentfulHandler({ client: createClient() });

    const response = await handler({ path: "/author/missing", query: {} });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Author not found" });
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

  it("fetches entries from the Contentful Delivery API and resolves included links", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_DELIVERY_KEY: "delivery-key",
      },
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        return {
          ok: true,
          async json() {
            return {
              items: [
                {
                  sys: { id: "article-1", type: "Entry" },
                  fields: {
                    author: { sys: { type: "Link", linkType: "Entry", id: "author-1" } },
                  },
                },
              ],
              includes: {
                Entry: [
                  {
                    sys: { id: "author-1", type: "Entry" },
                    fields: { name: "Marcelo Munhoz" },
                  },
                ],
              },
              total: 1,
            };
          },
        };
      },
    });

    const response = await handler({ path: "/entries", query: { page: "2" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body).items[0].fields.author.fields, { name: "Marcelo Munhoz" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.headers.authorization, "Bearer delivery-key");

    const url = new URL(calls[0].url);
    assert.equal(url.origin, "https://cdn.contentful.com");
    assert.equal(url.pathname, "/spaces/space-id/environments/master/entries");
    assert.equal(url.searchParams.get("content_type"), "article");
    assert.equal(url.searchParams.get("limit"), "3");
    assert.equal(url.searchParams.get("skip"), "3");
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
