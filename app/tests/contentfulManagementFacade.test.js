import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ContentfulAdminConfigurationError,
  ContentfulManagementRequestError,
  ContentfulVersionConflictError,
  createContentfulManagementFacade,
} from "../middleware/contentfulAdmin.js";

const createEnv = () => ({
  CONTENTFUL_SPACE_ID: "space-id",
  CONTENTFUL_MANAGEMENT_KEY: "management-key",
  CONTENTFUL_ENVIRONMENT_ID: "staging",
});

const createResponse = (status, payload = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return payload;
  },
});

describe("contentful management facade", () => {
  it("creates article draft entries with localized fields and server-side credentials", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        if (url.toString().endsWith("/tags?limit=1000")) {
          return createResponse(200, {
            items: [
              { sys: { id: "vue" } },
              { sys: { id: "contentful" } },
            ],
          });
        }
        if (url.toString().endsWith("/locales")) {
          return createResponse(200, {
            items: [{ code: "en-US", default: true }],
          });
        }
        return createResponse(201, { sys: { id: "article-1", version: 1 } });
      },
    });

    const result = await facade.createArticleDraft({
      data: {
        title: "Draft title",
        slug: "draft-title",
        description: "Draft description",
        body: "# Draft",
        createAt: "2026-08-11",
        author: "author-1",
        thumbnail: { public_id: "folder/image", secure_url: "https://example.invalid/image.jpg" },
        alt: "Draft thumbnail",
        tags: ["vue", "contentful", "unknown tag"],
      },
      session: { subject: "writer-123", authorEntryId: "author-1" },
    });

    assert.deepEqual(result, { sys: { id: "article-1", version: 1 } });
    assert.equal(calls.length, 3);

    assert.equal(new URL(calls[0].url).pathname, "/spaces/space-id/environments/staging/tags");
    assert.equal(new URL(calls[1].url).pathname, "/spaces/space-id/environments/staging/locales");

    const url = new URL(calls[2].url);
    assert.equal(url.origin, "https://api.contentful.com");
    assert.equal(url.pathname, "/spaces/space-id/environments/staging/entries");
    assert.equal(calls[2].options.method, "POST");
    assert.equal(calls[2].options.headers.authorization, "Bearer management-key");
    assert.equal(calls[2].options.headers["x-contentful-content-type"], "article");

    const body = JSON.parse(calls[2].options.body);
    assert.equal(body.fields.title["en-US"], "Draft title");
    assert.equal(body.fields.slug["en-US"], "draft-title");
    assert.equal(body.fields.description["en-US"], "Draft description");
    assert.equal(body.fields.body["en-US"], "# Draft");
    assert.equal(body.fields.createAt["en-US"], "2026-08-11T12:00:00.000Z");
    assert.deepEqual(body.fields.author["en-US"], {
      sys: { type: "Link", linkType: "Entry", id: "author-1" },
    });
    assert.equal(body.fields.writerSubject, undefined);
    assert.equal(body.fields.thumbnail, undefined);
    assert.deepEqual(body.fields.cloudinary["en-US"], [{ public_id: "folder/image", secure_url: "https://example.invalid/image.jpg" }]);
    assert.equal(body.fields.alt["en-US"], "Draft thumbnail");
    assert.deepEqual(body.metadata.tags, [
      { sys: { type: "Link", linkType: "Tag", id: "vue" } },
      { sys: { type: "Link", linkType: "Tag", id: "contentful" } },
    ]);
  });

  it("writes updated article timestamps only when the Contentful article model supports the field", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (url.toString().endsWith("/locales")) {
          return createResponse(200, {
            items: [
              { code: "en-US", default: true },
              { code: "pt-BR", default: false },
              { code: "es-ES", default: false },
            ],
          });
        }

        if (url.toString().endsWith("/content_types/article")) {
          return createResponse(200, {
            fields: [
              { id: "title" },
              { id: "slug" },
              { id: "description" },
              { id: "body" },
              { id: "createAt" },
              { id: "author" },
            ],
          });
        }

        if (options.method === "GET") {
          return createResponse(200, {
            sys: { id: "article-1", version: 7 },
            fields: {
              author: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "author-1" } } },
            },
          });
        }

        return createResponse(200, { sys: { id: "article-1", version: 8 } });
      },
    });

    await facade.updateArticleDraft({
      articleId: "article-1",
      data: {
        version: 7,
        title: "Updated title",
        slug: "updated-title",
        description: "Updated description",
        body: "Updated body",
        createAt: "2026-08-11T12:00:00.000Z",
        updatedAt: "2026-08-13T18:20:30.000Z",
        author: "author-1",
      },
      session: { authorEntryId: "author-1" },
    });

    const updateCall = calls.find((call) => call.options.method === "PUT");
    const body = JSON.parse(updateCall.options.body);

    assert.equal(
      calls.some((call) => new URL(call.url).pathname === "/spaces/space-id/environments/staging/content_types/article"),
      true
    );
    assert.equal(body.fields.createAt["en-US"], "2026-08-11T12:00:00.000Z");
    assert.equal(body.fields.updatedAt, undefined);
  });

  it("writes editorial article locale only when the Contentful article model supports the field", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (url.toString().endsWith("/tags?limit=1000")) {
          return createResponse(200, { items: [] });
        }

        if (url.toString().endsWith("/locales")) {
          return createResponse(200, {
            items: [
              { code: "en-US", default: true },
              { code: "pt-BR", default: false },
              { code: "es-ES", default: false },
            ],
          });
        }

        if (url.toString().endsWith("/content_types/article")) {
          return createResponse(200, {
            fields: [
              { id: "title" },
              { id: "slug" },
              { id: "description" },
              { id: "body" },
              { id: "createAt" },
              { id: "locale", localized: true },
              { id: "author" },
            ],
          });
        }

        return createResponse(201, { sys: { id: "article-1", version: 1 } });
      },
    });

    await facade.createArticleDraft({
      data: {
        title: "Draft title",
        slug: "draft-title",
        description: "Draft description",
        body: "# Draft",
        createAt: "2026-08-11",
        locale: "pt-BR",
        author: "author-1",
      },
      session: { subject: "writer-123", authorEntryId: "author-1" },
    });

    const createCall = calls.find((call) => call.options.method === "POST");
    const body = JSON.parse(createCall.options.body);

    assert.equal(
      calls.some((call) => new URL(call.url).pathname === "/spaces/space-id/environments/staging/content_types/article"),
      true
    );
    assert.deepEqual(body.fields.locale, {
      "en-US": "pt-BR",
      "pt-BR": "pt-BR",
      "es-ES": "pt-BR",
    });
  });

  it("rejects locale saves when the article model has no locale field", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (url.toString().endsWith("/tags?limit=1000")) {
          return createResponse(200, {
            items: [
              { sys: { id: "ai" } },
              { sys: { id: "article-lang-en-us" } },
            ],
          });
        }

        if (url.toString().endsWith("/locales")) {
          return createResponse(200, {
            items: [{ code: "en-US", default: true }],
          });
        }

        if (url.toString().endsWith("/content_types/article")) {
          return createResponse(200, {
            fields: [{ id: "title" }, { id: "slug" }, { id: "description" }, { id: "body" }, { id: "createAt" }, { id: "author" }],
          });
        }

        return createResponse(201, { sys: { id: "article-1", version: 1 } });
      },
    });

    await assert.rejects(
      () =>
        facade.createArticleDraft({
          data: {
            title: "Draft title",
            slug: "draft-title",
            description: "Draft description",
            body: "# Draft",
            createAt: "2026-08-11",
            locale: "en-US",
            author: "author-1",
            tags: ["ai"],
          },
          session: { subject: "writer-123", authorEntryId: "author-1" },
        }),
      ContentfulAdminConfigurationError
    );

    assert.equal(calls.some((call) => call.url.includes("/tags/article-lang-")), false);
    assert.equal(calls.some((call) => call.options.method === "POST"), false);
  });

  it("rejects unsupported editorial locales before calling Contentful", async () => {
    let called = false;
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl() {
        called = true;
        return createResponse(200, {});
      },
    });

    await assert.rejects(
      () =>
        facade.createArticleDraft({
          data: { title: "Article", locale: "fr-FR", author: "author-1" },
          session: { subject: "writer-1", authorEntryId: "author-1" },
        }),
      ContentfulAdminConfigurationError
    );
    assert.equal(called, false);
  });

  it("fails locale saves safely when Contentful schema or locale metadata is unavailable", async () => {
    for (const unavailableResource of ["content_type", "locales"]) {
      const calls = [];
      const facade = createContentfulManagementFacade({
        env: createEnv(),
        async fetchImpl(url, options) {
          calls.push({ url: url.toString(), options });

          if (url.toString().endsWith("/content_types/article")) {
            return unavailableResource === "content_type"
              ? createResponse(500, { message: "Unavailable" })
              : createResponse(200, { fields: [{ id: "locale", type: "Symbol", localized: true }] });
          }

          if (url.toString().endsWith("/locales")) {
            return createResponse(500, { message: "Unavailable" });
          }

          return createResponse(200, { items: [] });
        },
      });

      await assert.rejects(
        () =>
          facade.createArticleDraft({
            data: { title: "Article", locale: "pt-BR", author: "author-1", tags: [] },
            session: { subject: "writer-1", authorEntryId: "author-1" },
          }),
        ContentfulManagementRequestError
      );
      assert.equal(calls.some((call) => call.options.method === "POST"), false);
    }
  });

  it("updates article drafts with the supplied version header", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (options.method === "GET") {
          return createResponse(200, {
            sys: { id: "article-1", version: 7 },
            fields: {
              author: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "author-1" } } },
            },
          });
        }

        return createResponse(200, { sys: { id: "article-1", version: 8 } });
      },
    });

    await facade.updateArticleDraft({
      articleId: "article-1",
      data: {
        version: 7,
        fields: {
          title: { "en-US": "Updated title" },
        },
      },
      session: { authorEntryId: "author-1" },
    });

    assert.deepEqual(calls.map((call) => call.options.method), ["GET", "PUT"]);
    assert.equal(calls[1].options.headers["x-contentful-version"], "7");
    assert.equal(new URL(calls[1].url).pathname, "/spaces/space-id/environments/staging/entries/article-1");
  });

  it("writes article fields to the configured locale and the Contentful default locale", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: {
        ...createEnv(),
        CONTENTFUL_DEFAULT_LOCALE: "pt-BR",
      },
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (url.toString().endsWith("/locales")) {
          return createResponse(200, {
            items: [
              { code: "en-US", default: true },
              { code: "pt-BR", default: false },
            ],
          });
        }

        if (options.method === "GET") {
          return createResponse(200, {
            sys: { id: "article-1", version: 7 },
            fields: {
              title: { "en-US": "Old title" },
              author: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "author-1" } } },
            },
          });
        }

        return createResponse(200, { sys: { id: "article-1", version: 8 } });
      },
    });

    await facade.updateArticleDraft({
      articleId: "article-1",
      data: {
        version: 7,
        title: "Título atualizado",
        slug: "titulo-atualizado",
        description: "Descrição atualizada",
        body: "Corpo atualizado",
        createAt: "2026-08-13",
        author: "author-1",
      },
      session: { authorEntryId: "author-1" },
    });

    const updateCall = calls.find((call) => call.options.method === "PUT");
    const body = JSON.parse(updateCall.options.body);

    assert.equal(
      calls.some((call) => new URL(call.url).pathname === "/spaces/space-id/environments/staging/locales"),
      true
    );
    assert.deepEqual(body.fields.title, {
      "en-US": "Título atualizado",
      "pt-BR": "Título atualizado",
    });
    assert.deepEqual(body.fields.author["en-US"], {
      sys: { type: "Link", linkType: "Entry", id: "author-1" },
    });
    assert.deepEqual(body.fields.author["pt-BR"], {
      sys: { type: "Link", linkType: "Entry", id: "author-1" },
    });
  });

  it("performs owner lifecycle operations with version headers", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(200, { sys: { id: "article-1", version: 11 } });
      },
    });

    await facade.publishArticle({ articleId: "article-1", data: { version: 10 } });
    await facade.unpublishArticle({ articleId: "article-1", data: { version: 11 } });
    await facade.archiveArticle({ articleId: "article-1", data: { version: 12 } });
    await facade.unarchiveArticle({ articleId: "article-1", data: { version: 13 } });
    await facade.deleteArticle({ articleId: "article-1", data: { version: 14 } });

    assert.equal(calls[0].options.method, "PUT");
    assert.equal(new URL(calls[0].url).pathname, "/spaces/space-id/environments/staging/entries/article-1/published");
    assert.equal(calls[0].options.headers["x-contentful-version"], "10");

    assert.equal(calls[1].options.method, "DELETE");
    assert.equal(new URL(calls[1].url).pathname, "/spaces/space-id/environments/staging/entries/article-1/published");
    assert.equal(calls[1].options.headers["x-contentful-version"], "11");

    assert.equal(calls[2].options.method, "GET");
    assert.equal(new URL(calls[2].url).pathname, "/spaces/space-id/environments/staging/entries/article-1");

    assert.equal(calls[3].options.method, "PUT");
    assert.equal(new URL(calls[3].url).pathname, "/spaces/space-id/environments/staging/entries/article-1/archived");
    assert.equal(calls[3].options.headers["x-contentful-version"], "12");

    assert.equal(calls[4].options.method, "DELETE");
    assert.equal(new URL(calls[4].url).pathname, "/spaces/space-id/environments/staging/entries/article-1/archived");
    assert.equal(calls[4].options.headers["x-contentful-version"], "13");

    assert.equal(calls[5].options.method, "DELETE");
    assert.equal(new URL(calls[5].url).pathname, "/spaces/space-id/environments/staging/entries/article-1");
    assert.equal(calls[5].options.headers["x-contentful-version"], "14");
  });

  it("closes the matching editorial request after publishing its reviewed article version", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: { ...createEnv(), CONTENTFUL_DEFAULT_LOCALE: "pt-BR" },
      now: () => "2026-08-20T15:30:00.000Z",
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        const pathname = new URL(url).pathname;

        if (pathname.endsWith("/entries/request-1") && options.method === "GET") {
          return createResponse(200, {
            sys: { id: "request-1", version: 4 },
            fields: {
              requestType: { "en-US": "publication" },
              status: { "en-US": "readyForReview" },
              article: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "article-1" } } },
              articleVersion: { "en-US": 7 },
              writerSubject: { "en-US": "writer-1" },
            },
          });
        }

        return createResponse(200, { sys: { id: "article-1", version: 8 } });
      },
    });

    await facade.publishArticle({
      articleId: "article-1",
      data: { version: 7, requestId: "request-1", requestVersion: 4 },
    });

    assert.equal(calls.length, 3);
    assert.equal(new URL(calls[0].url).pathname.endsWith("/entries/request-1"), true);
    assert.equal(new URL(calls[1].url).pathname.endsWith("/entries/article-1/published"), true);
    assert.equal(calls[2].options.method, "PUT");
    assert.equal(calls[2].options.headers["x-contentful-version"], "4");

    const closedRequest = JSON.parse(calls[2].options.body);
    assert.equal(closedRequest.fields.status["en-US"], "closed");
    assert.equal(closedRequest.fields.status["pt-BR"], undefined);
    assert.equal(closedRequest.fields.updatedAt["en-US"], "2026-08-20T15:30:00.000Z");
    assert.equal(closedRequest.fields.updatedAt["pt-BR"], undefined);
    assert.equal(closedRequest.fields.writerSubject["en-US"], "writer-1");
  });

  it("reports review cleanup as pending when the article published but closing the request failed", async () => {
    let callCount = 0;
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        callCount += 1;
        const pathname = new URL(url).pathname;

        if (pathname.endsWith("/entries/request-1") && options.method === "GET") {
          return createResponse(200, {
            sys: { id: "request-1", version: 4 },
            fields: {
              requestType: { "en-US": "publication" },
              status: { "en-US": "readyForReview" },
              article: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "article-1" } } },
              articleVersion: { "en-US": 7 },
            },
          });
        }

        if (pathname.endsWith("/entries/article-1/published")) {
          return createResponse(200, { sys: { id: "article-1", version: 8, publishedVersion: 7 } });
        }

        return createResponse(500, { message: "Cleanup unavailable" });
      },
    });

    const result = await facade.publishArticle({
      articleId: "article-1",
      data: { version: 7, requestId: "request-1", requestVersion: 4 },
    });

    assert.equal(callCount, 3);
    assert.equal(result.sys.publishedVersion, 7);
    assert.equal(result.editorialRequestClosurePending, true);
  });

  it("rejects editorial requests for another author's article", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(200, {
          sys: { id: "article-1", version: 7, contentType: { sys: { id: "article" } } },
          fields: { author: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "author-2" } } } },
        });
      },
    });

    await assert.rejects(
      () =>
        facade.submitArticleForReview({
          articleId: "article-1",
          data: { version: 7 },
          session: { subject: "writer-1", authorEntryId: "author-1" },
        }),
      /cannot edit this article/
    );
    assert.equal(calls.length, 1);
  });

  it("rejects stale and lifecycle-ineligible editorial requests before creating workflow entries", async () => {
    const scenarios = [
      { operation: "submitArticleForReview", sys: { version: 7 }, requestedVersion: 6, expected: ContentfulVersionConflictError },
      { operation: "submitArticleForReview", sys: { version: 7, publishedVersion: 6 }, requestedVersion: 7, expected: /not eligible/ },
      { operation: "requestUnpublication", sys: { version: 8, publishedVersion: 6 }, requestedVersion: 7, expected: ContentfulVersionConflictError },
      { operation: "requestUnpublication", sys: { version: 7 }, requestedVersion: 7, expected: /not eligible/ },
    ];

    for (const scenario of scenarios) {
      const calls = [];
      const facade = createContentfulManagementFacade({
        env: createEnv(),
        async fetchImpl(url, options) {
          calls.push({ url: url.toString(), options });
          return createResponse(200, {
            sys: { id: "article-1", contentType: { sys: { id: "article" } }, ...scenario.sys },
            fields: { author: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "author-1" } } } },
          });
        },
      });

      await assert.rejects(
        () =>
          facade[scenario.operation]({
            articleId: "article-1",
            data: { version: scenario.requestedVersion },
            session: { subject: "writer-1", authorEntryId: "author-1" },
          }),
        scenario.expected
      );
      assert.equal(calls.length, 1);
      assert.equal(calls.some((call) => call.options.method === "POST"), false);
    }
  });

  it("requires unpublication before archiving an article with unpublished changes", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(200, { sys: { id: "article-1", version: 7, publishedVersion: 5 } });
      },
    });

    await assert.rejects(
      () => facade.archiveArticle({ articleId: "article-1", data: { version: 7 } }),
      /Published articles must be unpublished before archiving/
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, "GET");
  });

  it("lists Contentful metadata tags for controlled admin selection", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(200, {
          items: [
            { name: "AI", sys: { id: "AI", visibility: "public" } },
            { sys: { id: "career", visibility: "public" } },
          ],
        });
      },
    });

    const result = await facade.listTags();

    assert.deepEqual(result, {
      tags: [
        { id: "AI", label: "AI", visibility: "public" },
        { id: "career", label: "career", visibility: "public" },
      ],
    });
    assert.equal(calls[0].options.method, "GET");
    assert.equal(new URL(calls[0].url).pathname, "/spaces/space-id/environments/staging/tags");
    assert.equal(new URL(calls[0].url).searchParams.get("limit"), "1000");
  });

  it("lists manageable tags with bounded article usage counts and excludes reserved language tags", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (url.toString().includes("/tags?")) {
          return createResponse(200, {
            total: 3,
            skip: 0,
            limit: 1000,
            items: [
              { name: "AI", sys: { id: "ai", visibility: "public" } },
              { name: "Career", sys: { id: "career", visibility: "public" } },
              { name: "Article language: Portuguese", sys: { id: "article-lang-pt-br", visibility: "public" } },
            ],
          });
        }

        return createResponse(200, {
          total: 4,
          skip: 0,
          limit: 1000,
          items: [
            { sys: { id: "published", contentType: { sys: { id: "article" } } }, metadata: { tags: [{ sys: { id: "ai" } }] } },
            { sys: { id: "draft", contentType: { sys: { id: "article" } } }, metadata: { tags: [{ sys: { id: "ai" } }] } },
            { sys: { id: "changed", contentType: { sys: { id: "article" } } }, metadata: { tags: [{ sys: { id: "career" } }] } },
            { sys: { id: "archived", contentType: { sys: { id: "article" } } }, metadata: { tags: [{ sys: { id: "article-lang-pt-br" } }] } },
          ],
        });
      },
    });

    const result = await facade.listManagedTags();

    assert.deepEqual(result, {
      tags: [
        { id: "ai", label: "AI", visibility: "public", articleCount: 2 },
        { id: "career", label: "Career", visibility: "public", articleCount: 1 },
      ],
    });
    const entriesUrl = new URL(calls[1].url);
    assert.equal(entriesUrl.searchParams.get("content_type"), "article");
    assert.equal(entriesUrl.searchParams.get("limit"), "1000");
    assert.equal(entriesUrl.searchParams.get("skip"), "0");
  });

  it("fails closed when the manageable tag collection is incomplete", async () => {
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url) {
        if (url.toString().includes("/tags?")) {
          return createResponse(200, {
            total: 2,
            skip: 0,
            limit: 1000,
            items: [{ name: "AI", sys: { id: "ai", visibility: "public" } }],
          });
        }

        return createResponse(200, { total: 0, skip: 0, limit: 1000, items: [] });
      },
    });

    await assert.rejects(() => facade.listManagedTags(), /Tag usage could not be verified/);
  });

  it("refuses to delete a tag when bounded revalidation finds any entry type", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(200, {
          total: 1,
          skip: 0,
          limit: 1,
          items: [{ sys: { id: "page-1", contentType: { sys: { id: "page" } } } }],
        });
      },
    });

    await assert.rejects(() => facade.deleteTag({ tagId: "ai" }), /Remove this tag from all content before deleting it/);
    assert.equal(calls.length, 1);
    assert.equal(new URL(calls[0].url).searchParams.get("metadata.tags.sys.id[all]"), "ai");
    assert.equal(new URL(calls[0].url).searchParams.has("content_type"), false);
  });

  it("refuses to delete a zero-article tag that is still assigned to an asset", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        const pathname = new URL(url).pathname;

        if (pathname.endsWith("/entries")) {
          return createResponse(200, { total: 0, skip: 0, limit: 1, items: [] });
        }

        return createResponse(200, { total: 1, skip: 0, limit: 1, items: [{ sys: { id: "asset-1" } }] });
      },
    });

    await assert.rejects(() => facade.deleteTag({ tagId: "ai" }), /Remove this tag from all content before deleting it/);
    assert.equal(calls.length, 2);
    assert.equal(new URL(calls[1].url).pathname.endsWith("/assets"), true);
  });

  it("fails closed when a tag reference check returns an incomplete page", async () => {
    let call = 0;
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl() {
        call += 1;
        if (call === 1) return createResponse(200, { total: 0, skip: 0, limit: 1, items: [] });
        if (call === 2) return createResponse(200, { total: 0, skip: 1, limit: 1, items: [] });
        if (call === 3) return createResponse(200, { name: "AI", sys: { id: "ai", version: 7, visibility: "public" } });
        return createResponse(204);
      },
    });

    await assert.rejects(() => facade.deleteTag({ tagId: "ai" }), /Tag usage could not be verified/);
    assert.equal(call, 2);
  });

  it("rejects coerced or inconsistent zero-use responses before deleting", async () => {
    for (const malformed of [
      { total: null, skip: null, limit: 1, items: [] },
      { total: "0", skip: "0", limit: 1, items: [] },
      { total: 0, skip: 0, limit: 1, items: [{ sys: { id: "unexpected" } }] },
    ]) {
      let call = 0;
      const facade = createContentfulManagementFacade({
        env: createEnv(),
        async fetchImpl() {
          call += 1;
          if (call === 1) return createResponse(200, malformed);
          if (call === 2) return createResponse(200, { total: 0, skip: 0, limit: 1, items: [] });
          if (call === 3) return createResponse(200, { name: "AI", sys: { id: "ai", version: 7, visibility: "public" } });
          return createResponse(204);
        },
      });

      await assert.rejects(() => facade.deleteTag({ tagId: "ai" }), /Tag usage could not be verified/);
      assert.equal(call, 1);
    }
  });

  it("deletes a zero-use tag with its current Contentful version", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (url.toString().includes("/entries?") || url.toString().includes("/assets?")) {
          return createResponse(200, { total: 0, skip: 0, limit: 1, items: [] });
        }

        if (options.method === "GET") {
          return createResponse(200, { name: "AI", sys: { id: "ai", version: 7, visibility: "public" } });
        }

        return createResponse(204);
      },
    });

    const result = await facade.deleteTag({ tagId: "ai" });

    assert.deepEqual(result, { deletedTagId: "ai" });
    assert.equal(calls[3].options.method, "DELETE");
    assert.equal(calls[3].options.headers["x-contentful-version"], 7);
  });

  it("sanitizes a provider conflict while deleting a zero-article tag", async () => {
    let call = 0;
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl() {
        call += 1;
        if (call <= 2) return createResponse(200, { total: 0, skip: 0, limit: 1, items: [] });
        if (call === 3) return createResponse(200, { name: "AI", sys: { id: "ai", version: 7, visibility: "public" } });
        return createResponse(400, { message: "Tag has links to private assets", sys: { id: "InvalidEntry" } });
      },
    });

    await assert.rejects(() => facade.deleteTag({ tagId: "ai" }), /Remove this tag from all content before deleting it/);
  });

  it("creates public Contentful metadata tags with normalized tag ids", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(201, {
          name: "Teste Kurumin",
          sys: { id: "teste-kurumin", visibility: "public" },
        });
      },
    });

    const result = await facade.createTag({ data: { name: "Teste Kurumin" } });

    assert.deepEqual(result, { tag: { id: "teste-kurumin", label: "Teste Kurumin", visibility: "public" } });
    assert.equal(calls[0].options.method, "PUT");
    assert.equal(new URL(calls[0].url).pathname, "/spaces/space-id/environments/staging/tags/teste-kurumin");
    assert.equal(calls[0].options.headers["x-contentful-tag-visibility"], "public");
    assert.deepEqual(JSON.parse(calls[0].options.body), {
      name: "Teste Kurumin",
      sys: {
        id: "teste-kurumin",
        type: "Tag",
        visibility: "public",
      },
    });
  });

  it("creates editorial workflow request entries for review and unpublication", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (url.toString().endsWith("/content_types/blogEditorialRequest")) {
          return createResponse(200, {
            fields: [{ id: "articleVersion", type: "Integer", localized: false }],
          });
        }

        if (url.toString().endsWith("/locales")) {
          return createResponse(200, {
            items: [
              { code: "en-US", default: true },
              { code: "pt-BR", default: false },
            ],
          });
        }

        if (url.toString().endsWith("/entries/article-1")) {
          return createResponse(200, {
            sys: { id: "article-1", version: 7, contentType: { sys: { id: "article" } } },
            fields: { author: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "author-1" } } } },
          });
        }

        if (url.toString().endsWith("/entries/article-2")) {
          return createResponse(200, {
            sys: { id: "article-2", version: 8, publishedVersion: 7, contentType: { sys: { id: "article" } } },
            fields: { author: { "en-US": { sys: { type: "Link", linkType: "Entry", id: "author-2" } } } },
          });
        }

        return createResponse(201, { sys: { id: `request-${calls.length}`, version: 1 } });
      },
      now: () => "2026-08-11T12:00:00.000Z",
    });

    await facade.submitArticleForReview({
      articleId: "article-1",
      session: { subject: "writer-1", name: "Guest Writer", authorEntryId: "author-1" },
      data: { version: 7 },
    });
    await facade.requestUnpublication({
      articleId: "article-2",
      session: { subject: "writer-2", name: "Owner Writer", authorEntryId: "author-2" },
      data: { version: 8 },
    });

    assert.equal(calls.length, 8);
    assert.equal(calls[3].options.headers["x-contentful-content-type"], "blogEditorialRequest");
    assert.equal(calls[7].options.headers["x-contentful-content-type"], "blogEditorialRequest");

    const reviewBody = JSON.parse(calls[3].options.body);
    assert.equal(reviewBody.fields.requestType["en-US"], "publication");
    assert.equal(reviewBody.fields.status["en-US"], "readyForReview");
    assert.deepEqual(reviewBody.fields.article["en-US"], {
      sys: { type: "Link", linkType: "Entry", id: "article-1" },
    });
    assert.equal(reviewBody.fields.writerSubject["en-US"], "writer-1");
    assert.equal(reviewBody.fields.writerName["en-US"], "Guest Writer");
    assert.equal(reviewBody.fields.articleVersion["en-US"], 7);
    assert.equal(reviewBody.fields.createdAt["en-US"], "2026-08-11T12:00:00.000Z");
    assert.equal(reviewBody.fields.updatedAt["en-US"], "2026-08-11T12:00:00.000Z");

    const unpublicationBody = JSON.parse(calls[7].options.body);
    assert.equal(unpublicationBody.fields.requestType["en-US"], "unpublication");
    assert.equal(unpublicationBody.fields.status["en-US"], "readyForReview");
    assert.deepEqual(unpublicationBody.fields.article["en-US"], {
      sys: { type: "Link", linkType: "Entry", id: "article-2" },
    });
    assert.equal(unpublicationBody.fields.writerSubject["en-US"], "writer-2");
    assert.equal(unpublicationBody.fields.writerName["en-US"], "Owner Writer");
    assert.equal(unpublicationBody.fields.articleVersion["en-US"], 8);
  });

  it("rejects missing management configuration before calling Contentful", async () => {
    let called = false;
    const facade = createContentfulManagementFacade({
      env: {},
      async fetchImpl() {
        called = true;
      },
    });

    await assert.rejects(
      () => facade.createArticleDraft({ data: { title: "Draft" } }),
      ContentfulAdminConfigurationError
    );
    assert.equal(called, false);
  });

  it("rejects update requests without a version before calling Contentful", async () => {
    let called = false;
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl() {
        called = true;
      },
    });

    await assert.rejects(
      () => facade.updateArticleDraft({ articleId: "article-1", data: { fields: {} } }),
      ContentfulVersionConflictError
    );
    assert.equal(called, false);
  });

  it("maps upstream version conflicts to a safe conflict error", async () => {
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl() {
        return createResponse(409, { message: "Version mismatch with secret-token" });
      },
    });

    await assert.rejects(
      () => facade.publishArticle({ articleId: "article-1", data: { version: 4 } }),
      ContentfulVersionConflictError
    );
  });

  it("maps upstream management failures with malformed diagnostics to a safe request error", async () => {
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl() {
        return {
          ok: false,
          status: 502,
          async json() {
            throw new Error("CONTENTFUL_MANAGEMENT_KEY=management-key raw upstream body");
          },
        };
      },
    });

    await assert.rejects(
      () => facade.updateArticleDraft({ articleId: "article-1", data: { version: 8, title: "Updated" } }),
      (error) => {
        assert.ok(error instanceof ContentfulManagementRequestError);
        assert.equal(error.publicError, "Admin request failed");
        assert.doesNotMatch(error.message, /CONTENTFUL_MANAGEMENT_KEY|management-key|raw upstream body/i);
        return true;
      }
    );
  });

  it("returns an empty safe payload for malformed successful management responses", async () => {
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl() {
        return {
          ok: true,
          status: 201,
          async json() {
            throw new Error("malformed upstream JSON");
          },
        };
      },
    });

    const result = await facade.createArticleDraft({
      data: { title: "Draft" },
      session: { subject: "writer-123", authorEntryId: "author-1" },
    });

    assert.deepEqual(result, {});
  });
});
