import { isArticleLanguageTag } from "./articleDates.js";

export const normalizeEditorialTagOptions = (tags = []) =>
  (Array.isArray(tags) ? tags : [])
    .map((tag) => ({
      ...tag,
      id: String(tag?.id || "").trim(),
      label: String(tag?.label || tag?.id || "").trim(),
    }))
    .filter((tag) => tag.id && !isArticleLanguageTag(tag.id));

export const toggleArticleTagFilter = (filters = {}, selectedTag = "") => {
  const tag = String(selectedTag || "").trim();
  return {
    ...filters,
    tag: String(filters.tag || "").trim() === tag ? "" : tag,
  };
};

export const canDeleteManagedTag = (tag = {}) => Number(tag.articleCount) === 0;

export const runDoubleConfirmedTagDeletion = async ({ tag, confirm, remove } = {}) => {
  if (!canDeleteManagedTag(tag)) {
    return false;
  }

  if (!(await confirm("warning", tag)) || !(await confirm("certainty", tag))) {
    return false;
  }

  await remove(tag);
  return true;
};
