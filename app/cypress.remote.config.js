import { defineConfig } from "cypress";

const validateBaseUrl = (value) => {
  let url;
  try { url = new URL(value); } catch { throw new Error("Remote smoke requires a valid Deploy Preview HTTPS origin."); }
  if (url.protocol !== "https:") throw new Error("Remote smoke requires HTTPS.");
  if (url.username || url.password) throw new Error("Remote smoke URL must not contain credentials.");
  if (url.pathname !== "/" || url.search || url.hash) throw new Error("Remote smoke URL must contain only an origin.");
  return url.origin;
};

export const createRemoteCypressConfig = ({ baseUrl } = {}) => ({
  video: false,
  screenshotOnRunFailure: false,
  trashAssetsBeforeRuns: true,
  retries: { runMode: 0, openMode: 0 },
  defaultCommandTimeout: 10_000,
  requestTimeout: 10_000,
  responseTimeout: 20_000,
  reporter: "junit",
  reporterOptions: { mochaFile: "artifacts/remote-smoke/raw/results-[hash].xml", toConsole: false },
  e2e: {
    baseUrl: validateBaseUrl(baseUrl),
    specPattern: "cypress/remote/**/*.cy.js",
    supportFile: "cypress/remote/support.js",
    fixturesFolder: false,
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.name !== "chrome") throw new Error("Remote smoke must run in Chrome.");
        return launchOptions;
      });
      return config;
    },
  },
});

const configuredBaseUrl = process.env.DEPLOY_PREVIEW_URL;
export default defineConfig(configuredBaseUrl ? createRemoteCypressConfig({ baseUrl: configuredBaseUrl }) : { e2e: { setupNodeEvents() { throw new Error("DEPLOY_PREVIEW_URL is required."); } } });
