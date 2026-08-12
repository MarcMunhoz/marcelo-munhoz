import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CloudinaryMediaConfigurationError,
  CloudinaryMediaRequestError,
  ContentfulAdminConfigurationError,
  ContentfulManagementRequestError,
  ContentfulVersionConflictError,
  createContentfulAdminHandler,
  createContentfulManagementFacade,
  devPreviewSessionFromHeaders,
  sessionFromNetlifyUser,
} from "../middleware/contentfulAdmin.js";

const parse = (response) => JSON.parse(response.body);

const createSession = (roles = [], overrides = {}) => ({
  subject: "user-123",
  name: "Guest Writer",
  roles,
  ...overrides,
});

describe("contentful admin handler", () => {
  it("creates local preview sessions from dev-only role headers", () => {
    assert.deepEqual(devPreviewSessionFromHeaders({ "x-admin-preview-role": "owner" }, { nodeEnv: "development" }), {
      subject: "local-preview-owner",
      name: "Owner preview",
      roles: ["owner"],
      preview: true,
    });
    assert.deepEqual(devPreviewSessionFromHeaders({ "x-admin-preview-role": "writer" }, { nodeEnv: "development" }).roles, ["writer"]);
    assert.equal(devPreviewSessionFromHeaders({ "x-admin-preview-role": "owner" }, { nodeEnv: "production" }), null);
    assert.equal(devPreviewSessionFromHeaders({ "x-admin-preview-role": "admin" }, { nodeEnv: "development" }), null);
  });

  it("loads the Contentful author profile id from Netlify user metadata", () => {
    assert.deepEqual(
      sessionFromNetlifyUser({
        sub: "user-123",
        email: "writer@example.test",
        app_metadata: {
          roles: ["writer"],
          authorEntryId: "author-1",
        },
      }),
      {
        subject: "user-123",
        name: "writer@example.test",
        roles: ["writer"],
        authorEntryId: "author-1",
      }
    );
  });

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

  it("loads admin article dashboard data through Contentful Management reads", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url: String(url), options });

      if (!String(url).includes("content_type=")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              items: [
                {
                  sys: { id: "article-1", version: 7, publishedVersion: 5, updatedAt: "2026-08-11T10:00:00Z", contentType: { sys: { id: "article" } } },
                  metadata: { tags: [{ sys: { id: "contentful" } }] },
                  fields: {
                    title: { "pt-BR": "Published article" },
                    slug: { "pt-BR": "published-article" },
                    description: { "pt-BR": "Published description" },
                    body: { "pt-BR": "# Published" },
                    createAt: { "pt-BR": "2026-08-11" },
                    author: { "pt-BR": { sys: { id: "author-1" }, fields: { name: { "pt-BR": "Marcelo Munhoz" } } } },
                    thumbnail: { "pt-BR": { public_id: "folder/published", secure_url: "https://example.test/published.jpg" } },
                    alt: { "pt-BR": "Published image" },
                  },
                },
                {
                  sys: { id: "article-2", version: 3, updatedAt: "2026-08-10T10:00:00Z", contentType: { sys: { id: "article" } } },
                  metadata: { tags: [] },
                  fields: {
                    title: { "pt-BR": "Writer draft" },
                    slug: { "pt-BR": "writer-draft" },
                    createAt: { "pt-BR": "2026-08-10" },
                    author: { "pt-BR": { sys: { type: "Link", linkType: "Entry", id: "author-2" } } },
                  },
                },
                {
                  sys: { id: "request-1", version: 2, contentType: { sys: { id: "blogEditorialRequest" } } },
                  fields: {
                    requestType: { "pt-BR": "publication" },
                    status: { "pt-BR": "readyForReview" },
                    article: { "pt-BR": { sys: { id: "article-2" } } },
                    writerSubject: { "pt-BR": "writer-123" },
                    writerName: { "pt-BR": "Guest Writer" },
                    createdAt: { "pt-BR": "2026-08-10T11:00:00Z" },
                  },
                },
                {
                  sys: { id: "ignored-1", version: 1, contentType: { sys: { id: "author" } } },
                  fields: { name: { "pt-BR": "Ignored Author" } },
                },
              ],
            };
          },
        };
      }

      throw new Error(`Unexpected Contentful URL: ${url}`);
    };

    const facade = createContentfulManagementFacade({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_MANAGEMENT_KEY: "management-token",
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      fetchImpl,
    });

    const dashboard = await facade.listAdminArticles({ session: createSession(["owner"]) });

    assert.deepEqual(
      dashboard.articles.map((article) => ({
        id: article.id,
        title: article.title,
        status: article.status,
        author: article.author,
        authorEntryId: article.authorEntryId,
        tags: article.tags,
        requestId: article.requestId,
      })),
      [
        {
          id: "article-1",
          title: "Published article",
          status: "published",
          author: "Marcelo Munhoz",
          authorEntryId: "author-1",
          tags: ["contentful"],
          requestId: undefined,
        },
        {
          id: "article-2",
          title: "Writer draft",
          status: "review",
          author: "author-2",
          authorEntryId: "author-2",
          tags: [],
          requestId: "request-1",
        },
      ]
    );
    assert.deepEqual(dashboard.summary, { published: 1, drafts: 0, review: 1, archived: 0, total: 2 });
    assert.deepEqual(dashboard.reviewRequests, [
      {
        id: "request-1",
        articleId: "article-2",
        requestType: "publication",
        status: "readyForReview",
        writerSubject: "writer-123",
        writerName: "Guest Writer",
        createdAt: "2026-08-10T11:00:00Z",
        version: 2,
      },
    ]);
    assert.match(calls[0].url, /\/entries\?/);
    assert.match(calls[0].url, /limit=100/);
    assert.doesNotMatch(calls[0].url, /content_type=|include=|order=/);
    assert.equal(calls.length, 2);
    assert.match(calls[1].url, /\/entries\/author-2$/);
    assert.equal(calls[0].options.headers.authorization, "Bearer management-token");
  });

  it("authorizes admin article read routes before loading Contentful data", async () => {
    let operationRan = false;
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      operations: {
        async listAdminArticles({ session }) {
          operationRan = true;
          return { articles: [], summary: { total: 0 }, requestedBy: session.subject };
        },
      },
    });

    const response = await handler({ method: "GET", path: "/articles" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(parse(response), { articles: [], summary: { total: 0 }, requestedBy: "user-123" });
    assert.equal(operationRan, true);
  });

  it("filters writer dashboard reads to published articles and that writer's workflow records", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(String(url));

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            items: [
              {
                sys: { id: "published-1", version: 5, publishedVersion: 4, contentType: { sys: { id: "article" } } },
                fields: { title: { "pt-BR": "Published" } },
              },
              {
                sys: { id: "own-review-1", version: 3, contentType: { sys: { id: "article" } } },
                fields: { title: { "pt-BR": "Own review" } },
              },
              {
                sys: { id: "other-review-1", version: 3, contentType: { sys: { id: "article" } } },
                fields: { title: { "pt-BR": "Other review" } },
              },
              {
                sys: { id: "unowned-draft-1", version: 2, contentType: { sys: { id: "article" } } },
                fields: { title: { "pt-BR": "Unowned draft" } },
              },
              {
                sys: { id: "request-own", version: 1, contentType: { sys: { id: "blogEditorialRequest" } } },
                fields: {
                  requestType: { "pt-BR": "publication" },
                  status: { "pt-BR": "readyForReview" },
                  article: { "pt-BR": { sys: { id: "own-review-1" } } },
                  writerSubject: { "pt-BR": "writer-123" },
                },
              },
              {
                sys: { id: "request-other", version: 1, contentType: { sys: { id: "blogEditorialRequest" } } },
                fields: {
                  requestType: { "pt-BR": "publication" },
                  status: { "pt-BR": "readyForReview" },
                  article: { "pt-BR": { sys: { id: "other-review-1" } } },
                  writerSubject: { "pt-BR": "writer-999" },
                },
              },
            ],
          };
        },
      };
    };
    const facade = createContentfulManagementFacade({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_MANAGEMENT_KEY: "management-token",
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      fetchImpl,
    });

    const dashboard = await facade.listAdminArticles({ session: { subject: "writer-123", roles: ["writer"] } });

    assert.deepEqual(
      dashboard.articles.map((article) => [article.id, article.status, article.requestId]),
      [
        ["published-1", "published", undefined],
        ["own-review-1", "review", "request-own"],
      ]
    );
    assert.deepEqual(
      dashboard.reviewRequests.map((request) => request.id),
      ["request-own"]
    );
    assert.deepEqual(dashboard.summary, { published: 1, drafts: 0, review: 1, archived: 0, total: 2 });
    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /content_type=|include=|order=/);
  });

  it("keeps dashboard article reads available when editorial workflow records are absent from the entry collection", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(String(url));

      return {
        ok: true,
        status: 200,
        async json() {
          return {
            items: [
              {
                sys: { id: "article-1", version: 3, publishedVersion: 2, contentType: { sys: { id: "article" } } },
                fields: { title: { "pt-BR": "Published" } },
              },
            ],
          };
        },
      };
    };
    const facade = createContentfulManagementFacade({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_MANAGEMENT_KEY: "management-token",
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      fetchImpl,
    });

    const dashboard = await facade.listAdminArticles({ session: createSession(["owner"]) });

    assert.deepEqual(dashboard.articles.map((article) => [article.id, article.status]), [["article-1", "published"]]);
    assert.deepEqual(dashboard.reviewRequests, []);
    assert.deepEqual(dashboard.summary, { published: 1, drafts: 0, review: 0, archived: 0, total: 1 });
    assert.equal(calls.length, 1);
    assert.doesNotMatch(calls[0], /content_type=|include=|order=/);
  });

  it("keeps resolved author names in admin article reads when Contentful returns expanded author fields", async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          items: [
            {
              sys: { id: "article-1", version: 3, publishedVersion: 2, contentType: { sys: { id: "article" } } },
              fields: {
                title: { "pt-BR": "Published" },
                author: {
                  "pt-BR": {
                    sys: { id: "author-1" },
                    fields: { name: { "pt-BR": "Marcelo Munhoz" } },
                  },
                },
              },
            },
          ],
        };
      },
    });
    const facade = createContentfulManagementFacade({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_MANAGEMENT_KEY: "management-token",
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      fetchImpl,
    });

    const dashboard = await facade.listAdminArticles({ session: createSession(["owner"]) });

    assert.equal(dashboard.articles[0].author, "Marcelo Munhoz");
    assert.equal(dashboard.articles[0].authorEntryId, "author-1");
  });

  it("resolves admin article author names from sibling author entries when articles contain author links", async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          items: [
            {
              sys: { id: "article-1", version: 3, publishedVersion: 2, contentType: { sys: { id: "article" } } },
              fields: {
                title: { "pt-BR": "Published" },
                author: {
                  "pt-BR": {
                    sys: { type: "Link", linkType: "Entry", id: "author-1" },
                  },
                },
              },
            },
            {
              sys: { id: "author-1", version: 11, contentType: { sys: { id: "author" } } },
              fields: {
                name: { "pt-BR": "Marcelo Munhoz" },
              },
            },
          ],
        };
      },
    });
    const facade = createContentfulManagementFacade({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_MANAGEMENT_KEY: "management-token",
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      fetchImpl,
    });

    const dashboard = await facade.listAdminArticles({ session: createSession(["owner"]) });

    assert.equal(dashboard.articles[0].author, "Marcelo Munhoz");
    assert.equal(dashboard.articles[0].authorEntryId, "author-1");
  });

  it("resolves admin article author names by fetching linked authors missing from the dashboard payload", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(String(url));

      if (String(url).endsWith("/entries?limit=100")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              items: [
                {
                  sys: { id: "article-1", version: 3, publishedVersion: 2, contentType: { sys: { id: "article" } } },
                  fields: {
                    title: { "pt-BR": "Published" },
                    author: { "pt-BR": { sys: { type: "Link", linkType: "Entry", id: "author-1" } } },
                  },
                },
              ],
            };
          },
        };
      }

      if (String(url).endsWith("/entries/author-1")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              sys: { id: "author-1", version: 11, contentType: { sys: { id: "author" } } },
              fields: { name: { "pt-BR": "Marcelo Munhoz" } },
            };
          },
        };
      }

      throw new Error(`Unexpected Contentful URL: ${url}`);
    };
    const facade = createContentfulManagementFacade({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_MANAGEMENT_KEY: "management-token",
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      fetchImpl,
    });

    const dashboard = await facade.listAdminArticles({ session: createSession(["owner"]) });

    assert.equal(dashboard.articles[0].author, "Marcelo Munhoz");
    assert.equal(dashboard.articles[0].authorEntryId, "author-1");
    assert.equal(calls.some((url) => url.endsWith("/entries/author-1")), true);
  });

  it("rejects article draft updates when the session is not the article creator", async () => {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
      calls.push({ url: String(url), method: options.method });

      if (String(url).endsWith("/entries/article-1")) {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              sys: { id: "article-1", version: 8, contentType: { sys: { id: "article" } } },
              fields: {
                author: { "pt-BR": { sys: { type: "Link", linkType: "Entry", id: "author-1" } } },
              },
            };
          },
        };
      }

      throw new Error(`Unexpected Contentful URL: ${url}`);
    };
    const facade = createContentfulManagementFacade({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_MANAGEMENT_KEY: "management-token",
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      fetchImpl,
    });

    await assert.rejects(
      () =>
        facade.updateArticleDraft({
          articleId: "article-1",
          data: { title: "Changed", version: 8 },
          session: createSession(["owner"], { authorEntryId: "author-2" }),
        }),
      {
        statusCode: 403,
        publicError: "Your account cannot edit this article.",
      }
    );
    assert.deepEqual(calls.map((call) => call.method), ["GET"]);
  });

  it("allows article draft updates when the session matches the article author profile", async () => {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
      calls.push({ url: String(url), method: options.method, body: options.body });

      if (String(url).endsWith("/entries/article-1") && options.method === "GET") {
        return {
          ok: true,
          status: 200,
          async json() {
            return {
              sys: { id: "article-1", version: 8, contentType: { sys: { id: "article" } } },
              fields: {
                author: { "pt-BR": { sys: { type: "Link", linkType: "Entry", id: "author-1" } } },
              },
            };
          },
        };
      }

      if (String(url).endsWith("/entries/article-1") && options.method === "PUT") {
        return {
          ok: true,
          status: 200,
          async json() {
            return { sys: { id: "article-1", version: 9 } };
          },
        };
      }

      throw new Error(`Unexpected Contentful URL: ${url}`);
    };
    const facade = createContentfulManagementFacade({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_MANAGEMENT_KEY: "management-token",
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      fetchImpl,
    });

    const response = await facade.updateArticleDraft({
      articleId: "article-1",
      data: { title: "Changed", version: 8 },
      session: createSession(["owner"], { authorEntryId: "author-1" }),
    });

    assert.deepEqual(response, { sys: { id: "article-1", version: 9 } });
    assert.deepEqual(calls.map((call) => call.method), ["GET", "PUT"]);
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

  it("includes safe upstream status details for local admin debugging without leaking diagnostics", async () => {
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      env: { NODE_ENV: "development" },
      operations: {
        async createArticleDraft() {
          throw new ContentfulManagementRequestError(400, {
            sys: { id: "BadRequest" },
            message: "The query you sent was invalid.",
            requestId: "do-not-expose",
            token: "do-not-expose",
          });
        },
      },
    });

    const response = await handler({ method: "POST", path: "/articles", body: "{}" });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(parse(response), {
      error: "Admin request failed",
      details: {
        upstream: "contentful",
        upstreamStatus: 400,
        id: "BadRequest",
        message: "The query you sent was invalid.",
      },
    });
    assert.doesNotMatch(response.body, /do-not-expose|token|secret|api\.contentful\.com|stack|requestId/i);
  });
});
