import { createHash } from "node:crypto";

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
  },
  body: JSON.stringify(payload),
});

const CONTENTFUL_MANAGEMENT_HOST = "https://api.contentful.com";
const CONTENTFUL_MANAGEMENT_CONTENT_TYPE = "application/vnd.contentful.management.v1+json";
const CLOUDINARY_API_HOST = "https://api.cloudinary.com";
const DEFAULT_CONTENTFUL_ENVIRONMENT = "master";
const DEFAULT_CONTENTFUL_LOCALE = "en-US";
const DEFAULT_CLOUDINARY_FOLDER = "marcelo-munhoz-website";

const normalizePath = (path = "") => {
  const cleanPath = path.split("?")[0] || "/";
  return cleanPath
    .replace(/^\/api\/admin\/contentful\/?/, "/")
    .replace(/^\/\.netlify\/functions\/contentful-admin\/?/, "/")
    .replace(/\/+/g, "/");
};

const parseBody = (body) => {
  if (!body) {
    return {};
  }

  if (typeof body === "object") {
    return body;
  }

  return JSON.parse(body);
};

const rolesFromUser = (user = {}) => {
  const roles = user.app_metadata?.roles || user.app_metadata?.role || user.user_metadata?.roles || [];
  return Array.isArray(roles) ? roles : [roles];
};

const authorEntryIdFromUser = (user = {}) =>
  user.app_metadata?.authorEntryId || user.app_metadata?.author_entry_id || user.user_metadata?.authorEntryId || user.user_metadata?.author_entry_id || "";

export const sessionFromNetlifyUser = (user) => {
  if (!user) {
    return null;
  }

  const authorEntryId = authorEntryIdFromUser(user);

  return {
    subject: user.sub || user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Authenticated user",
    roles: rolesFromUser(user).filter(Boolean),
    ...(authorEntryId ? { authorEntryId } : {}),
  };
};

export const sessionFromNetlifyContext = (event = {}, context = {}) => {
  const user = context.clientContext?.user || event.clientContext?.user;
  return sessionFromNetlifyUser(user);
};

export const hasRole = (session, role) => Boolean(session?.roles?.includes(role));

export const canWriteDrafts = (session) => hasRole(session, "writer") || hasRole(session, "owner");

export const isOwner = (session) => hasRole(session, "owner");

export const devPreviewSessionFromHeaders = (headers = {}, { nodeEnv = process.env.NODE_ENV } = {}) => {
  if (nodeEnv !== "development") {
    return null;
  }

  const role = headers["x-admin-preview-role"] || headers["X-Admin-Preview-Role"];

  if (role !== "writer" && role !== "owner") {
    return null;
  }

  return {
    subject: `local-preview-${role}`,
    name: `${role === "owner" ? "Owner" : "Writer"} preview`,
    roles: [role],
    preview: true,
  };
};

export class ContentfulAdminConfigurationError extends Error {
  constructor() {
    super("Contentful admin runtime configuration is missing");
    this.name = "ContentfulAdminConfigurationError";
    this.statusCode = 500;
    this.publicError = "Server configuration error";
  }
}

export class ContentfulVersionConflictError extends Error {
  constructor() {
    super("Contentful version conflict");
    this.name = "ContentfulVersionConflictError";
    this.statusCode = 409;
    this.publicError = "Article changed. Reload before saving.";
  }
}

export class ContentfulManagementRequestError extends Error {
  constructor(statusCode, payload = {}) {
    super(`Contentful Management API returned ${statusCode}`);
    this.name = "ContentfulManagementRequestError";
    this.upstreamStatusCode = statusCode;
    this.upstreamErrorId = typeof payload?.sys?.id === "string" ? payload.sys.id.slice(0, 80) : undefined;
    this.upstreamMessage = typeof payload?.message === "string" ? payload.message.slice(0, 240) : undefined;
    this.statusCode = 500;
    this.publicError = "Admin request failed";
  }
}

