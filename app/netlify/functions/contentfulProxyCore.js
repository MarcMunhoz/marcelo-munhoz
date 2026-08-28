const ARTICLE_LIMIT = 3;
const BLOG_FEATURED_LIMIT = 3;
const BLOG_ARCHIVE_LIMIT = 12;
const BLOG_SEARCH_LIMIT = 100;
const BLOG_YEARS_LIMIT = 1_000;
const BLOG_MAX_PAGE = Math.floor((Number.MAX_SAFE_INTEGER - BLOG_FEATURED_LIMIT) / BLOG_ARCHIVE_LIMIT) + 1;
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
  const pageValue = String(firstQueryValue(query.page) ?? "").trim();
  const page = Number(pageValue);
  return /^\d+$/.test(pageValue) && Number.isSafeInteger(page) && page > 0 && page <= BLOG_MAX_PAGE ? page : 1;
};

const skipFromPage = (page) => (page - 1) * ARTICLE_LIMIT;

const normalizeBlogIndexQuery = (query = {}) => {
  const pageValue = String(firstQueryValue(query.page) ?? "").trim();
  const pageNumber = Number(pageValue);
  const page =
    /^\d+$/.test(pageValue) && Number.isSafeInteger(pageNumber) && pageNumber > 0 && pageNumber <= BLOG_MAX_PAGE ? pageNumber : 1;
  const search = String(firstQueryValue(query.q) ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, BLOG_SEARCH_LIMIT);
  const yearValue = String(firstQueryValue(query.year) ?? "").trim();
  const tagValue = String(firstQueryValue(query.tag) ?? "").trim();
  const year = /^(?:19\d{2}|20\d{2}|2100)$/.test(yearValue) ? yearValue : "";
  const tag = /^[A-Za-z0-9_-]{1,128}$/.test(tagValue) ? tagValue : "";

  return { page, q: search, year, tag };
};

const blogIndexEntriesQuery = ({ q, year, tag, skip }) => {
  const entriesQuery = {
    content_type: "article",
    order: "-fields.createAt,-sys.createdAt",
    limit: BLOG_ARCHIVE_LIMIT,
    skip,
  };

  if (q) {
    entriesQuery.query = q;
  }

  if (year) {
    entriesQuery["fields.createAt[gte]"] = `${year}-01-01T00:00:00.000Z`;
    entriesQuery["fields.createAt[lt]"] = `${Number(year) + 1}-01-01T00:00:00.000Z`;
  }

  if (tag) {
    entriesQuery["metadata.tags.sys.id[all]"] = tag;
  }

  return entriesQuery;
};

const blogFeaturedEntriesQuery = () => ({
  content_type: "article",
  order: "-fields.createAt,-sys.createdAt",
  limit: BLOG_FEATURED_LIMIT,
  skip: 0,
});

const blogYearsEntriesQuery = () => ({
  content_type: "article",
  "fields.createAt[exists]": true,
  select: "fields.createAt",
  order: "-fields.createAt",
  limit: BLOG_YEARS_LIMIT,
  skip: 0,
});

const publishedYearsFromEntries = (entries) => {
  const items = entries?.items;
  const total = entries?.total;

  if (!Array.isArray(items) || !Number.isInteger(total) || total < 0 || total > BLOG_YEARS_LIMIT || items.length !== total) {
    throw new TypeError("Invalid blog years collection");
  }

  const years = items.map((entry) => {
    const createAt = entry?.fields?.createAt;
    const parsedDate = typeof createAt === "string" ? new Date(createAt) : null;
    const year = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.getUTCFullYear() : 0;

    if (year < 1900 || year > 2100) {
      throw new TypeError("Invalid blog publication date");
    }

    return String(year);
  });

  return [...new Set(years)].sort((left, right) => Number(right) - Number(left));
};

const blogArchiveSkip = (page, hasFilters) => (page - 1) * BLOG_ARCHIVE_LIMIT + (hasFilters ? 0 : BLOG_FEATURED_LIMIT);

