export const shouldShowCookieNotice = (route = {}, consentPending = true) =>
  Boolean(consentPending && !route.meta?.requiresAdmin);

export const appDocumentTitle = (route = {}) => `Marcelo Munhoz - ${route.meta?.title}` || "Marcelo Munhoz";

export const appMetadata = (route = {}) => ({
  meta: {
    description: {
      name: "description",
      content: "Some brief histories of my past-present development experience. The life, the universe and everything about a tech life",
    },
    robots: {
      name: "robots",
      content: route.meta?.requiresAdmin ? "noindex,nofollow" : "index,follow",
    },
  },
});
