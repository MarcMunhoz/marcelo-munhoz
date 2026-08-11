import { buildApiUrl } from "./apiBase.js";

const ADMIN_ARTICLES_PATH = "/api/admin/contentful/articles";

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

export const adminRequest = async ({ path, method = "GET", body, session, fetchImpl = fetch }) => {
  const headers = {
    "content-type": "application/json",
  };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
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
