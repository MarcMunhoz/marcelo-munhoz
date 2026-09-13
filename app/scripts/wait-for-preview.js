import { fileURLToPath } from "node:url";
import { normalizeCommitSha } from "./write-build-identity.js";

const DEFAULT_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_INTERVAL_MS = 5_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

const validatedPreviewOrigin = (value) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Deploy Preview URL must be a valid HTTPS origin.");
  }
  if (url.protocol !== "https:") throw new Error("Deploy Preview URL must use HTTPS.");
  if (url.username || url.password) throw new Error("Deploy Preview URL must not contain credentials.");
  if (url.pathname !== "/" || url.search || url.hash) throw new Error("Deploy Preview URL must contain only an origin.");
  return url.origin;
};

const boundedMilliseconds = (value, fallback, maximum) => {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number <= 0 || number > maximum) throw new Error("Preview readiness timing is outside the allowed bounds.");
  return number;
};

export const waitForMatchingPreview = async ({
  previewUrl,
  expectedCommit,
  fetchImpl = fetch,
  now = Date.now,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  timeoutMs = DEFAULT_TIMEOUT_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
} = {}) => {
  const origin = validatedPreviewOrigin(previewUrl);
  const commit = normalizeCommitSha(expectedCommit);
  const timeout = boundedMilliseconds(timeoutMs, DEFAULT_TIMEOUT_MS, 10 * 60_000);
  const interval = boundedMilliseconds(intervalMs, DEFAULT_INTERVAL_MS, 30_000);
  const requestTimeout = boundedMilliseconds(requestTimeoutMs, DEFAULT_REQUEST_TIMEOUT_MS, 30_000);
  const deadline = now() + timeout;
  const markerUrl = `${origin}/.well-known/build-identity.json`;

  while (now() < deadline) {
    try {
      const response = await fetchImpl(markerUrl, {
        method: "GET",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(requestTimeout),
      });
      const contentType = response.headers?.get?.("content-type") || "";
      if (response.status === 200 && /^application\/json\b/i.test(contentType)) {
        const identity = await response.json();
        if (identity && Object.keys(identity).length === 1 && normalizeCommitSha(identity.commit) === commit) {
          return { commit };
        }
      }
    } catch {
      // Readiness is intentionally retried until the fixed deadline.
    }
    await sleep(Math.min(interval, Math.max(0, deadline - now())));
  }

  throw new Error("Deploy Preview did not expose the expected build before the readiness deadline.");
};

export const executeWaitForPreviewCli = async ({ env = process.env, log = console.log } = {}) => {
  const result = await waitForMatchingPreview({
    previewUrl: env.DEPLOY_PREVIEW_URL,
    expectedCommit: env.EXPECTED_COMMIT_SHA,
    timeoutMs: env.PREVIEW_TIMEOUT_MS,
    intervalMs: env.PREVIEW_INTERVAL_MS,
    requestTimeoutMs: env.PREVIEW_REQUEST_TIMEOUT_MS,
  });
  log(`Deploy Preview build identity matched commit ${result.commit.slice(0, 12)}.`);
  return result;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  executeWaitForPreviewCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
