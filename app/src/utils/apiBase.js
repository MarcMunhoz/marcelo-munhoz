export const normalizeApiBase = (base = "") => {
  if (!base) {
    return "";
  }

  return base.replace(/\/+$/, "");
};

const viteApiEnv = () => ({
  DEV: import.meta.env?.DEV,
  VITE_API_BASE_URL: import.meta.env?.VITE_API_BASE_URL,
});

export const configuredApiBase = (env = viteApiEnv()) => {
  const runtimeEnv = env || {};

  return runtimeEnv.VITE_API_BASE_URL || "";
};

export const buildApiUrl = (path, base = configuredApiBase()) => {
  const normalizedBase = normalizeApiBase(base);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
};
