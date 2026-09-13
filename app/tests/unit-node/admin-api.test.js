import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  archiveArticle,
  createArticleDraft,
  createContentfulTag,
  deleteArticle,
  deleteContentfulTag,
  getAuthorProfile,
  getMediaEditorConfig,
  listAdminArticles,
  listContentfulTags,
  listManagedContentfulTags,
  publishArticle,
  requestArticleUnpublication,
  submitArticleForReview,
  unarchiveArticle,
  unpublishArticle,
  updateArticleDraft,
  updateAuthorProfile,
} from "../../src/utils/adminApi.js";

describe("admin API facade", () => {
  it("loads existing Contentful tags for controlled article tag selection", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { tags: [{ id: "AI", label: "AI" }] };
        },
      };
    };

    const result = await listContentfulTags({ session: { token: "writer-token" }, fetchImpl });

    assert.deepEqual(result, { tags: [{ id: "AI", label: "AI" }] });
    assert.equal(calls[0].url, "/api/admin/contentful/tags");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.headers.Authorization, "Bearer writer-token");
  });

  it("creates new public Contentful tags before selecting them in the editor", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { tag: { id: "teste-kurumin", label: "Teste Kurumin", visibility: "public" } };
        },
      };
    };

    const result = await createContentfulTag({ name: "Teste Kurumin", session: { token: "writer-token" }, fetchImpl });

    assert.deepEqual(result, { tag: { id: "teste-kurumin", label: "Teste Kurumin", visibility: "public" } });
    assert.equal(calls[0].url, "/api/admin/contentful/tags");
    assert.equal(calls[0].options.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].options.body), { name: "Teste Kurumin" });
  });

  it("lists managed tags and deletes an unused tag through owner endpoints", async () => {
    const calls = [];
    const responses = [
      { tags: [{ id: "ai", label: "AI", visibility: "public", articleCount: 0 }] },
      { deletedTagId: "ai" },
    ];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return responses.shift();
        },
      };
    };
    const session = { token: "owner-token" };

    const listed = await listManagedContentfulTags({ session, fetchImpl });
    const deleted = await deleteContentfulTag({ tagId: "ai", session, fetchImpl });

    assert.equal(listed.tags[0].articleCount, 0);
    assert.deepEqual(deleted, { deletedTagId: "ai" });
    assert.equal(calls[0].url, "/api/admin/contentful/tags/manage");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[1].url, "/api/admin/contentful/tags/ai/delete");
    assert.equal(calls[1].options.method, "POST");
  });

  it("calls owner lifecycle endpoints with version state and server authorization", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true };
        },
      };
    };
    const session = { token: "owner-token" };

    await publishArticle({ articleId: "article-1", version: 7, requestId: "request-1", requestVersion: 3, session, fetchImpl });
    await unpublishArticle({ articleId: "article-1", version: 8, session, fetchImpl });
    await archiveArticle({ articleId: "article-1", version: 9, session, fetchImpl });
    await unarchiveArticle({ articleId: "article-1", version: 10, session, fetchImpl });
    await deleteArticle({ articleId: "article-1", version: 11, session, fetchImpl });

    assert.deepEqual(
      calls.map((call) => [call.url, call.options.method, JSON.parse(call.options.body)]),
      [
        ["/api/admin/contentful/articles/article-1/publish", "POST", { version: 7, requestId: "request-1", requestVersion: 3 }],
        ["/api/admin/contentful/articles/article-1/unpublish", "POST", { version: 8 }],
        ["/api/admin/contentful/articles/article-1/archive", "POST", { version: 9 }],
        ["/api/admin/contentful/articles/article-1/unarchive", "POST", { version: 10 }],
        ["/api/admin/contentful/articles/article-1", "DELETE", { version: 11 }],
      ]
    );
    assert.equal(calls[0].options.headers.Authorization, "Bearer owner-token");
  });

  it("calls writer draft and review endpoints with article payloads and hidden version state", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true };
        },
      };
    };
    const session = { token: "writer-token" };

    await createArticleDraft({ article: { title: "Draft" }, session, fetchImpl });
    await updateArticleDraft({ articleId: "article-1", article: { title: "Updated", version: 4 }, session, fetchImpl });
    await submitArticleForReview({ articleId: "article-1", version: 5, notes: "", session, fetchImpl });
    await requestArticleUnpublication({ articleId: "article-1", version: 6, notes: "", session, fetchImpl });

    assert.deepEqual(
      calls.map((call) => [call.url, call.options.method, JSON.parse(call.options.body)]),
      [
        ["/api/admin/contentful/articles", "POST", { title: "Draft" }],
        ["/api/admin/contentful/articles/article-1", "PUT", { title: "Updated", version: 4 }],
        ["/api/admin/contentful/articles/article-1/submit", "POST", { version: 5, notes: "" }],
        ["/api/admin/contentful/articles/article-1/unpublication-requests", "POST", { version: 6, notes: "" }],
      ]
    );
    assert.equal(calls[0].options.headers.Authorization, "Bearer writer-token");
  });

  it("loads Cloudinary Media Editor public configuration without write credentials", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { mediaEditor: { cloudName: "demo-cloud" } };
        },
      };
    };

    const response = await getMediaEditorConfig({
      session: { token: "jwt-token", roles: ["writer"] },
      fetchImpl,
    });

    assert.deepEqual(response, { mediaEditor: { cloudName: "demo-cloud" } });
    assert.equal(calls[0].url, "/api/admin/contentful/media/editor-config");
    assert.equal(calls[0].options.headers.Authorization, "Bearer jwt-token");
    assert.doesNotMatch(JSON.stringify(response), /api.?key|secret/i);
  });

  it("calls author profile endpoints without using Netlify Identity fields as profile payload", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { profile: { id: "author-1", name: "Marcelo Munhoz" } };
        },
      };
    };
    const session = { token: "writer-token" };

    await getAuthorProfile({ session, fetchImpl });
    await updateAuthorProfile({ profile: { name: "Marcelo Munhoz", slug: "marcelo-munhoz", version: 7 }, session, fetchImpl });

    assert.deepEqual(
      calls.map((call) => [call.url, call.options.method, call.options.body ? JSON.parse(call.options.body) : undefined]),
      [
        ["/api/admin/contentful/author-profile", "GET", undefined],
        ["/api/admin/contentful/author-profile", "PUT", { name: "Marcelo Munhoz", slug: "marcelo-munhoz", version: 7 }],
      ]
    );
    assert.equal(calls[0].options.headers.Authorization, "Bearer writer-token");
  });

  it("loads admin articles from the server-side admin read route", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            articles: [
              {
                id: "article-1",
                title: "Loaded article",
                status: "published",
                tags: ["contentful"],
                createAt: "2026-08-11",
                author: "Marcelo Munhoz",
                version: 4,
              },
            ],
            summary: { published: 1, drafts: 0, review: 0, archived: 0, total: 1 },
            reviewRequests: [],
          };
        },
      };
    };

    const dashboard = await listAdminArticles({ session: { token: "writer-token" }, fetchImpl });

    assert.deepEqual(dashboard.articles, [
      {
        id: "article-1",
        title: "Loaded article",
        status: "published",
        tags: ["contentful"],
        createAt: "2026-08-11",
        author: "Marcelo Munhoz",
        version: 4,
      },
    ]);
    assert.equal(calls[0].url, "/api/admin/contentful/articles");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.headers.Authorization, "Bearer writer-token");
  });

  it("sends a development-only preview role header instead of bearer auth for local preview sessions", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { ok: true };
        },
      };
    };

    await createArticleDraft({
      article: { title: "Owner preview draft" },
      session: { preview: true, roles: ["owner"] },
      fetchImpl,
    });

    assert.equal(calls[0].options.headers["x-admin-preview-role"], "owner");
    assert.equal(calls[0].options.headers.Authorization, undefined);
  });

});

