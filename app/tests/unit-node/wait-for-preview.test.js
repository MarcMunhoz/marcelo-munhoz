import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { waitForMatchingPreview } from "../../scripts/wait-for-preview.js";

const expectedCommit = "0123456789abcdef0123456789abcdef01234567";
const staleCommit = "fedcba9876543210fedcba9876543210fedcba98";
const previewUrl = "https://deploy-preview.example.test";

const response = ({ status = 200, contentType = "application/json", body = { commit: expectedCommit } } = {}) => ({
  status,
  headers: { get: (name) => (name.toLowerCase() === "content-type" ? contentType : null) },
  json: async () => body,
});

const clock = () => {
  let current = 0;
  return {
    now: () => current,
    sleep: async (milliseconds) => { current += milliseconds; },
  };
};

describe("Deploy Preview readiness", () => {
  it("returns only after the deployed marker matches the expected commit", async () => {
    const requests = [];
    const replies = [response({ body: { commit: staleCommit } }), response()];
    const fakeClock = clock();

    const result = await waitForMatchingPreview({
      previewUrl,
      expectedCommit,
      fetchImpl: async (url, options) => {
        requests.push({ url, options });
        return replies.shift();
      },
      now: fakeClock.now,
      sleep: fakeClock.sleep,
      timeoutMs: 2_000,
      intervalMs: 250,
    });

    assert.deepEqual(result, { commit: expectedCommit });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, `${previewUrl}/.well-known/build-identity.json`);
    assert.equal(requests[0].options.method, "GET");
    assert.equal(requests[0].options.credentials, "omit");
    assert.equal(requests[0].options.cache, "no-store");
    assert.equal(requests[0].options.redirect, "error");
  });

  it("fails closed when unavailable content never becomes current", async () => {
    const fakeClock = clock();
    let attempts = 0;

    await assert.rejects(
      waitForMatchingPreview({
        previewUrl,
        expectedCommit,
        fetchImpl: async () => { attempts += 1; return response({ status: 404, contentType: "text/html", body: {} }); },
        now: fakeClock.now,
        sleep: fakeClock.sleep,
        timeoutMs: 500,
        intervalMs: 250,
      }),
      { message: "Deploy Preview did not expose the expected build before the readiness deadline." }
    );

    assert.equal(attempts, 2);
  });

  it("rejects unsafe origins and malformed expected commits before requesting", async () => {
    let requests = 0;
    const fetchImpl = async () => { requests += 1; return response(); };

    await assert.rejects(waitForMatchingPreview({ previewUrl: "http://preview.example.test", expectedCommit, fetchImpl }), /HTTPS/);
    await assert.rejects(waitForMatchingPreview({ previewUrl: "https://user:pass@example.test", expectedCommit, fetchImpl }), /credentials/);
    await assert.rejects(waitForMatchingPreview({ previewUrl, expectedCommit: "short", fetchImpl }), /full commit SHA/);
    assert.equal(requests, 0);
  });
});
