const BLOG_SEARCH_LIMIT = 100;
const BLOG_MAX_PAGE = 750599937895083;

const firstQueryValue = (value) => (Array.isArray(value) ? value[0] : value);

export const normalizeBlogRouteQuery = (query = {}) => {
  const pageValue = String(firstQueryValue(query.page) ?? "").trim();
  const pageNumber = Number(pageValue);
  const page =
    /^\d+$/.test(pageValue) && Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= BLOG_MAX_PAGE ? pageNumber : 1;
  const q = String(firstQueryValue(query.q) ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, BLOG_SEARCH_LIMIT);
  const yearValue = String(firstQueryValue(query.year) ?? "").trim();
  const tagValue = String(firstQueryValue(query.tag) ?? "").trim();
  const year = /^(?:19\d{2}|20\d{2}|2100)$/.test(yearValue) ? yearValue : "";
  const tag = /^[A-Za-z0-9_-]{1,128}$/.test(tagValue) ? tagValue : "";

  return { page, q, year, tag };
};

export const blogRouteQuery = (state = {}) => {
  const { page, q, year, tag } = normalizeBlogRouteQuery(state);
  const query = {};

  if (page > 1) {
    query.page = String(page);
  }

  if (q) {
    query.q = q;
  }

  if (year) {
    query.year = year;
  }

  if (tag) {
    query.tag = tag;
  }

  return query;
};

export const blogArticleLocation = (article = {}, currentFullPath = "/blog") => ({
  name: "Artigo",
  params: { slug: article.slug || article.fields?.slug || "" },
  state: { blogReturnTo: currentFullPath },
});

export const blogReturnLocation = (historyState = {}) => {
  const returnTo = historyState?.blogReturnTo;

  return typeof returnTo === "string" && (returnTo === "/blog" || (returnTo.startsWith("/blog?") && !returnTo.includes("#"))) ? returnTo : "/blog";
};
