export const authorName = (author = {}) => String(author.fields?.name || author.name || "").trim();

export const authorSlug = (author = {}) => String(author.fields?.slug || author.slug || author.sys?.id || author.id || "").trim();

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
  const photo = author.fields?.photo || author.fields?.avatar || author.photo || author.avatar || {};
  return String(photo.secure_url || photo.url || author.photoUrl || "").trim();
};

export const publicAuthorProfile = (author = {}) => ({
  id: author.sys?.id || author.id || "",
  name: authorName(author),
  slug: authorSlug(author),
  biography: authorBiography(author),
  photoUrl: authorPhotoUrl(author),
});

export const articleAuthorProfile = (article = {}) => publicAuthorProfile(article.fields?.author || article.author || {});