const numericTotal = (entries = {}) => {
  const total = Number(entries.total);
  return Number.isFinite(total) && total > 0 ? total : 0;
};

const firstEntry = (entries = {}) => (entries.items || [])[0] || null;

const publicArticleLink = (entry) => ({
  title: String(entry.fields?.title || ""),
  slug: String(entry.fields?.slug || ""),
});

const articleChronologyKey = (entry = {}) => ({
  effectiveCreatedAt: String(entry.fields?.createAt || entry.sys?.createdAt || ""),
  systemCreatedAt: String(entry.sys?.createdAt || ""),
});

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const compareArticleChronology = (left, right) => {
  const leftKey = articleChronologyKey(left);
  const rightKey = articleChronologyKey(right);

  return (
    compareText(leftKey.effectiveCreatedAt, rightKey.effectiveCreatedAt) || compareText(leftKey.systemCreatedAt, rightKey.systemCreatedAt)
  );
};

const nearestCandidate = (currentEntry, candidates, direction) => {
  const isPrevious = direction === "previous";
  const eligible = candidates.filter(Boolean).filter((candidate) => {
    const comparison = compareArticleChronology(candidate, currentEntry);
    return isPrevious ? comparison < 0 : comparison > 0;
  });

  return eligible.reduce((nearest, candidate) => {
    if (!nearest) {
      return candidate;
    }

    const comparison = compareArticleChronology(candidate, nearest);
    return isPrevious ? (comparison > 0 ? candidate : nearest) : comparison < 0 ? candidate : nearest;
  }, null);
};

const findDatedNeighborCandidate = async (contentfulClient, currentEntry, direction) => {
  const isPrevious = direction === "previous";
  const effectiveCreatedAt = articleChronologyKey(currentEntry).effectiveCreatedAt;
  const systemCreatedAt = String(currentEntry.sys?.createdAt || "");
  const sysComparison = isPrevious ? "lt" : "gt";
  const sysOrder = isPrevious ? "-sys.createdAt" : "sys.createdAt";
  const sameDateEntries = await contentfulClient.getEntries({
    content_type: "article",
    "fields.createAt": effectiveCreatedAt,
    [`sys.createdAt[${sysComparison}]`]: systemCreatedAt,
    order: sysOrder,
    limit: 1,
  });
  const sameDateNeighbor = firstEntry(sameDateEntries);

  if (sameDateNeighbor) {
    return sameDateNeighbor;
  }

  const editorialComparison = isPrevious ? "lt" : "gt";
  const editorialOrder = isPrevious ? "-fields.createAt,-sys.createdAt" : "fields.createAt,sys.createdAt";
  const adjacentDateEntries = await contentfulClient.getEntries({
    content_type: "article",
    [`fields.createAt[${editorialComparison}]`]: effectiveCreatedAt,
    order: editorialOrder,
    limit: 1,
  });

  return firstEntry(adjacentDateEntries);
};

const findUndatedNeighborCandidates = async (contentfulClient, currentEntry, direction) => {
  const isPrevious = direction === "previous";
  const effectiveCreatedAt = articleChronologyKey(currentEntry).effectiveCreatedAt;
  const isCurrentDated = Boolean(currentEntry.fields?.createAt);
  const strictComparison = isPrevious ? "lt" : "gt";
  const sysOrder = isPrevious ? "-sys.createdAt" : "sys.createdAt";
  const baseQuery = {
    content_type: "article",
    "fields.createAt[exists]": false,
  };
  const queries = [
    {
      ...baseQuery,
      [`sys.createdAt[${strictComparison}]`]: effectiveCreatedAt,
      order: sysOrder,
      limit: 1,
    },
  ];

  if (isCurrentDated) {
    queries.push({
      ...baseQuery,
      "sys.createdAt": effectiveCreatedAt,
      order: sysOrder,
      limit: 1,
    });
  }

  const candidates = [];

  for (const query of queries) {
    candidates.push(firstEntry(await contentfulClient.getEntries(query)));
  }

  return candidates;
};

