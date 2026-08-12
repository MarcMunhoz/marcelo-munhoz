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
    assert.deepEqual(body.fields.thumbnail["en-US"], { public_id: "folder/image", secure_url: "https://example.invalid/image.jpg" });
    assert.equal(body.fields.alt["en-US"], "Draft thumbnail");
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

  it("creates editorial workflow request entries for review and unpublication", async () => {
    const calls = [];
    const facade = createContentfulManagementFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(201, { sys: { id: `request-${calls.length}`, version: 1 } });
      },
      now: () => "2026-08-11T12:00:00.000Z",
    });

    await facade.submitArticleForReview({
      articleId: "article-1",
      session: { subject: "writer-1", name: "Guest Writer" },
      data: { version: 7 },
    });
    await facade.requestUnpublication({
      articleId: "article-2",
      session: { subject: "writer-2", name: "Owner Writer" },
      data: { version: 8 },
    });

    assert.equal(calls.length, 2);
    assert.equal(calls[0].options.headers["x-contentful-content-type"], "blogEditorialRequest");
    assert.equal(calls[1].options.headers["x-contentful-content-type"], "blogEditorialRequest");

    const reviewBody = JSON.parse(calls[0].options.body);
    assert.equal(reviewBody.fields.requestType["en-US"], "publication");
    assert.equal(reviewBody.fields.status["en-US"], "readyForReview");
    assert.deepEqual(reviewBody.fields.article["en-US"], {
      sys: { type: "Link", linkType: "Entry", id: "article-1" },
    });
    assert.equal(reviewBody.fields.writerSubject["en-US"], "writer-1");
    assert.equal(reviewBody.fields.writerName["en-US"], "Guest Writer");
    assert.equal(reviewBody.fields.createdAt["en-US"], "2026-08-11T12:00:00.000Z");
    assert.equal(reviewBody.fields.updatedAt["en-US"], "2026-08-11T12:00:00.000Z");

    const unpublicationBody = JSON.parse(calls[1].options.body);
    assert.equal(unpublicationBody.fields.requestType["en-US"], "unpublication");
    assert.equal(unpublicationBody.fields.status["en-US"], "readyForReview");
    assert.deepEqual(unpublicationBody.fields.article["en-US"], {
      sys: { type: "Link", linkType: "Entry", id: "article-2" },
    });
    assert.equal(unpublicationBody.fields.writerSubject["en-US"], "writer-2");
    assert.equal(unpublicationBody.fields.writerName["en-US"], "Owner Writer");
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

    const result = await facade.createArticleDraft({ data: { title: "Draft" } });

    assert.deepEqual(result, {});
  });
});
