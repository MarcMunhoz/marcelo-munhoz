import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { AdminApiError, adminRequest, adminUserMessage, listMediaAssets, uploadMediaAsset } from "../../src/utils/adminApi.js";
import { canDeleteManagedTag, normalizeEditorialTagOptions, toggleArticleTagFilter } from "../../src/utils/adminTags.js";
import { articleBylineLabels, articleLocaleFromArticle, articleNavigationLabels, publicArticleDates } from "../../src/utils/articleDates.js";
import { publicAuthorMetadata, publicAuthorProfile } from "../../src/utils/authorProfiles.js";
import { buildApiUrl, configuredApiBase } from "../../src/utils/apiBase.js";
import { shouldShowCookieNotice } from "../../src/utils/cookieNotice.js";

describe("frontend utility error and fallback boundaries", () => {
  it("maps every administrative failure class to safe user-facing feedback", () => {
    assert.equal(adminUserMessage(new Error("provider detail")), "The admin request could not be completed.");
    assert.equal(adminUserMessage(new Error("provider detail"), { media: true }), "Media request failed.");
    assert.equal(adminUserMessage(new AdminApiError(401), { media: true }), "Sign in again before selecting media.");
    assert.equal(adminUserMessage(new AdminApiError(403), { media: true }), "Your account cannot select media.");
    assert.equal(adminUserMessage(new AdminApiError(400, { error: "Title is required" })), "Title is required");
    assert.equal(
      adminUserMessage(new AdminApiError(500, { error: "Cloudinary configuration missing" }), { media: true }),
      "Media service is not configured for this environment."
    );
    assert.equal(adminUserMessage(new AdminApiError(409)), "This article changed elsewhere. Reload before saving.");
    assert.equal(adminUserMessage(new AdminApiError(404, { error: "Author profile missing" })), "Author profile not resolved for this account.");
    assert.equal(adminUserMessage(new AdminApiError(422)), "The media selection could not be saved. Select the image again.");
  });

  it("handles malformed responses, encoded media operations, and preview writer authorization", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => { throw new SyntaxError("invalid json"); } };
    };
    const session = { preview: true, roles: ["writer"] };

    assert.deepEqual(await listMediaAssets({ session, maxResults: "24 & more", fetchImpl }), {});
    assert.deepEqual(await uploadMediaAsset({ file: "data:image/png;base64,eA==", filename: "cover.png", session, fetchImpl }), {});
    assert.equal(calls[0].url, "/api/admin/contentful/media/assets?max_results=24%20%26%20more");
    assert.equal(calls[0].options.headers["x-admin-preview-role"], "writer");
    assert.deepEqual(JSON.parse(calls[1].options.body), { file: "data:image/png;base64,eA==", filename: "cover.png" });

    await assert.rejects(
      adminRequest({ path: "/failure", session, fetchImpl: async () => ({ ok: false, status: 502, json: async () => { throw new Error("bad"); } }) }),
      (error) => error instanceof AdminApiError && error.status === 502 && error.message === "Admin request failed"
    );
  });

  it("normalizes API, tag, locale, metadata, and cookie fallback inputs", () => {
    assert.equal(configuredApiBase(null), "");
    assert.equal(buildApiUrl("articles", "https://example.test///"), "https://example.test/articles");
    assert.deepEqual(normalizeEditorialTagOptions(null), []);
    assert.deepEqual(normalizeEditorialTagOptions([{ id: " topic " }, null]), [{ id: "topic", label: "topic" }]);
    assert.deepEqual(toggleArticleTagFilter(undefined, "  topic "), { tag: "topic" });
    assert.equal(canDeleteManagedTag(), false);
    assert.equal(articleLocaleFromArticle({ language: "en-US" }), "en-US");
    assert.equal(articleLocaleFromArticle({ lang: "pt-BR" }), "pt-BR");
    assert.equal(articleLocaleFromArticle({ title: "the people and software", body: "what you learned" }), "en-US");
    assert.deepEqual(articleBylineLabels("en-US"), { by: "By", on: "on", updated: "Updated on" });
    assert.deepEqual(articleNavigationLabels("en-US"), { all: "All articles", previous: "Previous article", next: "Next article" });
    assert.deepEqual(publicArticleDates({ createAt: "invalid" }), { created: "", updated: "" });
    assert.deepEqual(publicAuthorMetadata({}), {
      title: "Marcelo Munhoz - Author",
      meta: { description: { name: "description", content: "Articles by " } },
    });
    assert.deepEqual(publicAuthorProfile({ biography: { content: [{ value: "Structured " }, { content: [{ value: "biography" }] }] } }).biography, "Structured biography");
    assert.equal(shouldShowCookieNotice({ meta: { requiresAdmin: true } }, true), false);
  });
});
