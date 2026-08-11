const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: {
    "content-type": "application/json; charset=utf-8",
  },
  body: JSON.stringify(payload),
});

const CONTENTFUL_MANAGEMENT_HOST = "https://api.contentful.com";
const CONTENTFUL_MANAGEMENT_CONTENT_TYPE = "application/vnd.contentful.management.v1+json";
const DEFAULT_CONTENTFUL_ENVIRONMENT = "master";
const DEFAULT_CONTENTFUL_LOCALE = "en-US";

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

export const sessionFromNetlifyUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    subject: user.sub || user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Authenticated user",
    roles: rolesFromUser(user).filter(Boolean),
  };
};

export const sessionFromNetlifyContext = (event = {}, context = {}) => {
  const user = context.clientContext?.user || event.clientContext?.user;
  return sessionFromNetlifyUser(user);
};

export const hasRole = (session, role) => Boolean(session?.roles?.includes(role));

export const canWriteDrafts = (session) => hasRole(session, "writer") || hasRole(session, "owner");

export const isOwner = (session) => hasRole(session, "owner");

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
  constructor(statusCode) {
    super(`Contentful Management API returned ${statusCode}`);
    this.name = "ContentfulManagementRequestError";
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

const articleFieldsFromData = (data = {}, locale) =>
  definedEntries([
    ["title", localized(data.title, locale)],
    ["slug", localized(data.slug, locale)],
    ["description", localized(data.description, locale)],
    ["body", localized(data.body, locale)],
    ["createAt", localized(data.createAt, locale)],
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

const managementTokenFromEnv = (env) => env.CONTENTFUL_MANAGEMENT_KEY || env.CONTENTFUL_MANAGEMENT_TOKEN;

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

export const createContentfulManagementFacade = ({ env = process.env, fetchImpl = globalThis.fetch } = {}) => {
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
      throw new ContentfulManagementRequestError(response.status);
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
    async updateArticleDraft({ articleId, data }) {
      return request({
        method: "PUT",
        path: articlePath(articleId),
        headers: {
          "x-contentful-version": requiredVersion(data),
        },
        body: articlePayloadFromData(data, env.CONTENTFUL_DEFAULT_LOCALE || DEFAULT_CONTENTFUL_LOCALE),
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
    ...createContentfulManagementFacade({ env, fetchImpl }),
    submitArticleForReview: notImplementedOperation("submitArticleForReview"),
    requestUnpublication: notImplementedOperation("requestUnpublication"),
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
        if (error instanceof ContentfulAdminConfigurationError) {
          logger.error("Contentful admin runtime configuration is missing");
        } else if (!(error instanceof ContentfulVersionConflictError) && !(error instanceof ContentfulAdminNotImplementedError)) {
          logger.error("Contentful admin request failed:", error?.message || error);
        }

        return jsonResponse(error.statusCode, { error: error.publicError });
      }

      logger.error("Contentful admin request failed:", error?.message || error);
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
