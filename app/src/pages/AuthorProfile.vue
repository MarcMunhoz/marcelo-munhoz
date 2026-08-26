<template>
  <q-page class="author-page">
    <q-circular-progress v-if="progress" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <section v-else class="author-profile">
      <header class="author-header">
        <div class="author-photo">
          <img
            v-if="authorPhotoUrl"
            :src="authorPhotoUrl"
            :alt="`${author.name} profile photo`"
            referrerpolicy="no-referrer"
            @error="advanceAuthorPhoto"
          />
          <span v-else>{{ authorInitials }}</span>
        </div>
        <div>
          <p class="author-kicker">Author</p>
          <h1>{{ author.name }}</h1>
          <p v-if="author.biography">{{ author.biography }}</p>
        </div>
      </header>

      <section class="author-articles">
        <h2>Articles</h2>
        <p v-if="articles.length === 0" class="empty-state">No published articles found for this author.</p>
        <div v-else class="article-list">
          <article v-for="article in displayedArticles" :key="article.sys.id" class="article-row">
            <router-link :to="{ name: 'Artigo', params: { slug: article.fields.slug } }">
              <div>
                <h3>{{ article.fields.title }}</h3>
                <p>{{ article.fields.description }}</p>
              </div>
              <span>{{ readingTimeLabel(article) }}</span>
            </router-link>
          </article>
        </div>
        <div v-if="articles.length > articlePageSize" class="article-pagination">
          <q-btn v-if="canLoadMore" outline color="blue-grey-7" label="Load more" no-caps @click="loadMoreArticles" />
          <q-btn v-if="visibleArticleCount > articlePageSize" flat color="blue-grey-7" label="Show less" no-caps @click="showLessArticles" />
        </div>
      </section>
    </section>
  </q-page>
</template>

<script setup>
import { useMeta } from "quasar";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { buildApiUrl } from "../utils/apiBase.js";
import { publicAuthorMetadata, publicAuthorProfile } from "../utils/authorProfiles.js";
import { authorPhotoCandidates, nextAuthorPhotoIndex } from "../utils/authorPhotos.js";

const WORDS_PER_MINUTE = 220;
const ARTICLE_PAGE_SIZE = 8;
const route = useRoute();
const author = ref(publicAuthorProfile());
const authorPhotoCandidateList = ref([]);
const authorPhotoIndex = ref(0);
const articles = ref([]);
const articlePageSize = ARTICLE_PAGE_SIZE;
const visibleArticleCount = ref(ARTICLE_PAGE_SIZE);
const progress = ref(true);
const metadata = computed(() => publicAuthorMetadata(author.value));
const authorInitials = computed(() =>
  String(author.value.name || "Author")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
);
const authorPhotoUrl = computed(() => authorPhotoCandidateList.value[authorPhotoIndex.value] || "");
const displayedArticles = computed(() => articles.value.slice(0, visibleArticleCount.value));
const canLoadMore = computed(() => visibleArticleCount.value < articles.value.length);
let authorRequestId = 0;
let unmounted = false;

useMeta(() => metadata.value);

const readingTimeLabel = (article = {}) => {
  const fields = article.fields || {};
  const text = [fields.title, fields.description, fields.body].filter(Boolean).join(" ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  return `${minutes} min read`;
};

const loadMoreArticles = () => {
  visibleArticleCount.value = Math.min(visibleArticleCount.value + articlePageSize, articles.value.length);
};

const showLessArticles = () => {
  visibleArticleCount.value = articlePageSize;
};

const advanceAuthorPhoto = () => {
  authorPhotoIndex.value = nextAuthorPhotoIndex(authorPhotoCandidateList.value, authorPhotoIndex.value);
};

const loadAuthor = async () => {
  const requestId = ++authorRequestId;
  progress.value = true;

  try {
    const response = await fetch(buildApiUrl(`/api/contentful/author/${route.params.slug}`));

    if (!response.ok) {
      throw new Error(`Author API returned ${response.status}`);
    }

    const payload = await response.json();

    if (requestId !== authorRequestId || unmounted) return;
    authorPhotoCandidateList.value = authorPhotoCandidates(payload.author);
    authorPhotoIndex.value = 0;
    author.value = publicAuthorProfile(payload.author);
    articles.value = payload.articles || [];
    visibleArticleCount.value = articlePageSize;
  } catch (error) {
    if (requestId !== authorRequestId || unmounted) return;
    console.error("Erro ao carregar autor:", error);
    author.value = publicAuthorProfile();
    authorPhotoCandidateList.value = [];
    authorPhotoIndex.value = 0;
    articles.value = [];
  } finally {
    if (requestId === authorRequestId && !unmounted) {
      progress.value = false;
    }
  }
};

onMounted(loadAuthor);

onBeforeUnmount(() => {
  unmounted = true;
  authorRequestId += 1;
});
</script>

<style lang="scss" scoped>
.author-page {
  background: #f7f9f8;
  min-height: inherit;
  padding: 24px;
}

.author-profile {
  max-width: none;
}

.author-header {
  align-items: center;
  background: #ffffff;
  border: 1px solid #d8e1e5;
  display: grid;
  gap: 20px;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 22px;

  h1 {
    font-size: 2rem;
    line-height: 1.15;
    margin: 0;
  }

  p:not(.author-kicker) {
    color: #455a64;
    font-size: 1rem;
    line-height: 1.45;
    margin: 10px 0 0;
  }
}

.author-kicker {
  color: #607d8b;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.author-photo {
  align-items: center;
  background: #455a64;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  font-size: 1.4rem;
  font-weight: 700;
  height: 96px;
  justify-content: center;
  overflow: hidden;
  width: 96px;

  img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }
}

.author-articles {
  margin-top: 22px;

  h2 {
    font-size: 1.4rem;
    margin: 0 0 14px;
  }
}

.article-list {
  background: #ffffff;
  border: 1px solid #d8e1e5;
}

.article-row {
  border-bottom: 1px solid #d8e1e5;

  &:last-child {
    border-bottom: 0;
  }

  a {
    align-items: center;
    color: inherit;
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 18px 20px;
    text-decoration: none;
  }

  h3 {
    font-size: 1rem;
    margin: 0 0 6px;
  }

  p {
    color: #607d8b;
    line-height: 1.45;
    margin: 0;
  }

  span {
    color: #607d8b;
    font-size: 0.85rem;
    white-space: nowrap;
  }
}

.article-pagination {
  display: flex;
  gap: 10px;
  justify-content: flex-start;
  margin-top: 14px;
}

.empty-state {
  color: #607d8b;
}

@media (max-width: 640px) {
  .author-header {
    grid-template-columns: minmax(0, 1fr);
  }

  .article-row a {
    align-items: flex-start;
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
