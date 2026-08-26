<template>
  <q-page class="blog-page q-pa-md">
    <main class="blog-shell">
      <section class="blog-controls" aria-labelledby="blog-archive-heading">
        <q-input
          :model-value="searchInput"
          label="Search articles"
          outlined
          clearable
          class="blog-controls__search"
          @update:model-value="onSearchInput"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>

        <q-select
          :model-value="archiveState.year"
          :options="yearOptions"
          :loading="yearsLoading"
          label="Year"
          outlined
          clearable
          emit-value
          map-options
          @update:model-value="onFilterChange('year', $event)"
        />

        <q-select
          :model-value="archiveState.tag"
          :options="tagOptions"
          :loading="tagsLoading"
          label="Tag"
          outlined
          clearable
          emit-value
          map-options
          @update:model-value="onFilterChange('tag', $event)"
        />
      </section>

      <BlogHighlights v-if="featured.length" :articles="featured" :return-to="route.fullPath" />

      <section class="blog-archive" aria-labelledby="blog-archive-heading" :aria-busy="loading">
        <div class="blog-archive__heading">
          <div>
            <p class="blog-archive__eyebrow">Browse the collection</p>
            <h2 id="blog-archive-heading">Article archive</h2>
          </div>
          <p v-if="!loading && !error" class="blog-archive__summary">{{ total }} articles · up to {{ pageSize }} per page</p>
        </div>

        <div class="blog-archive__results" aria-live="polite">
          <div v-if="loading" class="blog-state" role="status">
            <q-spinner size="36px" color="blue-grey-5" />
            <p>Loading articles…</p>
          </div>

          <div v-else-if="error" class="blog-state" role="alert">
            <p>We could not load the article archive.</p>
            <q-btn outline no-caps color="blue-grey-7" label="Try again" @click="loadArchive" />
          </div>

          <div v-else-if="articles.length === 0" class="blog-state">
            <p>No articles match these filters.</p>
          </div>

          <BlogArchiveList v-else :articles="articles" :return-to="route.fullPath" />
        </div>

        <nav v-if="!loading && !error && totalPages > 1" class="blog-pagination" aria-label="Article archive pagination">
          <p class="blog-pagination__status" aria-live="polite">Page {{ archiveState.page }} of {{ totalPages }}</p>
          <div v-if="compactPagination" class="blog-pagination__compact">
            <q-btn
              flat
              round
              icon="chevron_left"
              aria-label="Previous page"
              :disable="archiveState.page <= 1"
              @click="changePage(archiveState.page - 1)"
            />
            <q-input
              :model-value="archiveState.page"
              label="Page"
              type="number"
              dense
              outlined
              :min="1"
              :max="totalPages"
              input-class="text-center"
              @change="changePageFromInput"
            />
            <span aria-hidden="true">/ {{ totalPages }}</span>
            <q-btn
              flat
              round
              icon="chevron_right"
              aria-label="Next page"
              :disable="archiveState.page >= totalPages"
              @click="changePage(archiveState.page + 1)"
            />
          </div>
          <q-pagination
            v-else
            :model-value="archiveState.page"
            :max="totalPages"
            v-bind="paginationDisplay"
            direction-links
            flat
            color="blue-grey-4"
            active-color="blue-grey-7"
            @update:model-value="changePage"
          />
        </nav>
      </section>
    </main>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import BlogArchiveList from "../components/BlogArchiveList.vue";
import BlogHighlights from "../components/BlogHighlights.vue";
import { buildApiUrl } from "../utils/apiBase.js";
import {
  blogPaginationDisplay,
  blogRouteQuery,
  blogTagOptions,
  normalizeBlogRouteQuery,
  validateBlogIndexPayload,
  validateBlogYearsPayload,
} from "../utils/blogArchive.js";
import { observeMediaQuery } from "../utils/responsiveMedia.js";

defineOptions({
  name: "BlogPage",
});

