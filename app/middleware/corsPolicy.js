const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1"]);

export const isAllowedCorsOrigin = (origin, { nodeEnv = "", allowedOrigins = [] } = {}) => {
  if (!origin || allowedOrigins.includes(origin)) {
    return true;
  }

  if (nodeEnv !== "development") {
    return false;
  }

  try {
    return loopbackHosts.has(new URL(origin).hostname);
  } catch {
    return false;
  }
};
