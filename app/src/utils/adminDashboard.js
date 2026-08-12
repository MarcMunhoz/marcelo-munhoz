const normalize = (value) => String(value || "").trim().toLowerCase();
const hasRole = (session, role) => Boolean(session?.roles?.includes(role));
const isOwner = (session) => hasRole(session, "owner");
const isWriter = (session) => hasRole(session, "writer") || isOwner(session);
const ownsArticle = (article = {}, session = {}) =>
  Boolean(
    (article.writerSubject && session.subject && article.writerSubject === session.subject) ||
      (article.authorEntryId && session.authorEntryId && article.authorEntryId === session.authorEntryId) ||
      (isOwner(session) && normalize(article.author || article.authorName) && normalize(article.author || article.authorName) === normalize(session.name))
  );

export const slugFromTitle = (title = "") =>
  String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const humanDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const looksLikeEntryId = (value = "") => {
  const text = String(value || "").trim();
  return /^[A-Za-z0-9_-]{10,}$/.test(text) && !/\s/.test(text);
};

export const displayArticleDate = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return "No date";
  }

  const date = new Date(text.length === 10 ? `${text}T00:00:00.000Z` : text);

  if (Number.isNaN(date.getTime())) {
    return "No date";
  }

  return humanDateFormatter.format(date);
};

