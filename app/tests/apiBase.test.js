import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildApiUrl, configuredApiBase, normalizeApiBase } from "../src/utils/apiBase.js";

describe("api base helper", () => {
  it("defaults production requests to same-origin paths", () => {
    assert.equal(normalizeApiBase(), "");
    assert.equal(buildApiUrl("/api/contentful/entries?page=1"), "/api/contentful/entries?page=1");
  });

  it("normalizes configured API base URLs", () => {
    assert.equal(normalizeApiBase("https://example.com/"), "https://example.com");
    assert.equal(buildApiUrl("/api/contentful/tags", "https://example.com/"), "https://example.com/api/contentful/tags");
  });

  it("keeps relative local API bases stable", () => {
    assert.equal(normalizeApiBase("/local-api/"), "/local-api");
    assert.equal(buildApiUrl("api/contentful/entries", "/local-api/"), "/local-api/api/contentful/entries");
  });

  it("ignores legacy VITE_API_URL during local dev", () => {
    const env = {
      DEV: true,
      VITE_API_URL: "https://legacy-api.example.test",
      VITE_API_BASE_URL: "",
    };

    assert.equal(configuredApiBase(env), "");
    assert.equal(buildApiUrl("/api/contentful/entries?page=1", configuredApiBase(env)), "/api/contentful/entries?page=1");
  });

  it("ignores legacy VITE_API_URL outside local dev", () => {
    const env = {
      DEV: false,
      VITE_API_URL: "https://legacy-api.example.test",
      VITE_API_BASE_URL: "",
    };

    assert.equal(configuredApiBase(env), "");
  });

  it("allows explicit VITE_API_BASE_URL overrides outside local dev", () => {
    const env = {
      DEV: false,
      VITE_API_URL: "https://legacy-api.example.test",
      VITE_API_BASE_URL: "https://api.example.test",
    };

    assert.equal(configuredApiBase(env), "https://api.example.test");
  });
});
