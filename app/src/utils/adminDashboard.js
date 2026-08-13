import { articleLocaleFromArticle, normalizeArticleLocale } from "./articleDates.js";

const normalize = (value) => String(value || "").trim().toLowerCase();
const sessionRoles = (session = {}) => (Array.isArray(session?.roles) ? session.roles : []).map(normalize);
const hasRole = (session, role) => sessionRoles(session).includes(normalize(role));
const isOwner = (session) => hasRole(session, "owner");
const isWriter = (session) => hasRole(session, "writer") || isOwner(session);
const ownsArticle = (article = {}, session = {}) =>
  Boolean(
    (article.writerSubject && session.subject && article.writerSubject === session.subject) ||
      (article.authorEntryId && session.authorEntryId && article.authorEntryId === session.authorEntryId)
  );

export const slugFromTitle = (title = "") =>
  String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-")
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

export const articleDateTimeValue = (value) => {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T12:00:00.000Z`;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export const localDateInputValue = (date = new Date(), timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
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

const safeMediaErrorMessage = (error = "") => {
  const message = String(error || "").trim();

  if (message === "Media service is not configured for this environment.") {
    return message;
  }

  return "Media request failed.";
};

const cloudinaryAssetPayload = (asset = {}) => {
  const payload = {};
  const scalarKeys = [
    "public_id",
    "secure_url",
    "url",
    "width",
    "height",
    "format",
    "resource_type",
    "type",
    "version",
    "bytes",
    "created_at",
    "display_name",
    "asset_id",
    "asset_folder",
    "folder",
  ];

  scalarKeys.forEach((key) => {
    if (asset[key] !== undefined && asset[key] !== null && asset[key] !== "") {
      payload[key] = asset[key];
    }
  });

  ["context", "metadata", "tags"].forEach((key) => {
    if (asset[key] !== undefined && asset[key] !== null) {
      payload[key] = asset[key];
    }
  });

  if (payload.secure_url && !payload.url) {
    payload.url = payload.secure_url;
  }

  return payload;
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
    asset: cloudinaryAssetPayload(asset),
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
      message: safeMediaErrorMessage(error),
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

export const createEmptyArticleForm = ({ now = () => new Date(), timeZone } = {}) => ({
  id: "",
  title: "",
  slug: "",
  description: "",
  body: "",
  locale: "pt-BR",
  createAt: localDateInputValue(now(), timeZone),
  thumbnailPublicId: "",
  thumbnailUrl: "",
  thumbnail: null,
  alt: "",
  author: "",
  authorEntryId: "",
  authorName: "",
  tags: "",
  tagList: [],
  tagInput: "",
  version: null,
});

export const createEmptyAuthorProfileForm = () => ({
  id: "",
  name: "",
  slug: "",
  biography: "",
  photoUrl: "",
  photoPublicId: "",
  version: null,
});

export const authorProfileToForm = (profile = {}) => ({
  ...createEmptyAuthorProfileForm(),
  id: profile.id || "",
  name: profile.name || "",
  slug: profile.slug || "",
  biography: profile.biography || "",
  photoUrl: profile.photoUrl || profile.photo?.secure_url || profile.photo?.url || "",
  photoPublicId: profile.photo?.public_id || profile.photoPublicId || "",
  version: profile.version || null,
});

export const buildAuthorProfilePayload = (form = {}) => ({
  name: String(form.name || "").trim(),
  slug: String(form.slug || "").trim(),
  biography: String(form.biography || "").trim(),
  ...(form.photoPublicId || form.photoUrl
    ? {
        photo: {
          public_id: String(form.photoPublicId || "").trim(),
          secure_url: String(form.photoUrl || "").trim(),
        },
      }
    : {}),
  version: form.version,
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
  submissions: articles.filter((article) => ["draft", "review"].includes(normalize(article.status))),
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
    locale: articleLocaleFromArticle(article, "pt-BR"),
    createAt: articleDateInputValue(article.createAt),
    thumbnailPublicId: article.thumbnail?.public_id || article.thumbnailPublicId || "",
    thumbnailUrl: article.thumbnail?.secure_url || article.thumbnail?.url || article.thumbnailUrl || "",
    thumbnail: article.thumbnail || null,
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
  article = article || {};

  if (!article.id || !isWriter(session) || !ownsArticle(article, session)) {
    return false;
  }

  return ["draft", "review", "published", "unpublished", "unpublicationrequested"].includes(normalize(article.status));
};

export const canPrepareReviewAction = (article = {}, session = { roles: ["writer"] }) => {
  article = article || {};

  if (!article.id || !isWriter(session) || isOwner(session) || !ownsArticle(article, session)) {
    return false;
  }

  return ["draft", "unpublished"].includes(normalize(article.status));
};

export const canRequestUnpublicationAction = (article = {}, session = { roles: ["writer"] }) => {
  article = article || {};

  return Boolean(article.id && isWriter(session) && !isOwner(session) && ownsArticle(article, session) && normalize(article.status) === "published");
};

export const canOwnerPublishAction = (article = {}, session) => {
  article = article || {};

  return Boolean(article.id && isOwner(session) && normalize(article.status) === "review");
};

export const canOwnerUnpublishAction = (article = {}, session) => {
  article = article || {};

  return Boolean(article.id && isOwner(session) && ["published", "unpublicationrequested"].includes(normalize(article.status)));
};

export const canArchiveArticleAction = (article = {}, session) => {
  article = article || {};

  return Boolean(article.id && isOwner(session) && ["draft", "review", "unpublished"].includes(normalize(article.status)));
};

export const canUnarchiveArticleAction = (article = {}, session) => {
  article = article || {};

  return Boolean(article.id && isOwner(session) && normalize(article.status) === "archived");
};

export const buildArticlePayload = (form = {}, { now = () => new Date() } = {}) => {
  const thumbnail = form.thumbnail || (form.thumbnailPublicId || form.thumbnailUrl
    ? {
        public_id: String(form.thumbnailPublicId || "").trim(),
        secure_url: String(form.thumbnailUrl || "").trim(),
        url: String(form.thumbnailUrl || "").trim(),
      }
    : undefined);
  const tagList = normalizeTagList(Array.isArray(form.tagList) && form.tagList.length > 0 ? form.tagList : form.tags);
  const createAt = articleDateTimeValue(form.createAt);
  const updatedAt = form.id ? now().toISOString() : "";

  return {
    title: String(form.title || "").trim(),
    slug: String(form.slug || "").trim(),
    description: String(form.description || "").trim(),
    body: form.body || "",
    locale: normalizeArticleLocale(form.locale || articleLocaleFromArticle(form, "pt-BR")),
    createAt,
    ...(updatedAt ? { updatedAt } : {}),
    ...(thumbnail ? { cloudinary: [thumbnail] } : {}),
    alt: String(form.alt || "").trim(),
    author: String(form.authorEntryId || form.author || "").trim(),
    tags: tagList,
    version: form.version,
  };
};

const markdownListPrefixForLine = (before, index) => (before === "1. " ? `${index + 1}. ` : before);

const shouldFormatMarkdownLines = ({ before, after, selected }) => !after && ["- ", "1. "].includes(before) && selected.includes("\n");

export const formatMarkdownSelection = ({ value = "", selectionStart, selectionEnd, before, after = "", placeholder = "text" } = {}) => {
  const text = String(value || "");
  const start = Number.isInteger(selectionStart) ? Math.max(0, Math.min(selectionStart, text.length)) : text.length;
  const end = Number.isInteger(selectionEnd) ? Math.max(start, Math.min(selectionEnd, text.length)) : start;
  const selected = text.slice(start, end) || placeholder;
  let insertion = `${before || ""}${selected}${after || ""}`;
  let selectionOffset = String(before || "").length;
  let selectedLength = selected.length;

  if (shouldFormatMarkdownLines({ before, after, selected })) {
    insertion = selected
      .split("\n")
      .map((line, index) => `${markdownListPrefixForLine(before, index)}${line}`)
      .join("\n");
    selectionOffset = markdownListPrefixForLine(before, 0).length;
    selectedLength = insertion.length - selectionOffset;
  }

  const nextValue = `${text.slice(0, start)}${insertion}${text.slice(end)}`;
  const nextSelectionStart = start + selectionOffset;

  return {
    value: nextValue,
    selectionStart: nextSelectionStart,
    selectionEnd: nextSelectionStart + selectedLength,
  };
};
