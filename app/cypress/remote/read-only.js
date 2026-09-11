const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const assertReadOnlyRequest = ({ method = "GET" } = {}) => {
  if (!SAFE_METHODS.has(String(method).toUpperCase())) {
    throw new Error("Remote smoke is read-only and blocked a mutating browser request.");
  }
};
