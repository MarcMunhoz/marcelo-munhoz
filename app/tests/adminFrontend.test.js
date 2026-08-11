import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

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
    assert.match(api, /createArticleDraft/);
    assert.match(api, /updateArticleDraft/);
    assert.match(api, /submitArticleForReview/);
    assert.match(api, /requestArticleUnpublication/);
    assert.match(api, /Authorization/);
  });

  it("renders the first writer editor fields and workflow controls", () => {
    const page = read("../src/pages/Admin.vue");

    for (const field of ["title", "slug", "description", "body", "createAt", "author", "cloudinaryPublicId", "cloudinaryUrl", "tags", "notes"]) {
      assert.match(page, new RegExp(`v-model="articleForm\\.${field}"`));
    }

    assert.match(page, /Save draft/);
    assert.match(page, /Submit for review/);
    assert.match(page, /Request unpublication/);
    assert.match(page, /editorial-rail/);
  });

  it("handles save, validation, authorization, and conflict states in the writer UI", () => {
    const page = read("../src/pages/Admin.vue");

    assert.match(page, /validateArticleForm/);
    assert.match(page, /status === 401/);
    assert.match(page, /status === 403/);
    assert.match(page, /status === 409/);
    assert.match(page, /Draft saved/);
  });
});
