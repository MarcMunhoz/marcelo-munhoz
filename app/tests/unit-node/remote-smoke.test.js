import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";

import { createRemoteCypressConfig } from "../../cypress.remote.config.js";
import { assertReadOnlyRequest } from "../../cypress/remote/read-only.js";
import { sanitizeRemoteSmokeArtifacts } from "../../scripts/sanitize-remote-smoke-artifacts.js";
import { remoteSmokeEnvironment } from "../../scripts/run-remote-smoke.js";
import { handler as healthHandler } from "../../netlify/functions/health.js";

describe("remote smoke safety", () => {
  it("forwards only the runtime values required by Cypress", () => {
    const runtimeBin = ["", "runtime", "bin"].join("/");
    const runtimeCache = ["", "runtime", "cache"].join("/");
    assert.deepEqual(
      remoteSmokeEnvironment({
        PATH: runtimeBin,
        DISPLAY: ":99",
        CYPRESS_CACHE_FOLDER: runtimeCache,
        DEPLOY_PREVIEW_URL: "https://deploy-preview.example.test",
        CONTENTFUL_MANAGEMENT_TOKEN: "must-not-cross-boundary",
        GITHUB_TOKEN: "must-not-cross-boundary",
      }),
      {
        PATH: runtimeBin,
        DISPLAY: ":99",
        CYPRESS_CACHE_FOLDER: runtimeCache,
        CYPRESS_BASE_URL: "https://deploy-preview.example.test",
        DEPLOY_PREVIEW_URL: "https://deploy-preview.example.test",
      }
    );
  });

  it("uses a separate Chrome-only configuration without binary diagnostics", () => {
    const config = createRemoteCypressConfig({ baseUrl: "https://deploy-preview.example.test" });

    assert.equal(config.e2e.specPattern, "cypress/remote/**/*.cy.js");
    assert.equal(config.e2e.baseUrl, "https://deploy-preview.example.test");
    assert.equal(config.video, false);
    assert.equal(config.screenshotOnRunFailure, false);
    assert.match(config.reporterOptions.mochaFile, /^artifacts\/remote-smoke\/raw\//);
    let browserLaunch;
    config.e2e.setupNodeEvents((event, handler) => { if (event === "before:browser:launch") browserLaunch = handler; }, {});
    assert.throws(() => browserLaunch({ name: "firefox" }, {}), /Chrome/);
  });

  it("rejects every mutating browser request", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      assert.throws(() => assertReadOnlyRequest({ method, url: "https://deploy-preview.example.test/api/admin/contentful/articles" }), /read-only/);
    }
    assert.doesNotThrow(() => assertReadOnlyRequest({ method: "GET", url: "https://deploy-preview.example.test/api/admin/contentful/articles" }));
  });

  it("publishes only bounded redacted text diagnostics", () => {
    const root = mkdtempSync(join(tmpdir(), "remote-smoke-"));
    const sourceDir = join(root, "raw");
    const outputDir = join(root, "sanitized");
    mkdirSync(join(sourceDir, "nested"), { recursive: true });
    const syntheticLocalPath = ["", "home", "person", "project", "file.js"].join("/");
    writeFileSync(join(sourceDir, "nested", "results.log"), `GET https://secret.example.test/path?q=token\nAuthorization: Bearer sensitive-value\n${syntheticLocalPath}\n`);
    writeFileSync(join(sourceDir, "failure.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    try {
      const manifest = sanitizeRemoteSmokeArtifacts({ sourceDir, outputDir, sensitiveValues: ["sensitive-value"] });
      const diagnostic = readFileSync(join(outputDir, "diagnostic-001.log"), "utf8");
      const savedManifest = JSON.parse(readFileSync(join(outputDir, "manifest.json"), "utf8"));

      assert.doesNotMatch(diagnostic, /secret\.example|token|sensitive-value|\/home\/person/);
      assert.match(diagnostic, /<preview-url>/);
      assert.match(diagnostic, /<redacted>/);
      assert.match(diagnostic, /<local-path>/);
      assert.deepEqual(savedManifest, manifest);
      assert.deepEqual(manifest, { sanitizedTextFiles: 1, omittedBinaryFiles: 1, truncatedFiles: 0 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses to write sanitized evidence inside its raw source", () => {
    const root = mkdtempSync(join(tmpdir(), "remote-smoke-boundary-"));
    try {
      assert.throws(
        () => sanitizeRemoteSmokeArtifacts({ sourceDir: root, outputDir: join(root, "published") }),
        /outside the raw artifact tree/
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("provides a provider-independent Netlify health response", async () => {
    assert.deepEqual(await healthHandler(), {
      statusCode: 200,
      headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
      body: "OK",
    });
  });
});
