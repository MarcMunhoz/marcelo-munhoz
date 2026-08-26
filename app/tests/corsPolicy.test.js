import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("local middleware CORS policy", () => {
  it("allows loopback origins only in development", async () => {
    let isAllowedCorsOrigin;

    try {
      ({ isAllowedCorsOrigin } = await import("../middleware/corsPolicy.js"));
    } catch {
      // The first red run proves the policy module does not exist yet.
    }

    assert.equal(typeof isAllowedCorsOrigin, "function");
    assert.equal(isAllowedCorsOrigin("http://localhost:1991", { nodeEnv: "development" }), true);
    assert.equal(isAllowedCorsOrigin("http://127.0.0.1:1991", { nodeEnv: "development" }), true);
    assert.equal(isAllowedCorsOrigin("http://localhost:1991", { nodeEnv: "production" }), false);
    assert.equal(isAllowedCorsOrigin("https://staging.example.test", { nodeEnv: "production", allowedOrigins: ["https://staging.example.test"] }), true);
    assert.equal(isAllowedCorsOrigin("https://untrusted.example.test", { nodeEnv: "development" }), false);
    assert.equal(isAllowedCorsOrigin(undefined, { nodeEnv: "production" }), true);
  });
});
