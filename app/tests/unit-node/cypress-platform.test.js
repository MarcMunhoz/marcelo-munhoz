import assert from "node:assert/strict";
import { describe, it } from "vitest";

import cypressConfig, { configureBrowserLaunch } from "../../cypress.config.js";
import { createQuasarDevServerProxy, quasarDevServerAllowedHosts } from "../../quasarBuildManifest.js";

describe("Cypress platform contract", () => {
  it("keeps deterministic browser diagnostics bounded and sanitized", () => {
    assert.equal(cypressConfig.e2e.baseUrl, "http://test-frontend:1991");
    assert.equal(cypressConfig.e2e.specPattern, "cypress/e2e/**/*.cy.js");
    assert.equal(cypressConfig.video, true);
    assert.equal(cypressConfig.screenshotOnRunFailure, true);
    assert.equal(cypressConfig.retries.runMode, 1);
    assert.match(cypressConfig.screenshotsFolder, /^artifacts\/cypress\//);
    assert.match(cypressConfig.videosFolder, /^artifacts\/cypress\//);
    assert.equal(cypressConfig.env.maxFailureScreenshots, 20);
    assert.equal(cypressConfig.env.maxFailureVideos, 10);
  });

  it("routes E2E API traffic to the isolated backend service", () => {
    const quasarDevServerProxy = createQuasarDevServerProxy("http://test-backend:3000");
    assert.equal(quasarDevServerProxy["/api"].target, "http://test-backend:3000");
    assert.equal(quasarDevServerProxy["/api/admin/contentful"].target, "http://test-backend:3000");
  });

  it("allows the isolated browser service to reach the Quasar dev server", () => {
    assert.deepEqual(quasarDevServerAllowedHosts, ["test-frontend"]);
  });

  it("preserves secure session-cookie behavior in both isolated browsers", () => {
    const chromium = configureBrowserLaunch({ family: "chromium" }, { args: [], preferences: {} });
    const firefox = configureBrowserLaunch({ family: "firefox" }, { args: [], preferences: {} });
    assert.deepEqual(chromium.args, ["--unsafely-treat-insecure-origin-as-secure=http://test-frontend:1991"]);
    assert.equal(firefox.preferences["dom.securecontext.allowlist"], "test-frontend");
  });
});
