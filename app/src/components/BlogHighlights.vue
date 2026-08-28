<template>
  <section v-if="articles.length" class="blog-highlights" aria-labelledby="blog-highlights-title">
    <div class="blog-highlights__heading">
      <p class="blog-highlights__eyebrow">Latest writing</p>
      <h1 id="blog-highlights-title">Featured articles</h1>
    </div>

    <div class="blog-highlights__grid">
      <article v-if="primaryArticle" class="blog-highlight blog-highlight--primary">
        <router-link class="blog-highlight__link" :to="blogArticleLocation(primaryArticle, returnTo)">
          <img
            class="blog-highlight__image"
            :src="articleCardImageUrl(primaryArticle.fields)"
            :alt="primaryArticle.fields.alt || primaryArticle.fields.title"
            width="350"
            height="233"
          />
          <div class="blog-highlight__content">
            <p class="blog-highlight__meta">
              <span v-if="articleAuthor(primaryArticle)">{{ articleAuthor(primaryArticle) }}</span>
              <time v-if="articleDates(primaryArticle).created" :datetime="primaryArticle.fields.createAt || primaryArticle.sys?.createdAt">
                {{ articleDates(primaryArticle).created }}
              </time>
            </p>
            <h2>{{ primaryArticle.fields.title }}</h2>
            <p class="blog-highlight__description">{{ primaryArticle.fields.description }}</p>
          </div>
        </router-link>
      </article>

      <div v-if="secondaryArticles.length" class="blog-highlights__secondary">
        <article v-for="article in secondaryArticles" :key="article.sys?.id || article.fields.slug" class="blog-highlight blog-highlight--secondary">
          <router-link class="blog-highlight__link" :to="blogArticleLocation(article, returnTo)">
            <img
              class="blog-highlight__image"
              :src="articleCardImageUrl(article.fields)"
              :alt="article.fields.alt || article.fields.title"
              width="350"
              height="233"
            />
            <div class="blog-highlight__content">
              <p class="blog-highlight__meta">
                <span v-if="articleAuthor(article)">{{ articleAuthor(article) }}</span>
                <time v-if="articleDates(article).created" :datetime="article.fields.createAt || article.sys?.createdAt">
                  {{ articleDates(article).created }}
                </time>
              </p>
              <h2>{{ article.fields.title }}</h2>
              <p class="blog-highlight__description">{{ article.fields.description }}</p>
            </div>
          </router-link>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import { articleLocaleFromArticle, publicArticleDates } from "../utils/articleDates.js";
import { blogArticleLocation } from "../utils/blogArchive.js";
import { articleCardImageUrl } from "../utils/contentfulImages.js";

defineOptions({
  name: "BlogHighlights",
});

const props = defineProps({
  articles: { type: Array, default: () => [] },
  returnTo: { type: String, default: "/blog" },
});

const primaryArticle = computed(() => props.articles[0] || null);
const secondaryArticles = computed(() => props.articles.slice(1, 3));
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
</script>

<style lang="scss" scoped>
.blog-highlights {
  width: 100%;
}

.blog-highlights__heading {
  margin-bottom: 20px;
}

.blog-highlights__eyebrow {
  margin: 0 0 4px;
  color: $blue-grey-5;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.blog-highlights h1 {
  margin: 0;
  color: $blue-grey-10;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  line-height: 1.08;
}

.blog-highlights__grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 24px;
}

.blog-highlights__secondary {
  display: grid;
  min-width: 0;
  gap: 24px;
}

.blog-highlight {
  min-width: 0;
  border-radius: 12px;
  background: $blue-grey-1;
  overflow: hidden;
}

.blog-highlight__link {
  display: block;
  height: 100%;
  border-radius: inherit;
  color: inherit;
  text-decoration: none;
}

.blog-highlight__link:focus-visible {
  outline: 3px solid transparent;
  outline-offset: -3px;
  box-shadow: inset 0 0 0 3px $blue-grey-6;
}

@media (forced-colors: active) {
  .blog-highlight__link:focus-visible {
    outline-color: Highlight;
  }
}

.blog-highlight__image {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
}

.blog-highlight--primary .blog-highlight__image {
  aspect-ratio: 16 / 9;
}

.blog-highlight__content {
  padding: 18px;
}

.blog-highlight__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0 0 8px;
  color: $blue-grey-6;
  font-size: 0.82rem;
}

.blog-highlight h2,
.blog-highlight__description {
  overflow-wrap: anywhere;
}

.blog-highlight h2 {
  margin: 0;
  color: $blue-grey-10;
  font-size: 1.25rem;
  line-height: 1.25;
}

.blog-highlight--primary h2 {
  font-size: clamp(1.5rem, 3vw, 2.15rem);
}

.blog-highlight__description {
  display: -webkit-box;
  margin: 10px 0 0;
  color: $blue-grey-8;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

@media (max-width: 700px) {
  .blog-highlights__grid,
  .blog-highlights__secondary {
    grid-template-columns: minmax(0, 1fr);
  }

  .blog-highlights__grid,
  .blog-highlights__secondary {
    gap: 18px;
  }

  .blog-highlight--primary .blog-highlight__image {
    aspect-ratio: 3 / 2;
  }
}
</style>
