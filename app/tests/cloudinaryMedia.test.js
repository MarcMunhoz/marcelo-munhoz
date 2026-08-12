import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CloudinaryMediaConfigurationError,
  CloudinaryMediaRequestError,
  createCloudinaryMediaFacade,
  createContentfulAdminHandler,
} from "../middleware/contentfulAdmin.js";

const createEnv = () => ({
  CLOUDINARY_CLOUD_NAME: "demo-cloud",
  CLOUDINARY_API_KEY: "api-key",
  CLOUDINARY_API_SECRET: "api-secret",
  CLOUDINARY_UPLOAD_FOLDER: "marcelo-munhoz-website",
});

const createSession = (roles = ["writer"]) => ({
  subject: "user-123",
  name: "Guest Writer",
  roles,
});

const createResponse = (status, payload = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return payload;
  },
});

const parse = (response) => JSON.parse(response.body);

describe("cloudinary media facade", () => {
  it("lists image assets scoped to the configured folder with server-side credentials", async () => {
    const calls = [];
    const facade = createCloudinaryMediaFacade({
      env: createEnv(),
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(200, {
          resources: [
            {
              public_id: "marcelo-munhoz-website/post-cover",
              secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/post-cover.jpg",
              width: 1200,
              height: 800,
              format: "jpg",
              created_at: "2026-08-11T12:00:00Z",
            },
          ],
        });
      },
    });

    const result = await facade.listMedia({ query: { max_results: "12" } });

    assert.equal(calls.length, 1);
    const url = new URL(calls[0].url);
    assert.equal(url.origin, "https://api.cloudinary.com");
    assert.equal(url.pathname, "/v1_1/demo-cloud/resources/image/upload");
    assert.equal(url.searchParams.get("prefix"), "marcelo-munhoz-website");
    assert.equal(url.searchParams.get("max_results"), "12");
    assert.match(calls[0].options.headers.authorization, /^Basic /);
    assert.deepEqual(result.assets, [
      {
        public_id: "marcelo-munhoz-website/post-cover",
        secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/post-cover.jpg",
        url: "https://res.cloudinary.com/demo-cloud/image/upload/post-cover.jpg",
        width: 1200,
        height: 800,
        format: "jpg",
        created_at: "2026-08-11T12:00:00Z",
      },
    ]);
  });

  it("falls back to default and unscoped image listing when the configured folder has no assets", async () => {
    const calls = [];
    const facade = createCloudinaryMediaFacade({
      env: {
        ...createEnv(),
        CLOUDINARY_UPLOAD_FOLDER: "staging-only-folder",
      },
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        if (calls.length < 3) {
          return createResponse(200, { resources: [] });
        }

        return createResponse(200, {
          resources: [
            {
              public_id: "legacy-cover",
              secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/legacy-cover.jpg",
              width: 1200,
              height: 800,
              format: "jpg",
              created_at: "2026-08-11T12:00:00Z",
            },
          ],
        });
      },
    });

    const result = await facade.listMedia({ query: { max_results: "12" } });

    assert.equal(calls.length, 3);
    assert.equal(new URL(calls[0].url).searchParams.get("prefix"), "staging-only-folder");
    assert.equal(new URL(calls[1].url).searchParams.get("prefix"), "marcelo-munhoz-website");
    assert.equal(new URL(calls[2].url).searchParams.has("prefix"), false);
    assert.deepEqual(result.assets, [
      {
        public_id: "legacy-cover",
        secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/legacy-cover.jpg",
        url: "https://res.cloudinary.com/demo-cloud/image/upload/legacy-cover.jpg",
        width: 1200,
        height: 800,
        format: "jpg",
        created_at: "2026-08-11T12:00:00Z",
      },
    ]);
  });

  it("uploads image data with a server-generated signature and folder scope", async () => {
    const calls = [];
    const facade = createCloudinaryMediaFacade({
      env: createEnv(),
      nowTimestamp: () => 1786449600,
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });
        return createResponse(200, {
          public_id: "marcelo-munhoz-website/new-cover",
          secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/new-cover.jpg",
          width: 1200,
          height: 630,
          format: "jpg",
          created_at: "2026-08-11T12:00:00Z",
        });
      },
    });

    const result = await facade.uploadMedia({
      data: {
        file: "data:image/jpeg;base64,abc123",
        filename: "new-cover.jpg",
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.cloudinary.com/v1_1/demo-cloud/image/upload");
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].options.body.get("file"), "data:image/jpeg;base64,abc123");
    assert.equal(calls[0].options.body.get("folder"), "marcelo-munhoz-website");
    assert.equal(calls[0].options.body.get("api_key"), "api-key");
    assert.equal(calls[0].options.body.get("timestamp"), "1786449600");
    assert.ok(calls[0].options.body.get("signature"));
    assert.notEqual(calls[0].options.body.get("signature"), "api-secret");
    assert.deepEqual(result.asset, {
      public_id: "marcelo-munhoz-website/new-cover",
      secure_url: "https://res.cloudinary.com/demo-cloud/image/upload/new-cover.jpg",
      url: "https://res.cloudinary.com/demo-cloud/image/upload/new-cover.jpg",
      width: 1200,
      height: 630,
      format: "jpg",
      created_at: "2026-08-11T12:00:00Z",
    });
  });

  it("rejects missing media configuration before calling Cloudinary", async () => {
    let called = false;
    const facade = createCloudinaryMediaFacade({
      env: {},
      async fetchImpl() {
        called = true;
      },
    });

    await assert.rejects(() => facade.listMedia({ query: {} }), CloudinaryMediaConfigurationError);
    await assert.rejects(() => facade.uploadMedia({ data: { file: "data:image/jpeg;base64,abc123" } }), CloudinaryMediaConfigurationError);
    assert.equal(called, false);
  });

  it("maps upstream media failures to safe media request errors", async () => {
    const facade = createCloudinaryMediaFacade({
      env: createEnv(),
      async fetchImpl() {
        return createResponse(503, { error: { message: "CLOUDINARY_API_SECRET=api-secret raw failure" } });
      },
    });

    await assert.rejects(
      () => facade.listMedia({ query: {} }),
      (error) => {
        assert.ok(error instanceof CloudinaryMediaRequestError);
        assert.equal(error.publicError, "Media request failed");
        assert.doesNotMatch(error.message, /CLOUDINARY_API_SECRET|api-secret|raw failure/i);
        return true;
      }
    );
  });

  it("rejects malformed upload input before calling Cloudinary", async () => {
    let called = false;
    const facade = createCloudinaryMediaFacade({
      env: createEnv(),
      async fetchImpl() {
        called = true;
      },
    });

    await assert.rejects(
      () => facade.uploadMedia({ data: { file: "https://example.test/image.jpg" } }),
      CloudinaryMediaRequestError
    );
    assert.equal(called, false);
  });

  it("returns an empty safe media list for malformed successful media responses", async () => {
    const facade = createCloudinaryMediaFacade({
      env: createEnv(),
      async fetchImpl() {
        return {
          ok: true,
          status: 200,
          async json() {
            throw new Error("malformed Cloudinary JSON");
          },
        };
      },
    });

    const result = await facade.listMedia({ query: {} });

    assert.deepEqual(result, { assets: [] });
  });
});

