import { createClient } from "contentful";

const ARTICLE_LIMIT = 3;

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

const createRuntimeClient = (env) => {
  if (!env.CONTENTFUL_SPACE_ID || !env.CONTENTFUL_DELIVERY_KEY) {
    return null;
  }

  return createClient({
    space: env.CONTENTFUL_SPACE_ID,
    accessToken: env.CONTENTFUL_DELIVERY_KEY,
    environment: "master",
  });
};

export const createContentfulHandler = ({ client, env = process.env, logger = console } = {}) => {
  const getClient = () => client || createRuntimeClient(env);

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
