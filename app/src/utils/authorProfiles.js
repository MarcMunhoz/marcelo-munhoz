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

export const authorPhotoUrl = (author = {}) => authorPhotoCandidates(author)[0] || "";

export const publicAuthorProfile = (author = {}) => ({
  id: author.sys?.id || author.id || "",
  name: authorName(author),
  slug: authorSlug(author),
  biography: authorBiography(author),
  photoUrl: authorPhotoUrl(author),
});

export const publicAuthorMetadata = (author = {}) => ({
  title: `Marcelo Munhoz - ${author.name || "Author"}`,
  meta: {
    description: {
      name: "description",
      content: author.biography || `Articles by ${author.name || ""}`,
    },
  },
});

export const articleAuthorProfile = (article = {}) => publicAuthorProfile(article.fields?.author || article.author || {});
import { authorPhotoCandidates } from "./authorPhotos.js";
