import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { sanitizeRemoteSmokeArtifacts } from "./sanitize-remote-smoke-artifacts.js";
import { waitForMatchingPreview } from "./wait-for-preview.js";

const CYPRESS_RUNTIME_ENVIRONMENT = ["PATH", "DISPLAY", "CYPRESS_CACHE_FOLDER", "NPM_CONFIG_CACHE", "NODE_ENV"];

export const remoteSmokeEnvironment = (env = {}) => ({
  ...Object.fromEntries(CYPRESS_RUNTIME_ENVIRONMENT.filter((name) => typeof env[name] === "string").map((name) => [name, env[name]])),
  CYPRESS_BASE_URL: env.DEPLOY_PREVIEW_URL,
  DEPLOY_PREVIEW_URL: env.DEPLOY_PREVIEW_URL,
});

export const runRemoteSmoke = async ({ env = process.env, spawnProcess = spawnSync } = {}) => {
  const previewUrl = env.DEPLOY_PREVIEW_URL;
  await waitForMatchingPreview({ previewUrl, expectedCommit: env.EXPECTED_COMMIT_SHA });

  const rawDir = "artifacts/remote-smoke/raw";
  const sanitizedDir = "artifacts/remote-smoke/sanitized";
  rmSync("artifacts/remote-smoke", { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });
  let exitCode = 0;

  try {
    for (const viewportClass of ["desktop", "mobile"]) {
      const result = spawnProcess(
        process.execPath,
        ["node_modules/cypress/bin/cypress", "run", "--config-file", "cypress.remote.config.js", "--browser", "chrome", "--env", `viewportClass=${viewportClass}`],
        { encoding: "utf8", env: remoteSmokeEnvironment(env), maxBuffer: 2 * 1024 * 1024 }
      );
      writeFileSync(`${rawDir}/${viewportClass}.log`, `${result.stdout || ""}${result.stderr || ""}`, "utf8");
      if (result.status !== 0) { exitCode = result.status || 1; break; }
    }
  } finally {
    sanitizeRemoteSmokeArtifacts({ sourceDir: rawDir, outputDir: sanitizedDir, sensitiveValues: [previewUrl] });
    rmSync(rawDir, { recursive: true, force: true });
  }

  return exitCode;
};

const isCli = process.argv[1] === fileURLToPath(import.meta.url);
const executeCli = async () => {
  const xvfb = spawn("Xvfb", [":99", "-screen", "0", "1440x900x24", "-nolisten", "tcp"], { stdio: "ignore" });
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  try {
    const exitCode = await runRemoteSmoke({ env: { ...process.env, DISPLAY: ":99" } });
    console.log(exitCode === 0 ? "Remote smoke completed." : "Remote smoke failed; sanitized diagnostics are available.");
    process.exitCode = exitCode;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    xvfb.kill("SIGTERM");
  }
};

if (isCli) executeCli();
