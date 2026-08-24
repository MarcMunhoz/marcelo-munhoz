export const shouldShowCookieNotice = (route = {}, consentPending = true) =>
  Boolean(consentPending && !route.meta?.requiresAdmin);
