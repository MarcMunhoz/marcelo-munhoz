const browserMatchMedia = (query) => (typeof globalThis.matchMedia === "function" ? globalThis.matchMedia(query) : null);

export const observeMediaQuery = (query, onChange, { matchMedia = browserMatchMedia } = {}) => {
  const mediaQuery = typeof matchMedia === "function" ? matchMedia(query) : null;

  if (!mediaQuery) {
    onChange(false);
    return () => {};
  }

  const handleChange = (event) => onChange(Boolean(event.matches));
  handleChange(mediaQuery);

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }

  mediaQuery.addListener?.(handleChange);
  return () => mediaQuery.removeListener?.(handleChange);
};