export class ContentfulAdminNotImplementedError extends Error {
  constructor(operation) {
    super(`Admin operation not implemented: ${operation}`);
    this.name = "ContentfulAdminNotImplementedError";
    this.statusCode = 501;
    this.publicError = "Admin operation not implemented";
  }
}

export class ContentfulAdminAuthorizationError extends Error {
  constructor(message = "Your account cannot perform this action.") {
    super(message);
    this.name = "ContentfulAdminAuthorizationError";
    this.statusCode = 403;
    this.publicError = message;
  }
}

export class CloudinaryMediaConfigurationError extends Error {
  constructor() {
    super("Cloudinary media runtime configuration is missing");
    this.name = "CloudinaryMediaConfigurationError";
    this.statusCode = 500;
    this.publicError = "Media configuration error";
  }
}

export class CloudinaryMediaRequestError extends Error {
  constructor(statusCode) {
    super(`Cloudinary API returned ${statusCode}`);
    this.name = "CloudinaryMediaRequestError";
    this.statusCode = 500;
    this.publicError = "Media request failed";
  }
}

const logAdminError = (logger, message) => {
  logger?.error?.(message);
};

const localErrorDetails = (error, env = {}) => {
  if (env.NODE_ENV === "production") {
    return {};
  }

  if (error?.name === "ContentfulManagementRequestError" && error.upstreamStatusCode) {
    return {
      details: {
        upstream: "contentful",
        upstreamStatus: error.upstreamStatusCode,
        ...(error.upstreamErrorId ? { id: error.upstreamErrorId } : {}),
        ...(error.upstreamMessage ? { message: error.upstreamMessage } : {}),
      },
    };
  }

  return {};
};

const notImplementedOperation = (operation) => async () => {
  throw new ContentfulAdminNotImplementedError(operation);
};

const contentfulLink = (linkType, id) => ({
  sys: {
    type: "Link",
    linkType,
    id,
  },
});

const localized = (value, locale) => (value === undefined ? undefined : { [locale]: value });

const definedEntries = (entries) => Object.fromEntries(entries.filter(([, value]) => value !== undefined));

const tagsFromIds = (tags = []) => tags.map((id) => contentfulLink("Tag", id));

const thumbnailFromData = (data = {}) => data.thumbnail || (Array.isArray(data.cloudinary) ? data.cloudinary[0] : undefined);

const firstLocalizedValue = (fields = {}, fieldId, locale) => {
  const value = fields[fieldId];

  if (!value || typeof value !== "object") {
    return value;
  }

  if (Object.prototype.hasOwnProperty.call(value, locale)) {
    return value[locale];
  }

  return Object.values(value)[0];
};

const articleFieldsFromData = (data = {}, locale) =>
  definedEntries([
    ["title", localized(data.title, locale)],
    ["slug", localized(data.slug, locale)],
    ["description", localized(data.description, locale)],
    ["body", localized(data.body, locale)],
    ["createAt", localized(data.createAt, locale)],
    ["thumbnail", localized(thumbnailFromData(data), locale)],
    ["alt", localized(data.alt, locale)],
    ["author", data.author ? localized(contentfulLink("Entry", data.author), locale) : undefined],
    ["cloudinary", Array.isArray(data.cloudinary) ? localized(data.cloudinary, locale) : undefined],
  ]);

const articlePayloadFromData = (data = {}, locale) => {
  if (data.fields) {
    return {
      fields: data.fields,
      ...(data.metadata ? { metadata: data.metadata } : {}),
    };
  }

  return {
    fields: articleFieldsFromData(data, locale),
    ...(Array.isArray(data.tags) ? { metadata: { tags: tagsFromIds(data.tags) } } : {}),
  };
};

const editorialRequestPayloadFromData = ({ requestType, articleId, session = {}, now, locale }) => ({
  fields: definedEntries([
    ["requestType", localized(requestType, locale)],
    ["status", localized("readyForReview", locale)],
    ["article", localized(contentfulLink("Entry", articleId), locale)],
    ["writerSubject", localized(session.subject, locale)],
    ["writerName", localized(session.name || "Writer", locale)],
    ["createdAt", localized(now, locale)],
    ["updatedAt", localized(now, locale)],
  ]),
});