const sameArchiveState = (left, right) => ["page", "q", "year", "tag"].every((key) => left[key] === right[key]);
const route = useRoute();
const router = useRouter();
const initialArchiveState = normalizeBlogRouteQuery(route.query);

const archiveState = ref(initialArchiveState);
const searchInput = ref(initialArchiveState.q);
const featured = ref([]);
const articles = ref([]);
const yearOptions = ref([]);
const yearsLoading = ref(false);
const tagOptions = ref([]);
const tagsLoading = ref(false);
const loading = ref(true);
const error = ref("");
const total = ref(0);
const totalPages = ref(1);
const pageSize = ref(12);
const compactPagination = ref(false);
let searchTimer = null;
let archiveRequestId = 0;
let stopCompactPaginationObserver = null;

const paginationDisplay = computed(() => blogPaginationDisplay(compactPagination.value));

const isCanonicalRouteQuery = (query, state) => {
  const canonical = blogRouteQuery(state);
  const queryKeys = Object.keys(query);
  const canonicalKeys = Object.keys(canonical);

  return (
    queryKeys.length === canonicalKeys.length &&
    canonicalKeys.every((key) => !Array.isArray(query[key]) && String(query[key] ?? "") === canonical[key])
  );
};

const ensureCanonicalRoute = (query, state) => {
  if (!isCanonicalRouteQuery(query, state)) {
    router.replace({ query: blogRouteQuery(state) });
  }
};

const replaceArchiveState = (patch) => {
  const nextState = normalizeBlogRouteQuery({ ...archiveState.value, ...patch });
  router.replace({ query: blogRouteQuery(nextState) });
};

const loadYears = async () => {
  yearsLoading.value = true;

  try {
    const response = await fetch(buildApiUrl("/api/contentful/blog-years"));

    if (!response.ok) {
      throw new Error(`Blog years API returned ${response.status}`);
    }

    const data = validateBlogYearsPayload(await response.json());
    yearOptions.value = data.years.map((year) => ({ label: year, value: year }));
  } catch (loadError) {
    console.error("Erro ao carregar anos do blog:", loadError);
    yearOptions.value = [];
  } finally {
    yearsLoading.value = false;
  }
};

const loadTags = async () => {
  tagsLoading.value = true;

  try {
    const response = await fetch(buildApiUrl("/api/contentful/tags"));

    if (!response.ok) {
      throw new Error(`Tags API returned ${response.status}`);
    }

    tagOptions.value = blogTagOptions(await response.json());
  } catch (loadError) {
    console.error("Erro ao carregar tags:", loadError);
    tagOptions.value = [];
  } finally {
    tagsLoading.value = false;
  }
};

const loadArchive = async () => {
  const requestId = ++archiveRequestId;
  const params = new URLSearchParams(blogRouteQuery(archiveState.value));
  const queryString = params.toString();

  loading.value = true;
  error.value = "";
  featured.value = [];

  try {
    const response = await fetch(buildApiUrl(`/api/contentful/blog-index${queryString ? `?${queryString}` : ""}`));

    if (!response.ok) {
      throw new Error(`Blog API returned ${response.status}`);
    }

    const data = validateBlogIndexPayload(await response.json());

    if (requestId !== archiveRequestId) {
      return;
    }

    const returnedPage = normalizeBlogRouteQuery({ ...archiveState.value, page: data.page }).page;
    featured.value = Array.isArray(data.featured) ? data.featured : [];
    articles.value = Array.isArray(data.items) ? data.items : [];
    total.value = Number.isFinite(Number(data.total)) ? Math.max(0, Number(data.total)) : 0;
    totalPages.value = Number.isFinite(Number(data.totalPages)) ? Math.max(1, Number(data.totalPages)) : 1;
    pageSize.value = 12;

    if (returnedPage !== archiveState.value.page) {
      archiveState.value = { ...archiveState.value, page: returnedPage };
      router.replace({ query: blogRouteQuery(archiveState.value) });
    }
  } catch (loadError) {
    if (requestId !== archiveRequestId) {
      return;
    }

    console.error("Erro ao carregar artigos:", loadError);
    featured.value = [];
    articles.value = [];
    error.value = "archive-load-failed";
  } finally {
    if (requestId === archiveRequestId) {
      loading.value = false;
    }
  }
};

