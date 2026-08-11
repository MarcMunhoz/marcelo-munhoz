import { buildApiUrl } from "./apiBase.js";

const ADMIN_ARTICLES_PATH = "/api/admin/contentful/articles";
const ADMIN_MEDIA_PATH = "/media/assets";

const parseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

export class AdminApiError extends Error {
  constructor(status, payload = {}) {
    super(payload.error || "Admin request failed");
    this.name = "AdminApiError";
    this.status = status;
    this.payload = payload;
  }
}

export const adminUserMessage = (error, { media = false } = {}) => {
  if (!(error instanceof AdminApiError)) {
    return media ? "Media request failed." : "The admin request could not be completed.";
  }

  if (error.status === 401) {
    return media ? "Sign in again before selecting media." : "Sign in again before saving.";
  }

  if (error.status === 403) {
    return media ? "Your account cannot select media." : "Your account cannot perform this action.";
  }

  if (!media && error.status === 409) {
    return "This article changed elsewhere. Reload before saving.";
  }

  if (!media && (error.status === 422 || /media/i.test(error.message))) {
    return "The media selection could not be saved. Select the image again.";
  }

  return media ? "Media request failed." : "The admin request could not be completed.";
};

export const adminRequest = async ({ path, method = "GET", body, session, fetchImpl = fetch }) => {
  const headers = {
    "content-type": "application/json",
  };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  if (session?.preview) {
    const previewRole = session.roles?.includes("owner") ? "owner" : "writer";
    headers["x-admin-preview-role"] = previewRole;
  }

  const response = await fetchImpl(buildApiUrl(`/api/admin/contentful${path}`), {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const payload = await parseJson(response);

  if (!response.ok) {
    throw new AdminApiError(response.status, payload);
  }

  return payload;
};

export const createArticleDraft = ({ article, session, fetchImpl }) =>
  adminRequest({
    path: ADMIN_ARTICLES_PATH.replace("/api/admin/contentful", ""),
    method: "POST",
    body: article,
    session,
    fetchImpl,
  });

export const listAdminArticles = ({ session, fetchImpl } = {}) =>
  adminRequest({
    path: ADMIN_ARTICLES_PATH.replace("/api/admin/contentful", ""),
    session,
    fetchImpl,
  });

export const updateArticleDraft = ({ articleId, article, session, fetchImpl }) =>
  adminRequest({
    path: `/articles/${encodeURIComponent(articleId)}`,
    method: "PUT",
    body: article,
    session,
    fetchImpl,
  });

export const submitArticleForReview = ({ articleId, version, notes, session, fetchImpl }) =>
  adminRequest({
    path: `/articles/${encodeURIComponent(articleId)}/submit`,
    method: "POST",
    body: { version, notes },
    session,
    fetchImpl,
  });

export const requestArticleUnpublication = ({ articleId, version, notes, session, fetchImpl }) =>
  adminRequest({
    path: `/articles/${encodeURIComponent(articleId)}/unpublication-requests`,
    method: "POST",
    body: { version, notes },
    session,
    fetchImpl,
  });

export const listMediaAssets = ({ session, maxResults = 24, fetchImpl } = {}) =>
  adminRequest({
    path: `${ADMIN_MEDIA_PATH}?max_results=${encodeURIComponent(maxResults)}`,
    session,
    fetchImpl,
  });

export const uploadMediaAsset = ({ file, filename, session, fetchImpl }) =>
  adminRequest({
    path: "/media/upload",
    method: "POST",
    body: { file, filename },
    session,
    fetchImpl,
  });

export const publishArticle = ({ articleId, version, session, fetchImpl }) =>
  adminRequest({
    path: `/articles/${encodeURIComponent(articleId)}/publish`,
    method: "POST",
    body: { version },
    session,
    fetchImpl,
  });

export const unpublishArticle = ({ articleId, version, session, fetchImpl }) =>
  adminRequest({
    path: `/articles/${encodeURIComponent(articleId)}/unpublish`,
    method: "POST",
    body: { version },
    session,
    fetchImpl,
  });

export const archiveArticle = ({ articleId, version, session, fetchImpl }) =>
  adminRequest({
    path: `/articles/${encodeURIComponent(articleId)}/archive`,
    method: "POST",
    body: { version },
    session,
    fetchImpl,
  });

export const deleteArticle = ({ articleId, version, session, fetchImpl }) =>
  adminRequest({
    path: `/articles/${encodeURIComponent(articleId)}`,
    method: "DELETE",
    body: { version },
    session,
    fetchImpl,
  });