const managementTokenFromEnv = (env) => env.CONTENTFUL_MANAGEMENT_KEY || env.CONTENTFUL_MANAGEMENT_TOKEN;

const cloudinaryFolderFromEnv = (env = {}) => env.CLOUDINARY_UPLOAD_FOLDER || env.CLOUDINARY_FOLDER || DEFAULT_CLOUDINARY_FOLDER;

const cloudinaryConfigFromEnv = (env = {}, fetchImpl) => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET || typeof fetchImpl !== "function") {
    throw new CloudinaryMediaConfigurationError();
  }

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
    folder: cloudinaryFolderFromEnv(env),
  };
};

const managementConfigFromEnv = (env = {}, fetchImpl) => {
  const token = managementTokenFromEnv(env);

  if (!env.CONTENTFUL_SPACE_ID || !token || typeof fetchImpl !== "function") {
    throw new ContentfulAdminConfigurationError();
  }

  return {
    spaceId: env.CONTENTFUL_SPACE_ID,
    environmentId: env.CONTENTFUL_ENVIRONMENT_ID || DEFAULT_CONTENTFUL_ENVIRONMENT,
    locale: env.CONTENTFUL_DEFAULT_LOCALE || DEFAULT_CONTENTFUL_LOCALE,
    token,
  };
};

const requiredVersion = (data = {}) => {
  const version = data.version;

  if (!Number.isInteger(Number(version)) || Number(version) <= 0) {
    throw new ContentfulVersionConflictError();
  }

  return String(version);
};

const readJson = async (response) => {
  if (response.status === 204) {
    return {};
  }

  try {
    return await response.json();
  } catch {
    return {};
  }
};

const safeMaxResults = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 100) : 24;
};

const basicAuth = (apiKey, apiSecret) => `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`;

const signedParams = (params = {}, apiSecret) => {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");
};

const normalizeCloudinaryAsset = (asset = {}) => ({
  public_id: asset.public_id,
  secure_url: asset.secure_url || asset.url,
  url: asset.secure_url || asset.url,
  width: asset.width,
  height: asset.height,
  format: asset.format,
  created_at: asset.created_at,
});

const normalizedTags = (metadata = {}) => (metadata.tags || []).map((tag) => tag?.sys?.id).filter(Boolean);

const contentTypeIdFromEntry = (entry = {}) => entry.sys?.contentType?.sys?.id || "";

const normalizedEntryStatus = (sys = {}) => {
  if (sys.archivedVersion) {
    return "archived";
  }

  if (sys.publishedVersion) {
    return "published";
  }

  return "draft";
};

const entryId = (entry = {}) => entry.sys?.id || "";

const contentfulLinkId = (value = {}) => (value?.sys?.type === "Link" && value?.sys?.linkType === "Entry" ? value.sys.id : "");

const entriesById = (entries = []) => new Map(entries.map((entry) => [entryId(entry), entry]).filter(([id]) => id));

const resolvedEntry = (value, entryMap = new Map()) => entryMap.get(contentfulLinkId(value)) || value;

const linkedAuthorIdFromArticle = (entry = {}, locale) => contentfulLinkId(firstLocalizedValue(entry.fields || {}, "author", locale));

const normalizedAuthor = (author, locale) => {
  const fields = author?.fields || {};
  const name = firstLocalizedValue(fields, "name", locale);

  return {
    author: name || author?.sys?.id || "",
    authorEntryId: author?.sys?.id || "",
  };
};

