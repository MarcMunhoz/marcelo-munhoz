export const authorName = (author = {}) => String(author.fields?.name || author.name || "").trim();

const slugFromText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const authorSlug = (author = {}) => String(author.fields?.slug || author.slug || slugFromText(authorName(author))).trim();

export const authorBiography = (author = {}) => {
  const biography = author.fields?.biography || author.biography || "";

  if (typeof biography === "string") {
    return biography;
  }

  const walk = (node = {}) => {
    const own = typeof node.value === "string" ? node.value : "";
    const children = Array.isArray(node.content) ? node.content.map(walk).join("") : "";
    return `${own}${children}`;
  };

  return walk(biography).trim();
};

export const authorPhotoUrl = (author = {}) => {
  const photo = author.fields?.photo || author.fields?.avatar || author.fields?.image || author.fields?.picture || author.photo || author.avatar || author.image || author.picture || {};
  const candidate = String((typeof photo === "string" ? photo : photo.secure_url || photo.secureUrl || photo.url || photo.fields?.file?.url) || author.photoUrl || "").trim();

  return candidate.startsWith("//") ? `https:${candidate}` : candidate;
};

export const publicAuthorProfile = (author = {}) => ({
  id: author.sys?.id || author.id || "",
  name: authorName(author),
  slug: authorSlug(author),
  biography: authorBiography(author),
  photoUrl: authorPhotoUrl(author),
});

export const articleAuthorProfile = (article = {}) => publicAuthorProfile(article.fields?.author || article.author || {});
