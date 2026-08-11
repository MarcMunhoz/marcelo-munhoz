import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  adminUserMessage,
  AdminApiError,
  archiveArticle,
  createArticleDraft,
  deleteArticle,
  listAdminArticles,
  publishArticle,
  requestArticleUnpublication,
  submitArticleForReview,
  unpublishArticle,
  updateArticleDraft,
} from "../src/utils/adminApi.js";
import {
  applyArticleResponseToForm,
  articleToForm,
  buildArticlePayload,
  canConfirmArticleDeletion,
  canPrepareReviewAction,
  canRequestUnpublicationAction,
  filterAdminArticles,
  ownerReviewQueues,
  removeArticleById,
  reconcileAdminDashboardData,
  summarizeArticleStatuses,
  updateArticleStatusById,
} from "../src/utils/adminDashboard.js";
import { articleCardImageUrl, articleHeroImageUrl } from "../src/utils/contentfulImages.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("admin frontend writer workflow", () => {
  it("registers protected admin routes for writer drafting", () => {
    const routes = read("../src/router/routes.js");

    assert.match(routes, /path:\s*"\/admin"/);
    assert.match(routes, /name:\s*"Admin"/);
    assert.match(routes, /requiresAdmin:\s*true/);
    assert.match(routes, /pages\/Admin\.vue/);
  });

  it("adds admin navigation beside the public blog navigation", () => {
    const layout = read("../src/layouts/MainLayout.vue");

    assert.match(layout, /to="\/admin"/);
    assert.match(layout, /label="Admin"/);
  });

  it("provides writer session helpers without adding an auth package", () => {
    const auth = read("../src/utils/adminAuth.js");

    assert.match(auth, /netlifyIdentity/);
    assert.match(auth, /getAdminSession/);
    assert.match(auth, /isWriterSession/);
    assert.match(auth, /isOwnerSession/);
  });

  it("provides admin API helpers for draft and workflow requests", () => {
    const api = read("../src/utils/adminApi.js");

    assert.match(api, /\/api\/admin\/contentful\/articles/);
    assert.match(api, /\/media\/assets/);
    assert.match(api, /\/media\/upload/);
    assert.match(api, /createArticleDraft/);
    assert.match(api, /updateArticleDraft/);
    assert.match(api, /submitArticleForReview/);
    assert.match(api, /requestArticleUnpublication/);
    assert.match(api, /publishArticle/);
    assert.match(api, /unpublishArticle/);
    assert.match(api, /archiveArticle/);
    assert.match(api, /deleteArticle/);
    assert.match(api, /listMediaAssets/);
    assert.match(api, /uploadMediaAsset/);
    assert.match(api, /Authorization/);
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

    await publishArticle({ articleId: "article-1", version: 7, session, fetchImpl });
    await unpublishArticle({ articleId: "article-1", version: 8, session, fetchImpl });
    await archiveArticle({ articleId: "article-1", version: 9, session, fetchImpl });
    await deleteArticle({ articleId: "article-1", version: 10, session, fetchImpl });

    assert.deepEqual(
      calls.map((call) => [call.url, call.options.method, JSON.parse(call.options.body)]),
      [
        ["/api/admin/contentful/articles/article-1/publish", "POST", { version: 7 }],
        ["/api/admin/contentful/articles/article-1/unpublish", "POST", { version: 8 }],
        ["/api/admin/contentful/articles/article-1/archive", "POST", { version: 9 }],
        ["/api/admin/contentful/articles/article-1", "DELETE", { version: 10 }],
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

  it("normalizes empty admin dashboard responses into stable frontend state", () => {
    assert.deepEqual(reconcileAdminDashboardData({}), {
      articles: [],
      summary: { published: 0, drafts: 0, review: 0, archived: 0, total: 0 },
      reviewRequests: [],
    });
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

  it("summarizes article status counts for the dashboard", () => {
    const summary = summarizeArticleStatuses([
      { status: "published" },
      { status: "draft" },
      { status: "unpublished" },
      { status: "review" },
      { status: "review" },
      { status: "archived" },
    ]);

    assert.deepEqual(summary, {
      published: 1,
      drafts: 2,
      review: 2,
      archived: 1,
      total: 6,
    });
  });

  it("filters article table rows by search, status, tag, date, and author", () => {
    const rows = [
      { title: "Admin area", status: "draft", tags: ["vue", "cms"], createAt: "2026-08-11", author: "Marcelo" },
      { title: "Public blog", status: "published", tags: ["contentful"], createAt: "2026-08-10", author: "Guest" },
      { title: "Cloudinary upload", status: "review", tags: ["media"], createAt: "2026-08-11", author: "Marcelo" },
    ];

    const filtered = filterAdminArticles(rows, {
      search: "admin",
      status: "draft",
      tag: "cms",
      date: "2026-08-11",
      author: "Marcelo",
    });

    assert.deepEqual(filtered, [rows[0]]);
  });

  it("builds owner review queues for publication and unpublication requests", () => {
    const queues = ownerReviewQueues([
      { id: "review-1", title: "Ready article", status: "review", version: 4 },
      { id: "take-down-1", title: "Published article", status: "unpublicationRequested", version: 9 },
      { id: "draft-1", title: "Draft article", status: "draft", version: 2 },
    ]);

    assert.deepEqual(queues, {
      submissions: [{ id: "review-1", title: "Ready article", status: "review", version: 4 }],
      unpublicationRequests: [{ id: "take-down-1", title: "Published article", status: "unpublicationRequested", version: 9 }],
    });
  });

  it("builds article payloads with real Contentful fields and hidden version state", () => {
    const payload = buildArticlePayload({
      title: "  New Admin  ",
      slug: "new-admin",
      description: "  Dashboard work  ",
      body: "# Body",
      createAt: "2026-08-11",
      thumbnail: { public_id: "marcelo-munhoz-website/image", secure_url: "https://example.test/image.jpg" },
      alt: "Admin screenshot",
      author: "authorEntry",
      tags: "admin, contentful",
      version: 7,
      reviewNotes: "do not send",
    });

    assert.deepEqual(payload, {
      title: "New Admin",
      slug: "new-admin",
      description: "Dashboard work",
      body: "# Body",
      createAt: "2026-08-11",
      thumbnail: { public_id: "marcelo-munhoz-website/image", secure_url: "https://example.test/image.jpg" },
      alt: "Admin screenshot",
      author: "authorEntry",
      tags: ["admin", "contentful"],
      version: 7,
    });
  });

  it("hydrates writer edit forms from existing articles without exposing review notes", () => {
    const form = articleToForm({
      id: "article-1",
      title: "Existing article",
      slug: "existing-article",
      description: "Existing description",
      body: "# Body",
      createAt: "2026-08-11",
      thumbnail: {
        public_id: "marcelo-munhoz-website/existing",
        secure_url: "https://example.test/existing.jpg",
      },
      alt: "Existing image",
      authorEntryId: "author-1",
      tags: ["admin", "review"],
      version: 12,
      reviewNotes: "owner-only note",
    });

    assert.deepEqual(form, {
      id: "article-1",
      title: "Existing article",
      slug: "existing-article",
      description: "Existing description",
      body: "# Body",
      createAt: "2026-08-11",
      thumbnailPublicId: "marcelo-munhoz-website/existing",
      thumbnailUrl: "https://example.test/existing.jpg",
      alt: "Existing image",
      author: "author-1",
      tags: "admin, review",
      version: 12,
    });
  });

  it("stores returned Contentful id and version after a successful draft save", () => {
    const form = { id: "", version: null, title: "Draft" };

    assert.deepEqual(
      applyArticleResponseToForm(form, {
        sys: { id: "article-1", version: 3 },
      }),
      { id: "article-1", version: 3, title: "Draft" }
    );
    assert.deepEqual(
      applyArticleResponseToForm(form, {
        draft: { sys: { id: "article-2", version: 4 } },
      }),
      { id: "article-2", version: 4, title: "Draft" }
    );
  });

  it("updates owner lifecycle article state without changing unrelated rows", () => {
    const rows = [
      { id: "article-1", status: "review" },
      { id: "article-2", status: "published" },
    ];

    assert.deepEqual(updateArticleStatusById(rows, "article-1", "published"), [
      { id: "article-1", status: "published" },
      { id: "article-2", status: "published" },
    ]);
    assert.deepEqual(removeArticleById(rows, "article-2"), [{ id: "article-1", status: "review" }]);
  });

  it("requires an exact article title before confirming permanent deletion", () => {
    const article = { id: "article-1", title: "Permanent Delete Target" };

    assert.equal(canConfirmArticleDeletion(article, "Permanent Delete Target"), true);
    assert.equal(canConfirmArticleDeletion(article, " permanent delete target "), false);
    assert.equal(canConfirmArticleDeletion(article, "Other article"), false);
    assert.equal(canConfirmArticleDeletion(null, "Permanent Delete Target"), false);
  });

  it("shows row lifecycle actions only for article states supported by backend routes", () => {
    assert.equal(canPrepareReviewAction({ id: "draft-1", status: "draft" }), true);
    assert.equal(canPrepareReviewAction({ id: "published-1", status: "published" }), false);
    assert.equal(canPrepareReviewAction({ id: "", status: "draft" }), false);

    assert.equal(canRequestUnpublicationAction({ id: "published-1", status: "published" }), true);
    assert.equal(canRequestUnpublicationAction({ id: "draft-1", status: "draft" }), false);
    assert.equal(canRequestUnpublicationAction({ id: "review-1", status: "review" }), false);
  });

  it("resolves Contentful thumbnail images with legacy Cloudinary fallback", () => {
    assert.equal(
      articleCardImageUrl({ thumbnail: { public_id: "marcelo-munhoz-website/new-image" } }),
      "https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/marcelo-munhoz-website/new-image"
    );
    assert.equal(
      articleHeroImageUrl({ thumbnail: { secure_url: "http://example.test/new-image.jpg" } }),
      "https://example.test/new-image.jpg"
    );
    assert.equal(
      articleCardImageUrl({ cloudinary: [{ public_id: "marcelo-munhoz-website/old-image" }] }),
      "https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/marcelo-munhoz-website/old-image"
    );
    assert.equal(
      articleHeroImageUrl({ cloudinary: [{ url: "http://example.test/old-image.jpg" }] }),
      "https://example.test/old-image.jpg"
    );
  });

  it("renders the dashboard-first shell, article table, editor fields, and workflow controls", () => {
    const page = read("../src/pages/Admin.vue");

    for (const text of ["Editorial dashboard", "Published", "Drafts", "In review", "Article queue", "Owner review", "Media library", "Page views pending"]) {
      assert.match(page, new RegExp(text));
    }

    for (const field of ["title", "slug", "description", "body", "createAt", "thumbnailPublicId", "thumbnailUrl", "alt", "author", "tags"]) {
      assert.match(page, new RegExp(`v-model="articleForm\\.${field}"`));
    }

    assert.doesNotMatch(page, /v-model="articleForm\.version"/);
    assert.doesNotMatch(page, /v-model="articleForm\.notes"/);
    assert.doesNotMatch(page, /Review notes/);
    assert.match(page, /Save draft/);
    assert.match(page, /Submit for review/);
    assert.match(page, /Request unpublication/);
    assert.match(page, /Publish/);
    assert.match(page, /Unpublish/);
    assert.match(page, /Archive/);
    assert.match(page, /Delete permanently/);
    assert.match(page, /confirmPermanentDeletion/);
    assert.match(page, /v-if="isOwner"/);
    assert.match(page, /isOwnerSession\(this\.session\)/);
    assert.match(page, /Select image/);
    assert.match(page, /Upload image/);
    assert.match(page, /applySelectedMedia/);
    assert.match(page, /handleMediaFile/);
    assert.match(page, /admin-sidebar/);
    assert.match(page, /article-table/);
    assert.doesNotMatch(page, /label="Media" disable/);
    assert.doesNotMatch(page, /label="Settings" disable/);
    assert.match(page, /loadArticleDashboard/);
    assert.doesNotMatch(page, /this\.articles = sampleAdminArticles/);
  });

  it("keeps admin layout responsive without relying on a horizontally oversized table shell", () => {
    const page = read("../src/pages/Admin.vue");

    assert.match(page, /\.admin-workspace[\s\S]*min-width:\s*0/);
    assert.match(page, /\.admin-topbar[\s\S]*flex-wrap:\s*wrap/);
    assert.match(page, /\.status-grid[\s\S]*auto-fit/);
    assert.match(page, /\.admin-main-grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    assert.match(page, /@media \(max-width:\s*900px\)/);
    assert.match(page, /\.article-table[\s\S]*overflow-x:\s*auto/);
  });

  it("handles save, validation, authorization, media, and conflict states in the writer UI", () => {
    const page = read("../src/pages/Admin.vue");

    assert.match(page, /validateArticleForm/);
    assert.match(page, /adminUserMessage\(error\)/);
    assert.match(page, /adminUserMessage\(error, \{ media: true \}\)/);
    assert.doesNotMatch(page, /showFeedback\(error\.message/);
    assert.doesNotMatch(page, /mediaError = error\.message/);
    assert.match(page, /Draft saved/);
  });

  it("maps backend admin error payloads to fixed user-safe frontend messages", () => {
    assert.equal(
      adminUserMessage(new AdminApiError(500, { error: "CONTENTFUL_MANAGEMENT_KEY=cfmgmt_sanitized_secret_123 upstream failed" })),
      "The admin request could not be completed."
    );
    assert.equal(
      adminUserMessage(new AdminApiError(502, { error: "Cloudinary API returned api-secret from raw diagnostics" }), { media: true }),
      "Media request failed."
    );
    assert.equal(adminUserMessage(new AdminApiError(401, { error: "raw" })), "Sign in again before saving.");
    assert.equal(adminUserMessage(new AdminApiError(403, { error: "raw" })), "Your account cannot perform this action.");
    assert.equal(adminUserMessage(new AdminApiError(409, { error: "raw" })), "This article changed elsewhere. Reload before saving.");
  });
});