const normalizedArticle = (entry = {}, locale, entryMap = new Map()) => {
  const fields = entry.fields || {};
  const authorData = normalizedAuthor(resolvedEntry(firstLocalizedValue(fields, "author", locale), entryMap), locale);

  return {
    id: entry.sys?.id || "",
    title: firstLocalizedValue(fields, "title", locale) || "",
    slug: firstLocalizedValue(fields, "slug", locale) || "",
    description: firstLocalizedValue(fields, "description", locale) || "",
    body: firstLocalizedValue(fields, "body", locale) || "",
    createAt: firstLocalizedValue(fields, "createAt", locale) || entry.sys?.createdAt || "",
    thumbnail: firstLocalizedValue(fields, "thumbnail", locale) || firstLocalizedValue(fields, "cloudinary", locale)?.[0],
    alt: firstLocalizedValue(fields, "alt", locale) || "",
    ...authorData,
    writerSubject: firstLocalizedValue(fields, "writerSubject", locale) || "",
    tags: normalizedTags(entry.metadata),
    status: normalizedEntryStatus(entry.sys),
    version: entry.sys?.version || null,
    updatedAt: entry.sys?.updatedAt || "",
  };
};

const sessionOwnsArticle = (article = {}, session = {}) =>
  Boolean(
    (article.writerSubject && session.subject && article.writerSubject === session.subject) ||
      (article.authorEntryId && session.authorEntryId && article.authorEntryId === session.authorEntryId)
  );

const ensureCanEditArticle = (article = {}, session = {}) => {
  if (!sessionOwnsArticle(article, session)) {
    throw new ContentfulAdminAuthorizationError("Your account cannot edit this article.");
  }
};

const normalizedEditorialRequest = (entry = {}, locale) => {
  const fields = entry.fields || {};

  return {
    id: entry.sys?.id || "",
    articleId: firstLocalizedValue(fields, "article", locale)?.sys?.id || "",
    requestType: firstLocalizedValue(fields, "requestType", locale) || "",
    status: firstLocalizedValue(fields, "status", locale) || "",
    writerSubject: firstLocalizedValue(fields, "writerSubject", locale) || "",
    writerName: firstLocalizedValue(fields, "writerName", locale) || "",
    createdAt: firstLocalizedValue(fields, "createdAt", locale) || entry.sys?.createdAt || "",
    version: entry.sys?.version || null,
  };
};

const openReviewRequest = (request = {}) => request.status === "readyForReview";

const statusFromRequest = (request = {}) => {
  if (!openReviewRequest(request)) {
    return null;
  }

  if (request.requestType === "publication") {
    return "review";
  }

  if (request.requestType === "unpublication") {
    return "unpublicationRequested";
  }

  return null;
};

const summarizeAdminArticles = (articles = []) =>
  articles.reduce(
    (summary, article) => {
      if (article.status === "published") {
        summary.published += 1;
      } else if (article.status === "draft" || article.status === "unpublished" || article.status === "unpublicationRequested") {
        summary.drafts += 1;
      } else if (article.status === "review") {
        summary.review += 1;
      } else if (article.status === "archived") {
        summary.archived += 1;
      }

      summary.total += 1;
      return summary;
    },
    { published: 0, drafts: 0, review: 0, archived: 0, total: 0 }
  );

const requestByArticleId = (requests = []) => {
  const index = new Map();

  for (const request of requests) {
    if (!request.articleId || !openReviewRequest(request)) {
      continue;
    }

    if (!index.has(request.articleId)) {
      index.set(request.articleId, request);
    }
  }

  return index;
};