const applyRouteQuery = (query) => {
  clearTimeout(searchTimer);
  const nextState = normalizeBlogRouteQuery(query);
  const changed = !sameArchiveState(nextState, archiveState.value);

  archiveState.value = nextState;
  searchInput.value = nextState.q;
  ensureCanonicalRoute(query, nextState);

  if (changed) {
    loadArchive();
  }
};

const onSearchInput = (value) => {
  searchInput.value = String(value || "");
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    replaceArchiveState({ q: searchInput.value, page: 1 });
  }, 300);
};

const onFilterChange = (key, value) => {
  clearTimeout(searchTimer);
  replaceArchiveState({ q: searchInput.value, [key]: value || "", page: 1 });
};

const changePage = (page) => {
  const nextState = normalizeBlogRouteQuery({ ...archiveState.value, page });
  router.push({ query: blogRouteQuery(nextState) });
};

const changePageFromInput = (value) => {
  const rawValue = value?.target?.value ?? value;
  const parsedPage = Number.parseInt(String(rawValue ?? ""), 10);
  const page = Number.isFinite(parsedPage) ? Math.min(totalPages.value, Math.max(1, parsedPage)) : archiveState.value.page;

  if (page !== archiveState.value.page) {
    changePage(page);
  }
};

watch(
  () => route.query,
  (query) => applyRouteQuery(query),
  { deep: true }
);

ensureCanonicalRoute(route.query, archiveState.value);
loadYears();
loadTags();
loadArchive();

onMounted(() => {
  stopCompactPaginationObserver = observeMediaQuery("(max-width: 599px)", (matches) => {
    compactPagination.value = matches;
  });
});

onBeforeUnmount(() => {
  stopCompactPaginationObserver?.();
  clearTimeout(searchTimer);
  archiveRequestId += 1;
});
</script>

<style lang="scss" scoped>
.blog-page {
  color: $blue-grey-9;
}

.blog-shell {
  display: grid;
  width: min(1180px, 100%);
  margin: 0 auto;
  gap: clamp(32px, 6vw, 64px);
}

.blog-controls {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(150px, 0.7fr) minmax(180px, 1fr);
  align-items: start;
  gap: 14px;
}

.blog-controls__search {
  min-width: 0;
}

.blog-archive {
  min-width: 0;
}

.blog-archive__heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 8px;
  border-bottom: 2px solid $blue-grey-3;
}

.blog-archive__eyebrow,
.blog-archive__summary {
  margin: 0;
  color: $blue-grey-6;
  font-size: 0.82rem;
}

.blog-archive__eyebrow {
  margin-bottom: 3px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.blog-archive h2 {
  margin: 0;
  color: $blue-grey-10;
  font-size: clamp(1.55rem, 3vw, 2.1rem);
  line-height: 1.15;
}

.blog-archive__results {
  min-height: 180px;
}

.blog-state {
  display: grid;
  min-height: 180px;
  place-items: center;
  align-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}

.blog-state p {
  margin: 0;
}

.blog-pagination {
  display: flex;
  justify-content: center;
  padding-top: 24px;
}

.blog-pagination__status {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  margin: -1px;
  clip: rect(0, 0, 0, 0);
  overflow: hidden;
  white-space: nowrap;
}

.blog-pagination :deep(.q-field) {
  max-width: 8rem;
}

.blog-pagination__compact {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.blog-pagination__compact :deep(.q-field) {
  width: 6rem;
}

@media (max-width: 700px) {
  .blog-controls {
    grid-template-columns: minmax(0, 1fr);
  }

  .blog-archive__heading {
    align-items: start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