describe("cloudinary media admin routes", () => {
  it("requires writer authorization before listing media", async () => {
    let operationRan = false;
    const handler = createContentfulAdminHandler({
      getSession() {
        return null;
      },
      operations: {
        async listMedia() {
          operationRan = true;
        },
      },
    });

    const response = await handler({ method: "GET", path: "/media/assets", query: {} });

    assert.equal(response.statusCode, 401);
    assert.equal(operationRan, false);
  });

  it("allows writer sessions to list and upload media through narrow routes", async () => {
    const handler = createContentfulAdminHandler({
      getSession() {
        return createSession(["writer"]);
      },
      operations: {
        async listMedia({ query, session }) {
          return { assets: [{ public_id: "folder/asset" }], requestedBy: session.subject, query };
        },
        async uploadMedia({ data, session }) {
          return { asset: { public_id: "folder/upload", secure_url: data.file }, requestedBy: session.subject };
        },
      },
    });

    const listResponse = await handler({ method: "GET", path: "/media/assets", query: { max_results: "8" } });
    const uploadResponse = await handler({
      method: "POST",
      path: "/media/upload",
      body: JSON.stringify({ file: "data:image/png;base64,abc123" }),
    });

    assert.equal(listResponse.statusCode, 200);
    assert.deepEqual(parse(listResponse), { assets: [{ public_id: "folder/asset" }], requestedBy: "user-123", query: { max_results: "8" } });
    assert.equal(uploadResponse.statusCode, 200);
    assert.deepEqual(parse(uploadResponse), {
      asset: { public_id: "folder/upload", secure_url: "data:image/png;base64,abc123" },
      requestedBy: "user-123",
    });
  });
});