export const createCloudinaryMediaFacade = ({ env = process.env, fetchImpl = globalThis.fetch, nowTimestamp = () => Math.floor(Date.now() / 1000) } = {}) => {
  const readCloudinaryJson = async (response) => {
    const payload = await readJson(response);

    if (!response.ok) {
      throw new CloudinaryMediaRequestError(response.status);
    }

    return payload;
  };

  return {
    async listMedia({ query = {} } = {}) {
      const config = cloudinaryConfigFromEnv(env, fetchImpl);
      const url = new URL(`${CLOUDINARY_API_HOST}/v1_1/${config.cloudName}/resources/image/upload`);
      url.searchParams.set("prefix", config.folder);
      url.searchParams.set("max_results", String(safeMaxResults(query.max_results)));

      const payload = await readCloudinaryJson(
        await fetchImpl(url, {
          method: "GET",
          headers: {
            authorization: basicAuth(config.apiKey, config.apiSecret),
          },
        })
      );

      return {
        assets: (payload.resources || []).map(normalizeCloudinaryAsset),
        ...(payload.next_cursor ? { next_cursor: payload.next_cursor } : {}),
      };
    },
    async uploadMedia({ data = {} } = {}) {
      const config = cloudinaryConfigFromEnv(env, fetchImpl);

      if (!data.file || !String(data.file).startsWith("data:")) {
        throw new CloudinaryMediaRequestError(422);
      }

      const timestamp = String(nowTimestamp());
      const uploadParams = {
        folder: config.folder,
        timestamp,
        unique_filename: "true",
        use_filename: "true",
      };
      const form = new FormData();
      form.set("file", data.file);
      form.set("folder", uploadParams.folder);
      form.set("timestamp", uploadParams.timestamp);
      form.set("unique_filename", uploadParams.unique_filename);
      form.set("use_filename", uploadParams.use_filename);
      form.set("api_key", config.apiKey);
      form.set("signature", signedParams(uploadParams, config.apiSecret));

      const payload = await readCloudinaryJson(
        await fetchImpl(`${CLOUDINARY_API_HOST}/v1_1/${config.cloudName}/image/upload`, {
          method: "POST",
          body: form,
        })
      );

      return {
        asset: normalizeCloudinaryAsset(payload),
      };
    },
  };
};

