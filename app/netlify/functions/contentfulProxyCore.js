const ARTICLE_LIMIT = 3;
const CONTENTFUL_HOST = "https://cdn.contentful.com";

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
  },
  body: JSON.stringify(payload),
});

const normalizePath = (path = "") => {
  const cleanPath = path.split("?")[0] || "/";
  return cleanPath
    .replace(/^\/api\/contentful\/?/, "/")
    .replace(/^\/\.netlify\/functions\/contentful\/?/, "/")
    .replace(/\/+/g, "/");
};

const firstQueryValue = (value) => (Array.isArray(value) ? value[0] : value);

const pageFromQuery = (query = {}) => {
  const page = Number.parseInt(firstQueryValue(query.page), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
};

const skipFromPage = (page) => (page - 1) * ARTICLE_LIMIT;

const isContentfulLink = (value) => value?.sys?.type === "Link" && value.sys.linkType && value.sys.id;

const buildIncludesMap = (includes = {}) => {
  const map = new Map();

  for (const [linkType, entries] of Object.entries(includes)) {
    for (const entry of entries || []) {
      if (entry?.sys?.id) {
        map.set(`${linkType}:${entry.sys.id}`, entry);
      }
    }
  }

  return map;
};

const resolveLinks = (value, includesMap, seen = new Set()) => {
  if (Array.isArray(value)) {
    return value.map((item) => resolveLinks(item, includesMap, seen));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (isContentfulLink(value)) {
    const key = `${value.sys.linkType}:${value.sys.id}`;
    const linkedEntry = includesMap.get(key);

    if (!linkedEntry || seen.has(key)) {
      return value;
    }

    return resolveLinks(linkedEntry, includesMap, new Set([...seen, key]));
  }

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveLinks(item, includesMap, seen)]));
};

const resolveResponseLinks = (payload) => {
  const includesMap = buildIncludesMap(payload.includes);

  if (includesMap.size === 0) {
    return payload;
  }

  return {
    ...payload,
    items: resolveLinks(payload.items || [], includesMap),
    includes: resolveLinks(payload.includes, includesMap),
  };
};

const contentfulRequest = async ({ env, fetchImpl, resource, query = {} }) => {
  const url = new URL(`${CONTENTFUL_HOST}/spaces/${env.CONTENTFUL_SPACE_ID}/environments/master/${resource}`);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetchImpl(url, {
    headers: {
      authorization: `Bearer ${env.CONTENTFUL_DELIVERY_KEY}`,
    },
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Contentful Delivery API returned ${response.status}`);
  }

  return resource === "entries" ? resolveResponseLinks(payload) : payload;
};

const createRuntimeClient = (env, fetchImpl) => {
  if (!env.CONTENTFUL_SPACE_ID || !env.CONTENTFUL_DELIVERY_KEY) {
    return null;
  }

  if (typeof fetchImpl !== "function") {
    return null;
  }

  return {
    getEntries(query) {
      return contentfulRequest({ env, fetchImpl, resource: "entries", query });
    },
    getTags() {
      return contentfulRequest({ env, fetchImpl, resource: "tags" });
    },
  };
};

export const createContentfulHandler = ({ client, env = process.env, fetchImpl = globalThis.fetch, logger = console } = {}) => {
  const getClient = () => client || createRuntimeClient(env, fetchImpl);

  const runWithClient = async (operation, fallbackError) => {
    const contentfulClient = getClient();

    if (!contentfulClient) {
      logger.error("Contentful runtime configuration is missing");
      return jsonResponse(500, { error: "Server configuration error" });
    }

    try {
      return jsonResponse(200, await operation(contentfulClient));
    } catch (error) {
      logger.error("Contentful proxy request failed:", error?.message || error);
      return jsonResponse(500, { error: fallbackError });
    }
  };

  return async ({ path, query = {} }) => {
    const routePath = normalizePath(path);

    if (routePath === "/entries") {
      return runWithClient(async (contentfulClient) => {
        const page = pageFromQuery(query);

        return contentfulClient.getEntries({
          content_type: "article",
          order: "-sys.createdAt,-fields.createAt",
          limit: ARTICLE_LIMIT,
          skip: skipFromPage(page),
        });
      }, "Failed to fetch content");
    }

    if (routePath === "/tags") {
      return runWithClient((contentfulClient) => contentfulClient.getTags(), "Failed to fetch tags");
    }

    if (routePath === "/tagged") {
      return runWithClient(async (contentfulClient) => {
        const page = pageFromQuery(query);
        const tag = firstQueryValue(query.tag);

        return contentfulClient.getEntries({
          "metadata.tags.sys.id[all]": tag,
          content_type: "article",
          order: "-fields.createAt",
          limit: ARTICLE_LIMIT,
          skip: skipFromPage(page),
        });
      }, "Failed to fetch articles by tag");
    }

    if (routePath.startsWith("/article/")) {
      const contentfulClient = getClient();

      if (!contentfulClient) {
        logger.error("Contentful runtime configuration is missing");
        return jsonResponse(500, { error: "Server configuration error" });
      }

      try {
        const slug = decodeURIComponent(routePath.replace("/article/", ""));
        const entries = await contentfulClient.getEntries({
          content_type: "article",
          "fields.slug": slug,
          limit: 1,
        });

        if (entries.items.length === 0) {
          return jsonResponse(404, { error: "Article not found" });
        }

        return jsonResponse(200, entries.items[0]);
      } catch (error) {
        logger.error("Contentful proxy request failed:", error?.message || error);
        return jsonResponse(500, { error: "Failed to fetch article" });
      }
    }

    return jsonResponse(404, { error: "Not found" });
  };
};

export const contentfulHandler = createContentfulHandler();
