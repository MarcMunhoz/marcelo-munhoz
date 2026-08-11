import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildArticlePayload, filterAdminArticles, summarizeArticleStatuses } from "../src/utils/adminDashboard.js";
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
    assert.match(api, /listMediaAssets/);
    assert.match(api, /uploadMediaAsset/);
    assert.match(api, /Authorization/);
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

    for (const text of ["Editorial dashboard", "Published", "Drafts", "In review", "Article queue", "Media library", "Page views pending"]) {
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
    assert.match(page, /Select image/);
    assert.match(page, /Upload image/);
    assert.match(page, /applySelectedMedia/);
    assert.match(page, /handleMediaFile/);
    assert.match(page, /admin-sidebar/);
    assert.match(page, /article-table/);
  });

  it("handles save, validation, authorization, media, and conflict states in the writer UI", () => {
    const page = read("../src/pages/Admin.vue");

    assert.match(page, /validateArticleForm/);
    assert.match(page, /status === 401/);
    assert.match(page, /status === 403/);
    assert.match(page, /status === 409/);
    assert.match(page, /media/i);
    assert.match(page, /Draft saved/);
  });
});