export const createContentfulManagementFacade = ({ env = process.env, fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) => {
  const request = async ({ method, path, body, headers = {} }) => {
    const config = managementConfigFromEnv(env, fetchImpl);
    const url = new URL(`${CONTENTFUL_MANAGEMENT_HOST}/spaces/${config.spaceId}/environments/${config.environmentId}${path}`);

    const response = await fetchImpl(url, {
      method,
      headers: {
        authorization: `Bearer ${config.token}`,
        "content-type": CONTENTFUL_MANAGEMENT_CONTENT_TYPE,
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const payload = await readJson(response);

    if (response.status === 409) {
      throw new ContentfulVersionConflictError();
    }

    if (!response.ok) {
      throw new ContentfulManagementRequestError(response.status, payload);
    }

    return payload;
  };

  const articlePath = (articleId) => `/entries/${encodeURIComponent(articleId)}`;

  return {
    async createArticleDraft({ data }) {
      const config = managementConfigFromEnv(env, fetchImpl);

      return request({
        method: "POST",
        path: "/entries",
        headers: {
          "x-contentful-content-type": "article",
        },
        body: articlePayloadFromData(data, config.locale),
      });
    },
    async listAdminArticles({ session } = {}) {
      const config = managementConfigFromEnv(env, fetchImpl);
      const entryParams = new URLSearchParams({
        limit: "100",
      });
      const entryPayload = await request({ method: "GET", path: `/entries?${entryParams}` });
      const entries = entryPayload.items || [];
      const entryMap = entriesById(entries);
      const articleEntries = entries.filter((entry) => contentTypeIdFromEntry(entry) === "article");
      const missingAuthorIds = [
        ...new Set(articleEntries.map((entry) => linkedAuthorIdFromArticle(entry, config.locale)).filter((authorId) => authorId && !entryMap.has(authorId))),
      ];

      const linkedAuthors = await Promise.all(missingAuthorIds.map((authorId) => request({ method: "GET", path: articlePath(authorId) })));
      linkedAuthors.forEach((entry) => {
        if (entryId(entry)) {
          entryMap.set(entryId(entry), entry);
        }
      });
      const workflowEntries = entries.filter((entry) => contentTypeIdFromEntry(entry) === "blogEditorialRequest");
      const allReviewRequests = workflowEntries.map((entry) => normalizedEditorialRequest(entry, config.locale));
      const reviewRequests = allReviewRequests.filter((request) => isOwner(session) || request.writerSubject === session?.subject);
      const requestsByArticle = requestByArticleId(reviewRequests);
      const articles = articleEntries
        .map((entry) => {
          const article = normalizedArticle(entry, config.locale, entryMap);
          const request = requestsByArticle.get(article.id);
          const requestStatus = statusFromRequest(request);

          return {
            ...article,
            ...(requestStatus ? { status: requestStatus } : {}),
            ...(request?.id ? { requestId: request.id } : {}),
            ...(request?.writerSubject ? { writerSubject: request.writerSubject } : {}),
            ...(request?.writerName ? { writerName: request.writerName } : {}),
          };
        })
        .filter((article) => isOwner(session) || article.status === "published" || article.writerSubject === session?.subject);

      return {
        articles,
        summary: summarizeAdminArticles(articles),
        reviewRequests,
      };
    },
    async updateArticleDraft({ articleId, data, session }) {
      const config = managementConfigFromEnv(env, fetchImpl);
      const version = requiredVersion(data);
      const existingEntry = await request({ method: "GET", path: articlePath(articleId) });
      ensureCanEditArticle(normalizedArticle(existingEntry, config.locale), session);

      return request({
        method: "PUT",
        path: articlePath(articleId),
        headers: {
          "x-contentful-version": version,
        },
        body: articlePayloadFromData(data, config.locale),
      });
    },
    async publishArticle({ articleId, data }) {
      return request({
        method: "PUT",
        path: `${articlePath(articleId)}/published`,
        headers: {
          "x-contentful-version": requiredVersion(data),
        },
      });
    },
    async unpublishArticle({ articleId, data }) {
      return request({
        method: "DELETE",
        path: `${articlePath(articleId)}/published`,
        headers: {
          "x-contentful-version": requiredVersion(data),
        },
      });
    },
    async archiveArticle({ articleId, data }) {
      return request({
        method: "PUT",
        path: `${articlePath(articleId)}/archived`,
        headers: {
          "x-contentful-version": requiredVersion(data),
        },
      });
    },
    async deleteArticle({ articleId, data }) {
      return request({
        method: "DELETE",
        path: articlePath(articleId),
        headers: {
          "x-contentful-version": requiredVersion(data),
        },
      });
    },
    async submitArticleForReview({ articleId, session }) {
      const config = managementConfigFromEnv(env, fetchImpl);

      return request({
        method: "POST",
        path: "/entries",
        headers: {
          "x-contentful-content-type": "blogEditorialRequest",
        },
        body: editorialRequestPayloadFromData({
          requestType: "publication",
          articleId,
          session,
          now: now(),
          locale: config.locale,
        }),
      });
    },
    async requestUnpublication({ articleId, session }) {
      const config = managementConfigFromEnv(env, fetchImpl);

      return request({
        method: "POST",
        path: "/entries",
        headers: {
          "x-contentful-content-type": "blogEditorialRequest",
        },
        body: editorialRequestPayloadFromData({
          requestType: "unpublication",
          articleId,
          session,
          now: now(),
          locale: config.locale,
        }),
      });
    },
  };
};

const articleIdFromPath = (routePath, suffix = "") => decodeURIComponent(routePath.replace(/^\/articles\//, "").replace(suffix, ""));

export const createContentfulAdminHandler = ({
  getSession = () => null,
  operations = {},
  env = process.env,
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) => {
  const adminOperations = {
    submitArticleForReview: notImplementedOperation("submitArticleForReview"),
    requestUnpublication: notImplementedOperation("requestUnpublication"),
    ...createContentfulManagementFacade({ env, fetchImpl }),
    ...createCloudinaryMediaFacade({ env, fetchImpl }),
    ...operations,
  };

  const runAdminOperation = async ({ session, role, operation, payload }) => {
    if (!session) {
      return jsonResponse(401, { error: "Authentication required" });
    }

    if (role === "owner" && !isOwner(session)) {
      return jsonResponse(403, { error: "Owner role required" });
    }

    if (role === "writer" && !canWriteDrafts(session)) {
      return jsonResponse(403, { error: "Writer role required" });
    }

    try {
      return jsonResponse(200, await operation({ ...payload, session }));
    } catch (error) {
      if (error?.publicError && error?.statusCode) {
        if (error instanceof ContentfulAdminConfigurationError || error instanceof CloudinaryMediaConfigurationError) {
          logAdminError(logger, "Admin runtime configuration is missing");
        } else if (!(error instanceof ContentfulVersionConflictError) && !(error instanceof ContentfulAdminNotImplementedError)) {
          logAdminError(logger, "Contentful admin request failed");
        }

        return jsonResponse(error.statusCode, { error: error.publicError, ...localErrorDetails(error, env) });
      }

      logAdminError(logger, "Contentful admin request failed");
      return jsonResponse(500, { error: "Admin request failed" });
    }
  };

  return async ({ method = "GET", path, query = {}, headers = {}, body, context } = {}) => {
    const routePath = normalizePath(path);
    const requestMethod = method.toUpperCase();
    const session = await getSession({ method: requestMethod, path: routePath, query, headers, context });

    let data;
    try {
      data = parseBody(body);
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    if (requestMethod === "POST" && routePath === "/articles") {
      return runAdminOperation({
        session,
        role: "writer",
        operation: adminOperations.createArticleDraft,
        payload: { data },
      });
    }

    if (requestMethod === "GET" && routePath === "/articles") {
      return runAdminOperation({
        session,
        role: "writer",
        operation: adminOperations.listAdminArticles,
        payload: { query },
      });
    }

    if (requestMethod === "GET" && routePath === "/media/assets") {
      return runAdminOperation({
        session,
        role: "writer",
        operation: adminOperations.listMedia,
        payload: { query },
      });
    }

    if (requestMethod === "POST" && routePath === "/media/upload") {
      return runAdminOperation({
        session,
        role: "writer",
        operation: adminOperations.uploadMedia,
        payload: { data },
      });
    }

    if ((requestMethod === "PUT" || requestMethod === "PATCH") && routePath.startsWith("/articles/")) {
      return runAdminOperation({
        session,
        role: "writer",
        operation: adminOperations.updateArticleDraft,
        payload: { articleId: articleIdFromPath(routePath), data },
      });
    }

    if (requestMethod === "POST" && routePath.endsWith("/submit")) {
      return runAdminOperation({
        session,
        role: "writer",
        operation: adminOperations.submitArticleForReview,
        payload: { articleId: articleIdFromPath(routePath, "/submit"), data },
      });
    }

    if (requestMethod === "POST" && routePath.endsWith("/unpublication-requests")) {
      return runAdminOperation({
        session,
        role: "writer",
        operation: adminOperations.requestUnpublication,
        payload: { articleId: articleIdFromPath(routePath, "/unpublication-requests"), data },
      });
    }

    if (requestMethod === "POST" && routePath.endsWith("/publish")) {
      return runAdminOperation({
        session,
        role: "owner",
        operation: adminOperations.publishArticle,
        payload: { articleId: articleIdFromPath(routePath, "/publish"), data },
      });
    }

    if (requestMethod === "POST" && routePath.endsWith("/unpublish")) {
      return runAdminOperation({
        session,
        role: "owner",
        operation: adminOperations.unpublishArticle,
        payload: { articleId: articleIdFromPath(routePath, "/unpublish"), data },
      });
    }

    if (requestMethod === "POST" && routePath.endsWith("/archive")) {
      return runAdminOperation({
        session,
        role: "owner",
        operation: adminOperations.archiveArticle,
        payload: { articleId: articleIdFromPath(routePath, "/archive"), data },
      });
    }

    if (requestMethod === "DELETE" && routePath.startsWith("/articles/")) {
      return runAdminOperation({
        session,
        role: "owner",
        operation: adminOperations.deleteArticle,
        payload: { articleId: articleIdFromPath(routePath), data },
      });
    }

    return jsonResponse(404, { error: "Not found" });
  };
};

export const contentfulAdminHandler = createContentfulAdminHandler({
  getSession({ context }) {
    return context?.session || null;
  },
});