export const articleDateInputValue = (value) => {
  const text = String(value || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

export const displayAuthorName = (article = {}) => {
  const author = String(article.authorName || article.author || "").trim();

  if (author && author !== article.authorEntryId && !looksLikeEntryId(author)) {
    return author;
  }

  return "Unknown author";
};

export const displayTags = (tags = []) =>
  (Array.isArray(tags) ? tags : String(tags || "").split(","))
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .map((tag) => ({ id: tag, label: tag }));

export const normalizeTagList = (tags = []) =>
  (Array.isArray(tags) ? tags : String(tags || "").split(","))
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);

export const thumbnailPreviewUrl = (article = {}) => {
  const thumbnail = article.thumbnail || {};
  return thumbnail.secure_url || thumbnail.url || article.thumbnailUrl || "";
};

const assetTitleFromPublicId = (publicId = "") => {
  const leaf = String(publicId || "").split("/").filter(Boolean).pop() || "Image";
  return leaf;
};

export const normalizeMediaAssetDisplay = (asset = {}) => {
  const customContext = asset.context?.custom || {};
  const title = String(asset.display_name || customContext.alt || customContext.caption || assetTitleFromPublicId(asset.public_id)).trim();
  const width = Number(asset.width);
  const height = Number(asset.height);

  return {
    publicId: asset.public_id || "",
    thumbnailUrl: asset.secure_url || asset.url || asset.thumbnail_url || "",
    title,
    alt: title || "Media asset",
    dimensions: width > 0 && height > 0 ? `${width} x ${height}` : "",
  };
};

export const mediaLibraryState = ({ assets = [], error = "", isLoading = false } = {}) => {
  if (isLoading) {
    return {
      status: "loading",
      message: "Loading media library.",
      assets: [],
    };
  }

  if (error) {
    return {
      status: "error",
      message: "Media request failed.",
      assets: [],
    };
  }

  const displayAssets = (Array.isArray(assets) ? assets : []).map(normalizeMediaAssetDisplay);

  if (displayAssets.length === 0) {
    return {
      status: "empty",
      message: "No images are available in the selected media folder.",
      assets: [],
    };
  }

  return {
    status: "ready",
    message: "",
    assets: displayAssets,
  };
};

export const statusLabel = (status) =>
  ({
    published: "Published",
    draft: "Draft",
    unpublished: "Unpublished",
    unpublicationRequested: "Unpublication requested",
    review: "In review",
    archived: "Archived",
  })[status] || "Draft";

export const normalizeAdminArticleDisplay = (article = {}) => ({
  ...article,
  displayDate: displayArticleDate(article.createAt),
  displayAuthor: displayAuthorName(article),
  displayTags: displayTags(article.tags),
  statusLabel: statusLabel(article.status),
  thumbnailPreviewUrl: thumbnailPreviewUrl(article),
});

export const createEmptyArticleForm = () => ({
  id: "",
  title: "",
  slug: "",
  description: "",
  body: "",
  createAt: new Date().toISOString().slice(0, 10),
  thumbnailPublicId: "",
  thumbnailUrl: "",
  alt: "",
  author: "",
  authorEntryId: "",
  authorName: "",
  tags: "",
  tagList: [],
  tagInput: "",
  version: null,
});

export const summarizeArticleStatuses = (articles = []) =>
  articles.reduce(
    (summary, article) => {
      const status = normalize(article.status);

      if (status === "published") {
        summary.published += 1;
      } else if (status === "draft" || status === "unpublished" || status === "unpublicationrequested") {
        summary.drafts += 1;
      } else if (status === "review") {
        summary.review += 1;
      } else if (status === "archived") {
        summary.archived += 1;
      }

      summary.total += 1;
      return summary;
    },
    { published: 0, drafts: 0, review: 0, archived: 0, total: 0 }
  );

export const reconcileAdminDashboardData = (payload = {}) => {
  const articles = (Array.isArray(payload.articles) ? payload.articles : []).map(normalizeAdminArticleDisplay);

  return {
    articles,
    summary: payload.summary || summarizeArticleStatuses(articles),
    reviewRequests: Array.isArray(payload.reviewRequests) ? payload.reviewRequests : [],
  };
};

export const filterAdminArticles = (articles = [], filters = {}) => {
  const search = normalize(filters.search);
  const status = normalize(filters.status);
  const tag = normalize(filters.tag);
  const date = String(filters.date || "").trim();
  const author = normalize(filters.author);

  return articles.filter((article) => {
    const articleTags = Array.isArray(article.tags) ? article.tags.map(normalize) : [];
    const searchText = normalize([article.title, article.slug, article.author, ...(article.tags || [])].join(" "));

    return (
      (!search || searchText.includes(search)) &&
      (!status || normalize(article.status) === status) &&
      (!tag || articleTags.includes(tag)) &&
      (!date || article.createAt === date) &&
      (!author || normalize(article.author).includes(author))
    );
  });
};

export const ownerReviewQueues = (articles = []) => ({
  submissions: articles.filter((article) => normalize(article.status) === "review"),
  unpublicationRequests: articles.filter((article) => normalize(article.status) === "unpublicationrequested"),
});

export const articleToForm = (article = {}) => {
  const tagList = normalizeTagList(article.tags);
  const authorEntryId = article.authorEntryId || (looksLikeEntryId(article.author) ? article.author : "");

  return {
    ...createEmptyArticleForm(),
    id: article.id || "",
    title: article.title || "",
    slug: article.slug || "",
    description: article.description || "",
    body: article.body || "",
    createAt: articleDateInputValue(article.createAt),
    thumbnailPublicId: article.thumbnail?.public_id || article.thumbnailPublicId || "",
    thumbnailUrl: article.thumbnail?.secure_url || article.thumbnail?.url || article.thumbnailUrl || "",
    alt: article.alt || "",
    author: authorEntryId,
    authorEntryId,
    authorName: article.authorName || displayAuthorName(article),
    tags: tagList.join(", "),
    tagList,
    tagInput: "",
    version: article.version || null,
  };
};

export const applyArticleResponseToForm = (form = {}, payload = {}) => {
  const sys = payload.sys || payload.draft?.sys;

  return {
    ...form,
    ...(sys?.id ? { id: sys.id } : {}),
    ...(sys?.version ? { version: sys.version } : {}),
  };
};

export const updateArticleStatusById = (articles = [], articleId, status) =>
  articles.map((article) => (article.id === articleId ? { ...article, status } : article));

export const removeArticleById = (articles = [], articleId) => articles.filter((article) => article.id !== articleId);

export const canConfirmArticleDeletion = (article, confirmation) => Boolean(article?.title && confirmation === article.title);

export const canEditArticleAction = (article = {}, session) => {
  if (!article.id || !isWriter(session) || !ownsArticle(article, session)) {
    return false;
  }

  return ["draft", "review", "published", "unpublished", "unpublicationrequested"].includes(normalize(article.status));
};

export const canPrepareReviewAction = (article = {}, session = { roles: ["writer"] }) => {
  if (!article.id || !hasRole(session, "writer") || isOwner(session) || !ownsArticle(article, session)) {
    return false;
  }

  return ["draft", "unpublished"].includes(normalize(article.status));
};

export const canRequestUnpublicationAction = (article = {}, session = { roles: ["writer"] }) =>
  Boolean(article.id && hasRole(session, "writer") && !isOwner(session) && ownsArticle(article, session) && normalize(article.status) === "published");

export const canOwnerPublishAction = (article = {}, session) => Boolean(article.id && isOwner(session) && normalize(article.status) === "review");

export const canOwnerUnpublishAction = (article = {}, session) =>
  Boolean(article.id && isOwner(session) && ["published", "unpublicationrequested"].includes(normalize(article.status)));

export const canArchiveArticleAction = (article = {}, session) => Boolean(article.id && isOwner(session) && normalize(article.status) !== "archived");

export const buildArticlePayload = (form = {}) => {
  const thumbnail = form.thumbnail || (form.thumbnailPublicId || form.thumbnailUrl
    ? {
        public_id: String(form.thumbnailPublicId || "").trim(),
        secure_url: String(form.thumbnailUrl || "").trim(),
      }
    : undefined);
  const tagList = normalizeTagList(Array.isArray(form.tagList) && form.tagList.length > 0 ? form.tagList : form.tags);

  return {
    title: String(form.title || "").trim(),
    slug: String(form.slug || "").trim(),
    description: String(form.description || "").trim(),
    body: form.body || "",
    createAt: form.createAt || "",
    ...(thumbnail ? { thumbnail } : {}),
    alt: String(form.alt || "").trim(),
    author: String(form.authorEntryId || form.author || "").trim(),
    tags: tagList,
    version: form.version,
  };
};
