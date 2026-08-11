import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ContentfulAdminConfigurationError,
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
        cloudinary: [{ public_id: "folder/image", url: "https://example.invalid/image.jpg" }],
        tags: ["vue", "contentful"],
      },
    });

    assert.deepEqual(result, { sys: { id: "article-1", version: 1 } });
    assert.equal(calls.length, 1);

    const url = new URL(calls[0].url);
    assert.equal(url.origin, "https://api.contentful.com");
    assert.equal(url.pathname, "/spaces/space-id/environments/staging/entries");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.headers.authorization, "Bearer management-key");
    assert.equal(calls[0].options.headers["x-contentful-content-type"], "article");

    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.fields.title["en-US"], "Draft title");
    assert.equal(body.fields.slug["en-US"], "draft-title");
    assert.equal(body.fields.description["en-US"], "Draft description");
    assert.equal(body.fields.body["en-US"], "# Draft");
    assert.equal(body.fields.createAt["en-US"], "2026-08-11");
    assert.deepEqual(body.fields.author["en-US"], {
      sys: { type: "Link", linkType: "Entry", id: "author-1" },
    });
    assert.deepEqual(body.fields.cloudinary["en-US"], [{ public_id: "folder/image", url: "https://example.invalid/image.jpg" }]);
    assert.deepEqual(body.metadata.tags, [
      { sys: { type: "Link", linkType: "Tag", id: "vue" } },
      { sys: { type: "Link", linkType: "Tag", id: "contentful" } },
    ]);
  });

  it("updates article drafts with the supplied version header", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
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
    });

    assert.equal(calls[0].options.method, "PUT");
    assert.equal(calls[0].options.headers["x-contentful-version"], "7");
    assert.equal(new URL(calls[0].url).pathname, "/spaces/space-id/environments/staging/entries/article-1");
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
    await facade.deleteArticle({ articleId: "article-1", data: { version: 13 } });

    assert.equal(calls[0].options.method, "PUT");
    assert.equal(new URL(calls[0].url).pathname, "/spaces/space-id/environments/staging/entries/article-1/published");
    assert.equal(calls[0].options.headers["x-contentful-version"], "10");

    assert.equal(calls[1].options.method, "DELETE");
    assert.equal(new URL(calls[1].url).pathname, "/spaces/space-id/environments/staging/entries/article-1/published");
    assert.equal(calls[1].options.headers["x-contentful-version"], "11");

    assert.equal(calls[2].options.method, "PUT");
    assert.equal(new URL(calls[2].url).pathname, "/spaces/space-id/environments/staging/entries/article-1/archived");
    assert.equal(calls[2].options.headers["x-contentful-version"], "12");

    assert.equal(calls[3].options.method, "DELETE");
    assert.equal(new URL(calls[3].url).pathname, "/spaces/space-id/environments/staging/entries/article-1");
    assert.equal(calls[3].options.headers["x-contentful-version"], "13");
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
});