const findChronologicalNeighbor = async (contentfulClient, currentEntry, direction) => {
  const datedCandidate = await findDatedNeighborCandidate(contentfulClient, currentEntry, direction);
  const undatedCandidates = await findUndatedNeighborCandidates(contentfulClient, currentEntry, direction);

  return nearestCandidate(currentEntry, [datedCandidate, ...undatedCandidates], direction);
};

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

const publicAuthorProfile = (entry = {}) => {
  const fields = entry.fields || {};
  const biography = fields.biography || fields.bio || fields.description;
  const photo = fields.photo || fields.avatar || fields.image || fields.picture;
  const name = fields.name || "";
  const slugFromText = (value = "") =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const textFromNode = (node = {}) => {
    if (typeof node === "string") {
      return node;
    }

    const own = typeof node.value === "string" ? node.value : "";
    const children = Array.isArray(node.content) ? node.content.map(textFromNode).join("") : "";
    return `${own}${children}`;
  };

  return {
    sys: { id: entry.sys?.id || "" },
    fields: {
      name,
      slug: fields.slug || slugFromText(name),
      biography: typeof biography === "string" ? biography : textFromNode(biography).trim(),
      ...(photo ? { photo } : {}),
    },
  };
};

const findAuthorBySlug = async (contentfulClient, slug) => {
  try {
    const authorEntries = await contentfulClient.getEntries({
      content_type: "author",
      "fields.slug": slug,
      limit: 1,
    });

    if ((authorEntries.items || []).length > 0) {
      return authorEntries.items[0];
    }
  } catch {
    // The author content type may not define an optional slug field yet.
  }

  const fallbackAuthorEntries = await contentfulClient.getEntries({
    content_type: "author",
    limit: 100,
  });

  return (fallbackAuthorEntries.items || []).find((entry) => publicAuthorProfile(entry).fields.slug === slug);
};

const entryId = (entry = {}) => String(entry.sys?.id || entry.id || "").trim();

const articleAuthorEntryId = (article = {}) => {
  const author = article.fields?.author || article.author || {};

  if (author.sys?.id) {
    return String(author.sys.id);
  }

  if (author.sys?.type === "Link" && author.sys?.linkType === "Entry") {
    return String(author.sys.id || "");
  }

  return String(article.fields?.authorEntryId || article.authorEntryId || "");
};

const filterArticlesByAuthor = (articles = [], authorId = "") => articles.filter((article) => articleAuthorEntryId(article) === authorId);

