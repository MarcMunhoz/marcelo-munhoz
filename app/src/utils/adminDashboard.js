const normalize = (value) => String(value || "").trim().toLowerCase();

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
  tags: "",
  version: null,
});

export const sampleAdminArticles = [
  {
    id: "article-admin-dashboard",
    title: "Building the blog admin dashboard",
    slug: "building-the-blog-admin-dashboard",
    status: "draft",
    tags: ["admin", "vue"],
    createAt: "2026-08-11",
    author: "Marcelo Munhoz",
    version: 3,
    views: null,
  },
  {
    id: "article-contentful-flow",
    title: "Contentful publishing flow",
    slug: "contentful-publishing-flow",
    status: "review",
    tags: ["contentful"],
    createAt: "2026-08-10",
    author: "Guest Writer",
    version: 5,
    views: null,
  },
  {
    id: "article-public-blog",
    title: "Public blog rendering",
    slug: "public-blog-rendering",
    status: "published",
    tags: ["blog"],
    createAt: "2026-08-08",
    author: "Marcelo Munhoz",
    version: 12,
    views: null,
  },
  {
    id: "article-cloudinary-media",
    title: "Cloudinary media workflow",
    slug: "cloudinary-media-workflow",
    status: "unpublished",
    tags: ["media", "cloudinary"],
    createAt: "2026-08-07",
    author: "Guest Writer",
    version: 2,
    views: null,
  },
];

export const summarizeArticleStatuses = (articles = []) =>
  articles.reduce(
    (summary, article) => {
      const status = normalize(article.status);

      if (status === "published") {
        summary.published += 1;
      } else if (status === "draft" || status === "unpublished") {
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

export const articleToForm = (article = {}) => ({
  ...createEmptyArticleForm(),
  id: article.id || "",
  title: article.title || "",
  slug: article.slug || "",
  description: article.description || "",
  body: article.body || "",
  createAt: article.createAt || new Date().toISOString().slice(0, 10),
  thumbnailPublicId: article.thumbnail?.public_id || article.thumbnailPublicId || "",
  thumbnailUrl: article.thumbnail?.secure_url || article.thumbnail?.url || article.thumbnailUrl || "",
  alt: article.alt || "",
  author: article.authorEntryId || article.author || "",
  tags: Array.isArray(article.tags) ? article.tags.join(", ") : article.tags || "",
  version: article.version || null,
});

export const buildArticlePayload = (form = {}) => {
  const thumbnail = form.thumbnail || (form.thumbnailPublicId || form.thumbnailUrl
    ? {
        public_id: String(form.thumbnailPublicId || "").trim(),
        secure_url: String(form.thumbnailUrl || "").trim(),
      }
    : undefined);

  return {
    title: String(form.title || "").trim(),
    slug: String(form.slug || "").trim(),
    description: String(form.description || "").trim(),
    body: form.body || "",
    createAt: form.createAt || "",
    ...(thumbnail ? { thumbnail } : {}),
    alt: String(form.alt || "").trim(),
    author: String(form.author || "").trim(),
    tags: String(form.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    version: form.version,
  };
};
