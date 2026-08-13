import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  adminUserMessage,
  AdminApiError,
  archiveArticle,
  getMediaEditorConfig,
  getAuthorProfile,
  createArticleDraft,
  deleteArticle,
  listAdminArticles,
  publishArticle,
  requestArticleUnpublication,
  submitArticleForReview,
  unpublishArticle,
  updateAuthorProfile,
  updateArticleDraft,
} from "../src/utils/adminApi.js";
import {
  applyArticleResponseToForm,
  articleToForm,
  authorProfileToForm,
  buildAuthorProfilePayload,
  buildArticlePayload,
  canArchiveArticleAction,
  canConfirmArticleDeletion,
  canEditArticleAction,
  canOwnerPublishAction,
  canOwnerUnpublishAction,
  canPrepareReviewAction,
  canRequestUnpublicationAction,
  createEmptyArticleForm,
  createEmptyAuthorProfileForm,
  filterAdminArticles,
  mediaLibraryState,
  normalizeAdminArticleDisplay,
  normalizeMediaAssetDisplay,
  ownerReviewQueues,
  removeArticleById,
  reconcileAdminDashboardData,
  slugFromTitle,
  summarizeArticleStatuses,
  updateArticleStatusById,
} from "../src/utils/adminDashboard.js";
import { buildMediaEditorOptions, normalizeMediaEditorExport, openCloudinaryMediaEditor } from "../src/utils/cloudinaryMediaEditor.js";
import { articleCardImageUrl, articleHeroImageUrl } from "../src/utils/contentfulImages.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("admin frontend writer workflow", () => {
  it("registers protected admin routes for writer drafting", () => {
    const routes = read("../src/router/routes.js");

    assert.match(routes, /path:\s*"\/admin"/);
    assert.match(routes, /name:\s*"Admin"/);
    assert.match(routes, /path:\s*"\/admin\/articles\/new"/);
    assert.match(routes, /path:\s*"\/admin\/articles\/:entryId\/edit"/);
    assert.match(routes, /requiresAdmin:\s*true/);
    assert.match(routes, /pages\/Admin\.vue/);
    assert.match(routes, /pages\/AdminArticleEditor\.vue/);
  });

  it("adds admin navigation beside the public blog navigation", () => {
    const layout = read("../src/layouts/MainLayout.vue");

    assert.match(layout, /to="\/admin"/);
    assert.match(layout, /to="\/admin\/profile"/);
    assert.match(layout, /adminNavLabel/);
    assert.match(layout, /adminInitials/);
    assert.match(layout, /admin-account-menu/);
    assert.match(layout, /q-btn-dropdown/);
  });

  it("provides writer session helpers without adding an auth package", () => {
    const auth = read("../src/utils/adminAuth.js");

    assert.match(auth, /netlifyIdentity/);
    assert.match(auth, /getAdminSession/);
    assert.match(auth, /isWriterSession/);
    assert.match(auth, /isOwnerSession/);
  });

  it("redirects signed-out production visitors to Netlify Identity login", () => {
    const page = read("../src/pages/Admin.vue");

    assert.match(page, /v-if="showAdminSurface"/);
    assert.match(page, /loginRedirecting:\s*false/);
    assert.match(page, /sessionResolved:\s*false/);
    assert.match(page, /showAdminSurface\(\)/);
    assert.match(page, /redirectToLoginIfSignedOut/);
    assert.match(page, /if\s*\(!this\.session\)\s*{/);
    assert.match(page, /this\.loginRedirecting\s*=\s*true/);
    assert.match(page, /this\.openLogin\(\)/);
  });

  it("closes the Netlify Identity modal and reloads admin data after login", () => {
    const page = read("../src/pages/Admin.vue");

    assert.match(page, /bindIdentityCallbacks/);
    assert.match(page, /identity\.on\("login"/);
    assert.match(page, /identity\.close\(\)/);
    assert.match(page, /this\.loginRedirecting\s*=\s*false/);
    assert.match(page, /this\.session\s*=\s*await getAdminSession\(\)/);
    assert.match(page, /this\.loadArticleDashboard\(\)/);
  });

  it("loads the Netlify Identity widget and allows it through CSP", () => {
    const index = read("../index.html");
    const netlifyConfig = read("../../app/netlify.toml");

    assert.match(index, /identity\.netlify\.com\/v1\/netlify-identity-widget\.js/);
    assert.match(netlifyConfig, /script-src[^"]*https:\/\/identity\.netlify\.com/);
    assert.match(netlifyConfig, /script-src[^"]*https:\/\/media-editor\.cloudinary\.com/);
    assert.match(netlifyConfig, /connect-src[^"]*https:\/\/identity\.netlify\.com/);
    assert.match(netlifyConfig, /frame-src[^"]*https:\/\/media-editor\.cloudinary\.com/);
  });

  it("provides admin API helpers for draft and workflow requests", () => {
    const api = read("../src/utils/adminApi.js");

    assert.match(api, /\/api\/admin\/contentful\/articles/);
    assert.match(api, /\/media\/assets/);
    assert.match(api, /\/media\/upload/);
    assert.match(api, /\/media\/editor-config/);
    assert.match(api, /\/author-profile/);
    assert.match(api, /createArticleDraft/);
    assert.match(api, /updateArticleDraft/);
    assert.match(api, /getAuthorProfile/);
    assert.match(api, /updateAuthorProfile/);
    assert.match(api, /submitArticleForReview/);
    assert.match(api, /requestArticleUnpublication/);
    assert.match(api, /publishArticle/);
    assert.match(api, /unpublishArticle/);
    assert.match(api, /archiveArticle/);
    assert.match(api, /deleteArticle/);
    assert.match(api, /listMediaAssets/);
    assert.match(api, /getMediaEditorConfig/);
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

  it("normalizes empty admin dashboard responses into stable frontend state", () => {
    assert.deepEqual(reconcileAdminDashboardData({}), {
      articles: [],
      summary: { published: 0, drafts: 0, review: 0, archived: 0, total: 0 },
      reviewRequests: [],
    });
  });

  it("formats admin article dates for editorial display", () => {
    assert.equal(normalizeAdminArticleDisplay({ createAt: "2026-07-25T14:38:24.390Z" }).displayDate, "July 25, 2026");
    assert.equal(normalizeAdminArticleDisplay({ createAt: "2026-08-11" }).displayDate, "August 11, 2026");
    assert.equal(normalizeAdminArticleDisplay({ createAt: "" }).displayDate, "No date");
  });

  it("resolves admin author display without exposing entry ids as primary values", () => {
    assert.equal(
      normalizeAdminArticleDisplay({
        author: "Marcelo Munhoz",
        authorEntryId: "cvs0Tg41EntryId",
      }).displayAuthor,
      "Marcelo Munhoz"
    );
    assert.equal(
      normalizeAdminArticleDisplay({
        author: "cvs0Tg41EntryId",
        authorEntryId: "cvs0Tg41EntryId",
      }).displayAuthor,
      "Unknown author"
    );
    assert.equal(normalizeAdminArticleDisplay({ authorEntryId: "cvs0Tg41EntryId" }).displayAuthor, "Unknown author");
  });

  it("builds structured admin tag display and thumbnail preview metadata", () => {
    const article = normalizeAdminArticleDisplay({
      tags: ["admin", "contentful"],
      thumbnail: {
        public_id: "marcelo-munhoz-website/admin",
        secure_url: "https://example.test/admin.jpg",
      },
    });

    assert.deepEqual(article.displayTags, [
      { id: "admin", label: "admin" },
      { id: "contentful", label: "contentful" },
    ]);
    assert.equal(article.thumbnailPreviewUrl, "https://example.test/admin.jpg");
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

  it("builds article payloads with hidden technical author, thumbnail, tag, and version state", () => {
    const payload = buildArticlePayload({
      title: "  New Admin  ",
      slug: "new-admin",
      description: "  Dashboard work  ",
      body: "# Body",
      createAt: "2026-08-11",
      thumbnail: { public_id: "marcelo-munhoz-website/image", secure_url: "https://example.test/image.jpg" },
      alt: "Admin screenshot",
      authorName: "Marcelo Munhoz",
      authorEntryId: "authorEntry",
      tagList: ["admin", "contentful"],
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

  it("derives URL-safe slugs from new article titles", () => {
    assert.equal(slugFromTitle("Inteligência Artificial para developers e creators"), "inteligencia-artificial-para-developers-e-creators");
    assert.equal(slugFromTitle("  Vue, Contentful & Cloudinary!  "), "vue-contentful-cloudinary");
  });

  it("auto-fills new article slugs from title input until the slug is edited", () => {
    const page = read("../src/pages/AdminArticleEditor.vue");

    assert.match(page, /@update:model-value="updateArticleTitle"/);
    assert.match(page, /@update:model-value="markSlugTouched"/);
    assert.match(page, /this\.articleForm\.slug\s*=\s*slugFromTitle\(value\)/);
  });

  it("creates new article forms with focused-editor display fields and internal technical state", () => {
    const form = createEmptyArticleForm();

    assert.equal(form.authorName, "");
    assert.equal(form.authorEntryId, "");
    assert.equal(form.thumbnailPublicId, "");
    assert.equal(form.thumbnailUrl, "");
    assert.deepEqual(form.tagList, []);
    assert.equal(form.tagInput, "");
    assert.equal(form.version, null);
  });

  it("normalizes author profile forms with optional photo fallback", () => {
    assert.deepEqual(createEmptyAuthorProfileForm(), {
      id: "",
      name: "",
      slug: "",
      biography: "",
      photoUrl: "",
      photoPublicId: "",
      version: null,
    });
    assert.deepEqual(
      authorProfileToForm({
        id: "author-1",
        name: "Marcelo Munhoz",
        slug: "marcelo-munhoz",
        biography: "But first...",
        photo: { public_id: "authors/marcelo", secure_url: "https://example.test/marcelo.jpg" },
        version: 11,
      }),
      {
        id: "author-1",
        name: "Marcelo Munhoz",
        slug: "marcelo-munhoz",
        biography: "But first...",
        photoUrl: "https://example.test/marcelo.jpg",
        photoPublicId: "authors/marcelo",
        version: 11,
      }
    );
    assert.deepEqual(buildAuthorProfilePayload({ name: " Marcelo Munhoz ", slug: "marcelo-munhoz", biography: " Bio ", version: 11 }), {
      name: "Marcelo Munhoz",
      slug: "marcelo-munhoz",
      biography: "Bio",
      version: 11,
    });
  });

  it("hydrates writer edit forms with display controls without exposing review notes", () => {
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
      authorName: "Marcelo Munhoz",
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
      authorEntryId: "author-1",
      authorName: "Marcelo Munhoz",
      tags: "admin, review",
      tagList: ["admin", "review"],
      tagInput: "",
      version: 12,
    });
  });

  it("hydrates editor date inputs from Contentful timestamps", () => {
    const form = articleToForm({
      id: "article-1",
      createAt: "2026-06-25T14:38:24.390Z",
      author: "Marcelo Munhoz",
      authorEntryId: "author-1",
    });

    assert.equal(form.createAt, "2026-06-25");
    assert.equal(form.authorName, "Marcelo Munhoz");
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
    const writer = { subject: "writer-1", roles: ["writer"] };

    assert.equal(canPrepareReviewAction({ id: "draft-1", status: "draft", writerSubject: "writer-1" }, writer), true);
    assert.equal(canPrepareReviewAction({ id: "published-1", status: "published", writerSubject: "writer-1" }, writer), false);
    assert.equal(canPrepareReviewAction({ id: "", status: "draft", writerSubject: "writer-1" }, writer), false);

    assert.equal(canRequestUnpublicationAction({ id: "published-1", status: "published", writerSubject: "writer-1" }, writer), true);
    assert.equal(canRequestUnpublicationAction({ id: "draft-1", status: "draft", writerSubject: "writer-1" }, writer), false);
    assert.equal(canRequestUnpublicationAction({ id: "review-1", status: "review", writerSubject: "writer-1" }, writer), false);
  });

  it("shows writer actions only for writer-owned article states", () => {
    const writer = { subject: "writer-1", roles: ["writer"], authorEntryId: "author-1" };

    assert.equal(canEditArticleAction({ id: "draft-1", status: "draft", writerSubject: "writer-1" }, writer), true);
    assert.equal(canEditArticleAction({ id: "draft-2", status: "draft", authorEntryId: "author-1" }, writer), true);
    assert.equal(canEditArticleAction({ id: "draft-3", status: "draft", writerSubject: "writer-2", authorEntryId: "author-2" }, writer), false);
    assert.equal(canEditArticleAction({ id: "draft-4", status: "draft" }, writer), false);
    assert.equal(canPrepareReviewAction({ id: "draft-1", status: "draft", writerSubject: "writer-1" }, writer), true);
    assert.equal(canRequestUnpublicationAction({ id: "published-1", status: "published", writerSubject: "writer-1" }, writer), true);

    assert.equal(canPrepareReviewAction({ id: "published-1", status: "published", writerSubject: "writer-1" }, writer), false);
    assert.equal(canOwnerPublishAction({ id: "review-1", status: "review" }, writer), false);
    assert.equal(canOwnerUnpublishAction({ id: "published-1", status: "published" }, writer), false);
    assert.equal(canArchiveArticleAction({ id: "draft-1", status: "draft" }, writer), false);
  });

  it("keeps owner body editing scoped to owned articles while preserving moderation", () => {
    const owner = { subject: "owner-1", roles: ["owner"], authorEntryId: "author-1" };

    assert.equal(canEditArticleAction({ id: "draft-1", status: "draft", writerSubject: "owner-1" }, owner), true);
    assert.equal(canEditArticleAction({ id: "published-1", status: "published", authorEntryId: "author-1" }, owner), true);
    assert.equal(canEditArticleAction({ id: "published-2", status: "published", authorEntryId: "author-2" }, owner), false);
    assert.equal(canOwnerPublishAction({ id: "review-1", status: "review" }, owner), true);
    assert.equal(canOwnerUnpublishAction({ id: "published-1", status: "published" }, owner), true);
    assert.equal(canOwnerUnpublishAction({ id: "take-down-1", status: "unpublicationRequested" }, owner), true);
    assert.equal(canArchiveArticleAction({ id: "draft-1", status: "draft" }, owner), true);

    assert.equal(canPrepareReviewAction({ id: "review-1", status: "review" }, owner), false);
    assert.equal(canRequestUnpublicationAction({ id: "published-1", status: "published" }, owner), false);
  });

  it("does not treat matching display names as trusted edit ownership", () => {
    const owner = { subject: "owner-1", name: "Marcelo Munhoz", roles: ["owner"] };

    assert.equal(canEditArticleAction({ id: "draft-1", status: "draft", author: "Marcelo Munhoz" }, owner), false);
    assert.equal(canEditArticleAction({ id: "draft-2", status: "draft", author: "Guest Writer" }, owner), false);
  });

  it("covers creator-scoped action matrices across draft, review, published, and other-author rows", () => {
    const writer = { subject: "writer-1", roles: ["writer"], authorEntryId: "author-1" };
    const owner = { subject: "owner-1", roles: ["owner"], authorEntryId: "author-owner" };
    const rows = [
      { id: "own-draft", status: "draft", authorEntryId: "author-1" },
      { id: "own-review", status: "review", writerSubject: "writer-1" },
      { id: "own-published", status: "published", writerSubject: "writer-1" },
      { id: "other-draft", status: "draft", authorEntryId: "author-2" },
    ];

    assert.deepEqual(
      rows.map((row) => ({
        id: row.id,
        edit: canEditArticleAction(row, writer),
        review: canPrepareReviewAction(row, writer),
        requestUnpublication: canRequestUnpublicationAction(row, writer),
      })),
      [
        { id: "own-draft", edit: true, review: true, requestUnpublication: false },
        { id: "own-review", edit: true, review: false, requestUnpublication: false },
        { id: "own-published", edit: true, review: false, requestUnpublication: true },
        { id: "other-draft", edit: false, review: false, requestUnpublication: false },
      ]
    );

    assert.deepEqual(
      rows.map((row) => ({
        id: row.id,
        edit: canEditArticleAction(row, owner),
        publish: canOwnerPublishAction(row, owner),
        unpublish: canOwnerUnpublishAction(row, owner),
        archive: canArchiveArticleAction(row, owner),
      })),
      [
        { id: "own-draft", edit: false, publish: false, unpublish: false, archive: true },
        { id: "own-review", edit: false, publish: true, unpublish: false, archive: true },
        { id: "own-published", edit: false, publish: false, unpublish: true, archive: true },
        { id: "other-draft", edit: false, publish: false, unpublish: false, archive: true },
      ]
    );
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

  it("normalizes media assets for visual selection without using raw ids as primary labels", () => {
    assert.deepEqual(
      normalizeMediaAssetDisplay({
        public_id: "marcelo-munhoz-website/blog/admin-dashboard",
        secure_url: "https://example.test/admin-dashboard.jpg",
        width: 1600,
        height: 900,
        context: { custom: { alt: "Admin dashboard thumbnail" } },
      }),
      {
        publicId: "marcelo-munhoz-website/blog/admin-dashboard",
        thumbnailUrl: "https://example.test/admin-dashboard.jpg",
        title: "Admin dashboard thumbnail",
        alt: "Admin dashboard thumbnail",
        dimensions: "1600 x 900",
      }
    );
    assert.equal(normalizeMediaAssetDisplay({ public_id: "folder/public-id-only" }).title, "public-id-only");
  });

  it("derives user-safe media library states for loading, empty, error, and ready responses", () => {
    assert.deepEqual(mediaLibraryState({ isLoading: true }), {
      status: "loading",
      message: "Loading media library.",
      assets: [],
    });
    assert.deepEqual(mediaLibraryState({ assets: [] }), {
      status: "empty",
      message: "No images are available in the selected media folder.",
      assets: [],
    });
    assert.deepEqual(mediaLibraryState({ error: "Cloudinary API secret leaked raw diagnostic" }), {
      status: "error",
      message: "Media request failed.",
      assets: [],
    });
    assert.deepEqual(mediaLibraryState({ error: "Media service is not configured for this environment." }), {
      status: "error",
      message: "Media service is not configured for this environment.",
      assets: [],
    });
    assert.deepEqual(mediaLibraryState({ assets: [{ public_id: "folder/photo", url: "https://example.test/photo.jpg" }] }), {
      status: "ready",
      message: "",
      assets: [
        {
          publicId: "folder/photo",
          thumbnailUrl: "https://example.test/photo.jpg",
          title: "photo",
          alt: "photo",
          dimensions: "",
        },
      ],
    });
  });

  it("renders the dashboard-first shell and routes article editing into focused pages", () => {
    const page = read("../src/pages/Admin.vue");
    const editor = read("../src/pages/AdminArticleEditor.vue");

    for (const text of ["Editorial dashboard", "Published", "Drafts", "In review", "Article queue", "Owner review", "Page views pending"]) {
      assert.match(page, new RegExp(text));
    }

    assert.match(page, /this\.\$router\.push\("\/admin\/articles\/new"\)/);
    assert.match(page, /\/admin\/articles\/\$\{encodeURIComponent\(article\.id\)\}\/edit/);
    assert.doesNotMatch(page, /<q-drawer/);
    assert.doesNotMatch(page, /class="editor-drawer"/);
    assert.doesNotMatch(page, /v-model="articleForm\./);

    assert.match(editor, /:model-value="articleForm\.title"/);

    for (const field of ["slug", "description", "body", "createAt", "alt", "authorName", "tagInput"]) {
      assert.match(editor, new RegExp(`v-model="articleForm\\.${field}"`));
    }

    assert.match(editor, /beforeRouteLeave/);
    assert.match(editor, /Leave the article editor and discard unsaved changes/);
    assert.doesNotMatch(editor, /v-model="articleForm\.version"/);
    assert.doesNotMatch(editor, /v-model="articleForm\.notes"/);
    assert.doesNotMatch(editor, /label="Author entry ID"/);
    assert.doesNotMatch(editor, /label="Selected image ID"/);
    assert.doesNotMatch(editor, /label="Selected image URL"/);
    assert.doesNotMatch(editor, /Comma-separated Contentful tag IDs/);
    assert.doesNotMatch(editor, /Review notes/);
    assert.match(editor, /Save draft/);
    assert.match(editor, /Submit for review/);
    assert.match(editor, /Request unpublication/);
    assert.match(page, /Publish/);
    assert.match(page, /Unpublish/);
    assert.match(page, /Archive/);
    assert.match(page, /Delete permanently/);
    assert.match(page, /confirmPermanentDeletion/);
    assert.match(page, /v-if="isOwner"/);
    assert.match(page, /isOwnerSession\(this\.session\)/);
    assert.match(editor, /Select image/);
    assert.match(editor, /Upload image/);
    assert.match(editor, /thumbnail-preview/);
    assert.match(editor, /thumbnail-preview-button/);
    assert.match(editor, /Replace image/);
    assert.match(editor, /Clear image/);
    assert.match(editor, /Edit image/);
    assert.match(editor, /Image diagnostics/);
    assert.match(editor, /showMediaDiagnostics/);
    assert.match(editor, /clearThumbnail/);
    assert.match(editor, /editThumbnailImage/);
    assert.match(editor, /openCloudinaryMediaEditor/);
    assert.match(editor, /getMediaEditorConfig/);
    assert.match(editor, /applyEditedMedia/);
    assert.match(editor, /articleForm\.thumbnailUrl/);
    assert.match(editor, /articleForm\.tagList/);
    assert.match(editor, /addTagToArticleForm/);
    assert.match(editor, /removeTagFromArticleForm/);
    assert.match(editor, /applySelectedMedia/);
    assert.match(editor, /handleMediaFile/);
    assert.match(editor, /mediaState/);
    assert.match(editor, /media-empty-state/);
    assert.match(editor, /media-dialog-toolbar/);
    assert.match(editor, /media-asset-title/);
    assert.match(editor, /asset\.thumbnailUrl/);
    assert.match(editor, /asset\.title/);
    assert.doesNotMatch(editor, /\{\{\s*asset\.public_id\s*\}\}/);
    assert.doesNotMatch(page, /admin-sidebar/);
    assert.match(page, /admin-filter-tabs/);
    assert.match(page, /article-table/);
    assert.doesNotMatch(page, /label="Media" disable/);
    assert.doesNotMatch(page, /label="Settings" disable/);
    assert.match(page, /loadArticleDashboard/);
    assert.doesNotMatch(page, /this\.articles = sampleAdminArticles/);
  });

  it("renders user-centered admin session and sign-out controls", () => {
    const page = read("../src/pages/Admin.vue");
    const layout = read("../src/layouts/MainLayout.vue");

    assert.doesNotMatch(page, /class="admin-session"/);
    assert.doesNotMatch(page, /sessionDisplay\.name/);
    assert.doesNotMatch(page, /sessionDisplay\.role\s*\}\}/);
    assert.doesNotMatch(page, /sessionDisplay\.context\s*\}\}/);
    assert.match(page, /signOut/);
    assert.doesNotMatch(page, /verified_user/);
    assert.doesNotMatch(page, /Owner preview"\s*:\s*"Writer preview/);

    assert.match(layout, /adminSessionDisplay/);
    assert.match(layout, /adminAccountInitials/);
    assert.match(layout, /adminNavLabel/);
    assert.match(layout, /Author profile/);
    assert.match(layout, /signOut/);
  });

  it("renders a separate author profile page backed by Contentful profile APIs", () => {
    const routes = read("../src/router/routes.js");
    const page = read("../src/pages/AdminProfile.vue");

    assert.match(routes, /path:\s*"\/admin\/profile"/);
    assert.match(routes, /pages\/AdminProfile\.vue/);
    assert.match(page, /getAuthorProfile/);
    assert.match(page, /updateAuthorProfile/);
    assert.match(page, /Netlify Identity/);
    assert.match(page, /Contentful/);
    assert.match(page, /Profile photo URL/);
    assert.match(page, /profileInitials/);
    assert.doesNotMatch(page, /v-model="session/);
    assert.doesNotMatch(page, /app_metadata|user_metadata|identity.*email/i);
  });

  it("renders public author bylines and author pages without identity metadata", () => {
    const routes = read("../src/router/routes.js");
    const article = read("../src/components/BlogArticle.vue");
    const authorPage = read("../src/pages/AuthorProfile.vue");

    assert.match(routes, /path:\s*"\/blog\/authors\/:slug"/);
    assert.match(routes, /pages\/AuthorProfile\.vue/);
    assert.match(article, /articleAuthorProfile/);
    assert.match(article, /name:\s*'Author'|name:\s*"Author"/);
    assert.match(article, /articleAuthorSlug/);
    assert.match(article, /Por[\s\S]*<router-link/);
    assert.match(authorPage, /\/api\/contentful\/author\/\$\{this\.\$route\.params\.slug\}/);
    assert.match(authorPage, /publicAuthorProfile/);
    assert.match(authorPage, /authorInitials/);
    assert.doesNotMatch(authorPage, /Identity|app_metadata|user_metadata|roles|invite|email/i);
  });

  it("keeps editor workflow buttons compact", () => {
    const page = read("../src/pages/AdminArticleEditor.vue");

    assert.match(page, /label="Save draft"[\s\S]*dense[\s\S]*no-caps/);
    assert.match(page, /label="Submit for review"[\s\S]*dense[\s\S]*no-caps/);
    assert.match(page, /label="Request unpublication"[\s\S]*dense[\s\S]*no-caps/);
    assert.match(page, /\.editor-actions[\s\S]*gap:\s*8px/);
  });

  it("keeps admin layout responsive without relying on a horizontally oversized table shell", () => {
    const page = read("../src/pages/Admin.vue");
    const editor = read("../src/pages/AdminArticleEditor.vue");

    assert.match(page, /\.admin-workspace[\s\S]*min-width:\s*0/);
    assert.match(page, /\.admin-topbar[\s\S]*flex-wrap:\s*wrap/);
    assert.match(page, /\.status-grid[\s\S]*auto-fit/);
    assert.match(page, /\.admin-main-grid[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    assert.match(page, /@media \(max-width:\s*900px\)/);
    assert.match(page, /\.article-table[\s\S]*overflow-x:\s*auto/);
    assert.match(page, /\.status-cell[\s\S]*justify-content:\s*flex-start/);
    assert.match(page, /\.table-actions[\s\S]*display:\s*flex/);
    assert.match(editor, /\.editor-shell[\s\S]*max-width:\s*980px/);
    assert.match(editor, /@media \(max-width:\s*720px\)/);
    assert.doesNotMatch(page, /letter-spacing:\s*-/);
    assert.doesNotMatch(editor, /letter-spacing:\s*-/);
  });

  it("handles save, validation, authorization, media, and conflict states in the writer UI", () => {
    const page = read("../src/pages/AdminArticleEditor.vue");

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
    assert.equal(
      adminUserMessage(new AdminApiError(500, { error: "Server configuration error" }), { media: true }),
      "Media service is not configured for this environment."
    );
    assert.equal(adminUserMessage(new AdminApiError(401, { error: "raw" })), "Sign in again before saving.");
    assert.equal(adminUserMessage(new AdminApiError(403, { error: "raw" })), "Your account cannot perform this action.");
    assert.equal(adminUserMessage(new AdminApiError(409, { error: "raw" })), "This article changed elsewhere. Reload before saving.");
  });

  it("configures Cloudinary Media Editor with public image options only", async () => {
    assert.deepEqual(buildMediaEditorOptions({ cloudName: "demo-cloud", publicId: "folder/image" }), {
      cloudName: "demo-cloud",
      publicIds: ["folder/image"],
      image: {
        steps: ["resizeAndCrop", "textOverlays", "export"],
        resizeAndCrop: {
          cropPresets: ["original", "square", "landscape-16:9", "landscape-4:3"],
        },
        export: {
          formats: ["jpg", "png", "webp"],
          quality: ["auto", "best", "good"],
          download: false,
          share: false,
        },
      },
    });

    assert.deepEqual(normalizeMediaEditorExport({ assets: [{ public_id: "folder/image", secure_url: "https://res.cloudinary.com/demo/image/upload/f_auto/folder/image.jpg" }] }), {
      publicId: "folder/image",
      secureUrl: "https://res.cloudinary.com/demo/image/upload/f_auto/folder/image.jpg",
      transformation: "",
    });

    let updateOptions = null;
    let exportHandler = null;
    let shown = false;
    const windowRef = {
      cloudinary: {
        mediaEditor() {
          return {
            update(options) {
              updateOptions = options;
            },
            on(eventName, handler) {
              if (eventName === "export") {
                exportHandler = handler;
              }
            },
            show() {
              shown = true;
            },
          };
        },
      },
    };
    const exported = [];

    await openCloudinaryMediaEditor({
      cloudName: "demo-cloud",
      publicId: "folder/image",
      onExport: (asset) => exported.push(asset),
      windowRef,
    });
    exportHandler({ public_id: "folder/image", url: "https://res.cloudinary.com/demo/image/upload/c_crop/folder/image.jpg" });

    assert.equal(shown, true);
    assert.equal(updateOptions.cloudName, "demo-cloud");
    assert.deepEqual(updateOptions.publicIds, ["folder/image"]);
    assert.deepEqual(exported, [
      {
        publicId: "folder/image",
        secureUrl: "https://res.cloudinary.com/demo/image/upload/c_crop/folder/image.jpg",
        transformation: "",
      },
    ]);
    assert.doesNotMatch(JSON.stringify(updateOptions), /api.?key|secret/i);
  });
});
