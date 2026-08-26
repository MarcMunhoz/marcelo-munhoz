<template>
  <ul class="blog-archive-list" aria-label="Articles">
    <li v-for="article in articles" :key="article.sys?.id || article.fields.slug" class="blog-archive-row">
      <router-link class="blog-archive-row__link" :to="blogArticleLocation(article, returnTo)">
        <img
          class="blog-archive-row__image"
          :src="articleCardImageUrl(article.fields)"
          :alt="article.fields.alt || article.fields.title"
          width="350"
          height="233"
          loading="lazy"
          decoding="async"
        />
        <div class="blog-archive-row__content">
          <h3>{{ article.fields.title }}</h3>
          <p class="blog-archive-row__description">{{ article.fields.description }}</p>
          <p class="blog-archive-row__meta">
            <span v-if="articleAuthor(article)">{{ articleAuthor(article) }}</span>
            <time v-if="articleDates(article).created" :datetime="article.fields.createAt || article.sys?.createdAt">
              {{ articleDates(article).created }}
            </time>
          </p>
          <ul v-if="articleTags(article).length" class="blog-archive-row__tags" aria-label="Article tags">
            <li v-for="tag in articleTags(article)" :key="tag">#{{ tag }}</li>
          </ul>
        </div>
      </router-link>
    </li>
  </ul>
</template>

<script setup>
import { articleLocaleFromArticle, publicArticleDates } from "../utils/articleDates.js";
import { articleArchiveTags, blogArticleLocation } from "../utils/blogArchive.js";
import { articleCardImageUrl } from "../utils/contentfulImages.js";

defineOptions({
  name: "BlogArchiveList",
});

defineProps({
  articles: { type: Array, default: () => [] },
  returnTo: { type: String, default: "/blog" },
});

const articleAuthor = (article) => article.fields?.author?.fields?.name || "";
const articleDates = (article) => {
  const fields = article.fields || {};

  return publicArticleDates({
    createAt: fields.createAt,
    updatedAt: fields.updatedAt,
    fallbackCreatedAt: article.sys?.createdAt,
    locale: articleLocaleFromArticle(fields),
  });
};
const articleTags = articleArchiveTags;
</script>

<style lang="scss" scoped>
.blog-archive-list {
  display: grid;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.blog-archive-row {
  min-width: 0;
  border-bottom: 1px solid $blue-grey-2;
}

.blog-archive-row__link {
  display: grid;
  grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
  gap: 22px;
  padding: 22px 0;
  color: inherit;
  text-decoration: none;
}

.blog-archive-row__link:focus-visible {
  border-radius: 8px;
  outline: 3px solid $blue-grey-6;
  outline-offset: 4px;
}

.blog-archive-row__image {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  border-radius: 8px;
  object-fit: cover;
}

.blog-archive-row__content {
  min-width: 0;
}

.blog-archive-row h3,
.blog-archive-row__description,
.blog-archive-row__meta,
.blog-archive-row__tags {
  overflow-wrap: anywhere;
}

.blog-archive-row h3 {
  margin: 0;
  color: $blue-grey-10;
  font-size: clamp(1.15rem, 2vw, 1.45rem);
  line-height: 1.25;
}

.blog-archive-row__description {
  display: -webkit-box;
  margin: 8px 0;
  color: $blue-grey-8;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.blog-archive-row__meta,
.blog-archive-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 14px;
  margin: 0;
  color: $blue-grey-6;
  font-size: 0.82rem;
}

.blog-archive-row__tags {
  gap: 5px 9px;
  margin-top: 9px;
  padding: 0;
  color: $blue-grey-7;
  list-style: none;
}

@media (max-width: 700px) {
  .blog-archive-row__link {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .blog-archive-row__image {
    max-width: none;
  }
}
</style>
