import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "cypress";

const pruneArtifacts = (directory, maximum) => {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => ({ path: join(directory, entry.name), modifiedAt: statSync(join(directory, entry.name)).mtimeMs }))
      .sort((left, right) => right.modifiedAt - left.modifiedAt);
  } catch {
    return;
  }

  for (const entry of entries.slice(maximum)) rmSync(entry.path, { force: true });
};

export const configureBrowserLaunch = (browser, launchOptions) => {
  const secureTestOrigin = "http://test-frontend:1991";
  if (browser.family === "chromium") {
    launchOptions.args.push(`--unsafely-treat-insecure-origin-as-secure=${secureTestOrigin}`);
  } else if (browser.family === "firefox") {
    launchOptions.preferences["dom.securecontext.allowlist"] = "test-frontend";
  }
  return launchOptions;
};

export default defineConfig({
  video: true,
  videoCompression: 32,
  screenshotOnRunFailure: true,
  screenshotsFolder: "artifacts/cypress/screenshots",
  videosFolder: "artifacts/cypress/videos",
  downloadsFolder: "artifacts/cypress/downloads",
  trashAssetsBeforeRuns: false,
  retries: { runMode: 1, openMode: 0 },
  defaultCommandTimeout: 8_000,
  requestTimeout: 8_000,
  responseTimeout: 12_000,
  reporter: "junit",
  reporterOptions: { mochaFile: "artifacts/cypress/results/results-[hash].xml", toConsole: false },
  env: { maxFailureScreenshots: 20, maxFailureVideos: 10, viewportClass: "desktop" },
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || "http://test-frontend:1991",
    specPattern: "cypress/e2e/**/*.cy.js",
    supportFile: "cypress/support/e2e.js",
    fixturesFolder: "cypress/fixtures",
    setupNodeEvents(on, config) {
      on("before:browser:launch", configureBrowserLaunch);
      on("after:run", () => {
        pruneArtifacts(config.screenshotsFolder, config.env.maxFailureScreenshots);
        pruneArtifacts(config.videosFolder, config.env.maxFailureVideos);
      });
      return config;
    },
  },
});
