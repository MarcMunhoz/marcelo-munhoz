const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const assertReadOnlyRequest = ({ method = "GET" } = {}) => {
  if (!SAFE_METHODS.has(String(method).toUpperCase())) {
    throw new Error("Remote smoke is read-only and blocked a mutating browser request.");
  }
};

const isTelemetryRequest = ({ method = "GET", url = "" } = {}) => {
  if (String(method).toUpperCase() !== "POST") return false;

  try {
    const { hostname, pathname } = new URL(url);
    const googleAnalytics = hostname === "google-analytics.com" || hostname.endsWith(".google-analytics.com");
    const bugsnag = hostname === "bugsnag.com" || hostname.endsWith(".bugsnag.com");
    return (googleAnalytics && pathname === "/g/collect") || bugsnag;
  } catch {
    return false;
  }
};

export const enforceReadOnlyRequest = (request) => {
  if (isTelemetryRequest(request)) {
    request.reply({ statusCode: 204, body: "" });
    return;
  }

  assertReadOnlyRequest(request);
  request.continue();
};
