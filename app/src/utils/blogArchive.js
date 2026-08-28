import { isArticleLanguageTag } from "./articleDates.js";

const BLOG_SEARCH_LIMIT = 100;
const BLOG_MAX_PAGE = 750599937895083;

const firstQueryValue = (value) => (Array.isArray(value) ? value[0] : value);

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const nonEmptyString = (value) => typeof value === "string" && Boolean(value.trim());

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

export const blogPaginationDisplay = (compact = false) => ({
  input: compact,
  boundaryLinks: false,
  boundaryNumbers: !compact,
  ellipses: !compact,
  maxPages: compact ? 1 : 9,
});

export const blogTagOptions = (payload = {}) =>
  (Array.isArray(payload.items) ? payload.items : [])
    .map((tag) => ({
      label: String(tag?.name || tag?.sys?.id || ""),
      value: String(tag?.sys?.id || ""),
    }))
    .filter((tag) => tag.value && !isArticleLanguageTag(tag.value));

const hasValidArticleTags = (article) => {
  const tags = article.metadata?.tags;

  return tags === undefined || (Array.isArray(tags) && tags.every((tag) => isRecord(tag) && isRecord(tag.sys) && nonEmptyString(tag.sys.id)));
};

const isBlogIndexArticle = (article) =>
  isRecord(article) && isRecord(article.fields) && nonEmptyString(article.fields.title) && nonEmptyString(article.fields.slug) && hasValidArticleTags(article);

export const validateBlogIndexPayload = (payload) => {
  const validCollection = (items, limit) => Array.isArray(items) && items.length <= limit && items.every(isBlogIndexArticle);
  const valid =
    isRecord(payload) &&
    validCollection(payload.featured, 3) &&
    validCollection(payload.items, 12) &&
    Number.isInteger(payload.total) &&
    payload.total >= 0 &&
    Number.isInteger(payload.page) &&
    payload.page >= 1 &&
    payload.pageSize === 12 &&
    Number.isInteger(payload.totalPages) &&
    payload.totalPages >= 1 &&
    payload.page <= payload.totalPages;

  if (!valid) {
    throw new TypeError("Invalid blog index payload");
  }

  return payload;
};

export const validateBlogYearsPayload = (payload) => {
  const years = payload?.years;
  const validYears =
    Array.isArray(years) &&
    years.every((year) => /^(?:19\d{2}|20\d{2}|2100)$/.test(year)) &&
    new Set(years).size === years.length &&
    years.every((year, index) => index === 0 || Number(year) < Number(years[index - 1]));

  if (!isRecord(payload) || !validYears) {
    throw new TypeError("Invalid blog years payload");
  }

  return payload;
};

export const validateBlogArticlePayload = (article) => {
  const fields = article?.fields;
  const authorName = fields?.author?.fields?.name || fields?.author?.name;
  const tags = article?.metadata?.tags;
  const valid =
    isRecord(article) &&
    isRecord(article.sys) &&
    nonEmptyString(article.sys.createdAt) &&
    isRecord(fields) &&
    nonEmptyString(fields.title) &&
    nonEmptyString(fields.slug) &&
    typeof fields.description === "string" &&
    nonEmptyString(fields.body) &&
    nonEmptyString(authorName) &&
    isRecord(article.metadata) &&
    Array.isArray(tags) &&
    tags.every((tag) => nonEmptyString(tag?.sys?.id)) &&
    (fields.locale === undefined || typeof fields.locale === "string") &&
    (fields.createAt === undefined || typeof fields.createAt === "string") &&
    (fields.updatedAt === undefined || typeof fields.updatedAt === "string") &&
    (fields.alt === undefined || typeof fields.alt === "string");

  if (!valid) {
    throw new TypeError("Invalid blog article payload");
  }

  return article;
};

export const validateBlogArticleNavigationPayload = (navigation) => {
  const isNavigationLink = (value) => value === null || (isRecord(value) && nonEmptyString(value.title) && nonEmptyString(value.slug));

  if (!isRecord(navigation) || !isNavigationLink(navigation.previous) || !isNavigationLink(navigation.next)) {
    throw new TypeError("Invalid blog article navigation payload");
  }

  return navigation;
};

export const isCurrentArticleRouteRequest = ({ requestId, currentRequestId, requestedSlug, currentSlug }) =>
  requestId === currentRequestId && String(requestedSlug || "") === String(currentSlug || "");

export const isCurrentArticleNavigationRequest = ({
  requestId,
  currentRequestId,
  articleRequestId,
  currentArticleRequestId,
  requestedSlug,
  currentSlug,
}) =>
  requestId === currentRequestId &&
  articleRequestId === currentArticleRequestId &&
  String(requestedSlug || "") === String(currentSlug || "");

export const blogArticleLocation = (article = {}, currentFullPath = "/blog") => ({
  name: "Artigo",
  params: { slug: article.slug || article.fields?.slug || "" },
  state: { blogReturnTo: currentFullPath },
});

export const blogReturnLocation = (historyState = {}) => {
  const returnTo = historyState?.blogReturnTo;

  return typeof returnTo === "string" && (returnTo === "/blog" || (returnTo.startsWith("/blog?") && !returnTo.includes("#"))) ? returnTo : "/blog";
};

export const articleArchiveTags = (article = {}) => {
  const tags = article.metadata?.tags;

  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .map((tag) => String(tag?.sys?.id || "").trim())
    .filter((tag) => tag && !isArticleLanguageTag(tag));
};