const fetchAuthorArticles = async (contentfulClient, authorId) => {
  try {
    const articles = await contentfulClient.getEntries({
      content_type: "article",
      "fields.author.sys.id": authorId,
      order: "-fields.createAt",
      limit: 100,
    });

    return articles.items || [];
  } catch {
    const fallbackArticles = await contentfulClient.getEntries({
      content_type: "article",
      include: 2,
      order: "-fields.createAt",
      limit: 100,
    });

    return filterArticlesByAuthor(fallbackArticles.items || [], authorId);
  }
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

    if (routePath === "/blog-index") {
      return runWithClient(async (contentfulClient) => {
        const normalizedQuery = normalizeBlogIndexQuery(query);
        const hasFilters = Boolean(normalizedQuery.q || normalizedQuery.year || normalizedQuery.tag);
        let page = normalizedQuery.page;
        let featured = [];
        let featuredLoaded = false;

        const fetchFeatured = async () => {
          const featuredEntries = await contentfulClient.getEntries(blogFeaturedEntriesQuery());
          featured = featuredEntries.items || [];
          featuredLoaded = true;
        };

        if (!hasFilters && page === 1) {
          await fetchFeatured();
        }

        const fetchArchive = (archivePage) =>
          contentfulClient.getEntries(
            blogIndexEntriesQuery({
              ...normalizedQuery,
              skip: blogArchiveSkip(archivePage, hasFilters),
            })
          );
        let archiveEntries = await fetchArchive(page);
        const total = Math.max(0, numericTotal(archiveEntries) - (hasFilters ? 0 : BLOG_FEATURED_LIMIT));
        const totalPages = Math.max(1, Math.ceil(total / BLOG_ARCHIVE_LIMIT));

        if (page > totalPages) {
          page = totalPages;

          if (!hasFilters && page === 1 && !featuredLoaded) {
            await fetchFeatured();
          }

          archiveEntries = await fetchArchive(page);
        }

        const featuredIds = new Set(featured.map(entryId).filter(Boolean));
        const items = (archiveEntries.items || []).filter((entry) => !featuredIds.has(entryId(entry)));

        return {
          featured,
          items,
          total,
          page,
          pageSize: BLOG_ARCHIVE_LIMIT,
          totalPages,
        };
      }, "Failed to fetch blog index");
    }

    if (routePath === "/blog-years") {
      return runWithClient(async (contentfulClient) => {
        const entries = await contentfulClient.getEntries(blogYearsEntriesQuery());

        return { years: publishedYearsFromEntries(entries) };
      }, "Failed to fetch blog years");
    }

    if (routePath.startsWith("/article-navigation/")) {
      let slug;

      try {
        slug = decodeURIComponent(routePath.replace("/article-navigation/", ""));
      } catch (error) {
        logger.error("Contentful proxy request failed:", error?.message || error);
        return jsonResponse(500, { error: "Failed to fetch article navigation" });
      }

      if (!slug.trim()) {
        return jsonResponse(404, { error: "Article not found" });
      }

      const contentfulClient = getClient();

      if (!contentfulClient) {
        logger.error("Contentful runtime configuration is missing");
        return jsonResponse(500, { error: "Server configuration error" });
      }

      try {
        const currentEntries = await contentfulClient.getEntries({
          content_type: "article",
          "fields.slug": slug,
          limit: 1,
        });
        const currentEntry = firstEntry(currentEntries);

        if (!currentEntry) {
          return jsonResponse(404, { error: "Article not found" });
        }

        const previousEntry = await findChronologicalNeighbor(contentfulClient, currentEntry, "previous");
        const nextEntry = await findChronologicalNeighbor(contentfulClient, currentEntry, "next");

        return jsonResponse(200, {
          previous: previousEntry ? publicArticleLink(previousEntry) : null,
          next: nextEntry ? publicArticleLink(nextEntry) : null,
        });
      } catch (error) {
        logger.error("Contentful proxy request failed:", error?.message || error);
        return jsonResponse(500, { error: "Failed to fetch article navigation" });
      }
    }

    if (routePath === "/tags") {
      return runWithClient((contentfulClient) => contentfulClient.getTags(), "Failed to fetch tags");
    }

    if (routePath === "/tagged") {
      const tag = String(firstQueryValue(query.tag) ?? "").trim();

      if (!/^[A-Za-z0-9_-]{1,128}$/.test(tag)) {
        return jsonResponse(400, { error: "Invalid tag" });
      }

      return runWithClient(async (contentfulClient) => {
        const page = pageFromQuery(query);

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

    if (routePath.startsWith("/author/")) {
      const contentfulClient = getClient();

      if (!contentfulClient) {
        logger.error("Contentful runtime configuration is missing");
        return jsonResponse(500, { error: "Server configuration error" });
      }

      try {
        const slug = decodeURIComponent(routePath.replace("/author/", ""));
        const authorEntry = await findAuthorBySlug(contentfulClient, slug);

        if (!authorEntry) {
          return jsonResponse(404, { error: "Author not found" });
        }

        const author = publicAuthorProfile(authorEntry);
        const articles = await fetchAuthorArticles(contentfulClient, entryId(author));

        return jsonResponse(200, {
          author,
          articles,
        });
      } catch (error) {
        logger.error("Contentful proxy request failed:", error?.message || error);
        return jsonResponse(500, { error: "Failed to fetch author" });
      }
    }

    return jsonResponse(404, { error: "Not found" });
  };
};

export const contentfulHandler = createContentfulHandler();
