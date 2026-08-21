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

      <BlogHighlights v-if="featured.length" :articles="featured" :return-to="$route.fullPath" />

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

          <BlogArchiveList v-else :articles="articles" :return-to="$route.fullPath" />
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

<script>
import { defineComponent } from "vue";
import BlogArchiveList from "../components/BlogArchiveList.vue";
import BlogHighlights from "../components/BlogHighlights.vue";
import { buildApiUrl } from "../utils/apiBase.js";
import { blogRouteQuery, normalizeBlogRouteQuery } from "../utils/blogArchive.js";

const sameArchiveState = (left, right) => ["page", "q", "year", "tag"].every((key) => left[key] === right[key]);

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const hasValidArticleTags = (article) => {
  const tags = article.metadata?.tags;

  if (tags === undefined) {
    return true;
  }

  return (
    Array.isArray(tags) &&
    tags.every((tag) => isRecord(tag) && isRecord(tag.sys) && typeof tag.sys.id === "string" && tag.sys.id.trim().length > 0)
  );
};

const isBlogArticle = (article) => {
  const fields = article?.fields;

  return (
    article !== null &&
    typeof article === "object" &&
    !Array.isArray(article) &&
    fields !== null &&
    typeof fields === "object" &&
    !Array.isArray(fields) &&
    typeof fields.title === "string" &&
    fields.title.trim().length > 0 &&
    typeof fields.slug === "string" &&
    fields.slug.trim().length > 0 &&
    hasValidArticleTags(article)
  );
};

const validateBlogIndexPayload = (payload) => {
  const validCollection = (items, limit) => Array.isArray(items) && items.length <= limit && items.every(isBlogArticle);
  const valid =
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    validCollection(payload.featured, 3) &&
    validCollection(payload.items, 12) &&
    Number.isInteger(payload.total) &&
    payload.total >= 0 &&
    Number.isInteger(payload.page) &&
    payload.page >= 1 &&
    payload.pageSize === 12 &&
    Number.isInteger(payload.totalPages) &&
    payload.totalPages >= 1 &&
    payload.page <= payload.totalPages;

  if (!valid) {
    throw new TypeError("Invalid blog index payload");
  }

  return payload;
};

const validateBlogYearsPayload = (payload) => {
  const years = payload?.years;
  const validYears =
    Array.isArray(years) &&
    years.every((year) => /^(?:19\d{2}|20\d{2}|2100)$/.test(year)) &&
    new Set(years).size === years.length &&
    years.every((year, index) => index === 0 || Number(year) < Number(years[index - 1]));

  if (!isRecord(payload) || !validYears) {
    throw new TypeError("Invalid blog years payload");
  }

  return payload;
};

export default defineComponent({
  name: "BlogPage",
  components: {
    BlogArchiveList,
    BlogHighlights,
  },
  data() {
    const archiveState = normalizeBlogRouteQuery(this.$route.query);

    return {
      archiveState,
      searchInput: archiveState.q,
      featured: [],
      articles: [],
      yearOptions: [],
      yearsLoading: false,
      tagOptions: [],
      tagsLoading: false,
      loading: true,
      error: "",
      total: 0,
      totalPages: 1,
      pageSize: 12,
      searchTimer: null,
      archiveRequestId: 0,
    };
  },
  computed: {
    compactPagination() {
      return this.$q.screen.lt.sm;
    },
    paginationDisplay() {
      const compact = this.$q.screen.lt.sm;

      return {
        input: compact,
        boundaryLinks: false,
        boundaryNumbers: !compact,
        ellipses: !compact,
        maxPages: compact ? 1 : 9,
      };
    },
  },
  watch: {
    "$route.query": {
      deep: true,
      handler(query) {
        this.applyRouteQuery(query);
      },
    },
  },
  created() {
    this.ensureCanonicalRoute(this.$route.query, this.archiveState);
    this.loadYears();
    this.loadTags();
    this.loadArchive();
  },
  beforeUnmount() {
    clearTimeout(this.searchTimer);
    this.archiveRequestId += 1;
  },
  methods: {
    isCanonicalRouteQuery(query, state) {
      const canonical = blogRouteQuery(state);
      const queryKeys = Object.keys(query);
      const canonicalKeys = Object.keys(canonical);

      return (
        queryKeys.length === canonicalKeys.length &&
        canonicalKeys.every((key) => !Array.isArray(query[key]) && String(query[key] ?? "") === canonical[key])
      );
    },
    ensureCanonicalRoute(query, state) {
      if (!this.isCanonicalRouteQuery(query, state)) {
        this.$router.replace({ query: blogRouteQuery(state) });
      }
    },
    applyRouteQuery(query) {
      clearTimeout(this.searchTimer);
      const nextState = normalizeBlogRouteQuery(query);
      const changed = !sameArchiveState(nextState, this.archiveState);

      this.archiveState = nextState;
      this.searchInput = nextState.q;
      this.ensureCanonicalRoute(query, nextState);

      if (changed) {
        this.loadArchive();
      }
    },
    onSearchInput(value) {
      this.searchInput = String(value || "");
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.replaceArchiveState({ q: this.searchInput, page: 1 });
      }, 300);
    },
    onFilterChange(key, value) {
      clearTimeout(this.searchTimer);
      this.replaceArchiveState({ q: this.searchInput, [key]: value || "", page: 1 });
    },
    replaceArchiveState(patch) {
      const nextState = normalizeBlogRouteQuery({ ...this.archiveState, ...patch });
      this.$router.replace({ query: blogRouteQuery(nextState) });
    },
    changePage(page) {
      const nextState = normalizeBlogRouteQuery({ ...this.archiveState, page });
      this.$router.push({ query: blogRouteQuery(nextState) });
    },
    changePageFromInput(value) {
      const rawValue = value?.target?.value ?? value;
      const parsedPage = Number.parseInt(String(rawValue ?? ""), 10);
      const page = Number.isFinite(parsedPage) ? Math.min(this.totalPages, Math.max(1, parsedPage)) : this.archiveState.page;

      if (page !== this.archiveState.page) {
        this.changePage(page);
      }
    },
    async loadYears() {
      this.yearsLoading = true;

      try {
        const response = await fetch(buildApiUrl("/api/contentful/blog-years"));

        if (!response.ok) {
          throw new Error(`Blog years API returned ${response.status}`);
        }

        const data = validateBlogYearsPayload(await response.json());
        this.yearOptions = data.years.map((year) => ({ label: year, value: year }));
      } catch (error) {
        console.error("Erro ao carregar anos do blog:", error);
        this.yearOptions = [];
      } finally {
        this.yearsLoading = false;
      }
    },
    async loadTags() {
      this.tagsLoading = true;

      try {
        const response = await fetch(buildApiUrl("/api/contentful/tags"));

        if (!response.ok) {
          throw new Error(`Tags API returned ${response.status}`);
        }

        const data = await response.json();
        this.tagOptions = (data.items || [])
          .map((tag) => ({
            label: String(tag.name || tag.sys?.id || ""),
            value: String(tag.sys?.id || ""),
          }))
          .filter((tag) => tag.value);
      } catch (error) {
        console.error("Erro ao carregar tags:", error);
        this.tagOptions = [];
      } finally {
        this.tagsLoading = false;
      }
    },
    async loadArchive() {
      const requestId = ++this.archiveRequestId;
      const params = new URLSearchParams(blogRouteQuery(this.archiveState));
      const queryString = params.toString();

      this.loading = true;
      this.error = "";
      this.featured = [];

      try {
        const response = await fetch(buildApiUrl(`/api/contentful/blog-index${queryString ? `?${queryString}` : ""}`));

        if (!response.ok) {
          throw new Error(`Blog API returned ${response.status}`);
        }

        const data = validateBlogIndexPayload(await response.json());

        if (requestId !== this.archiveRequestId) {
          return;
        }

        const returnedPage = normalizeBlogRouteQuery({ ...this.archiveState, page: data.page }).page;
        this.featured = Array.isArray(data.featured) ? data.featured : [];
        this.articles = Array.isArray(data.items) ? data.items : [];
        this.total = Number.isFinite(Number(data.total)) ? Math.max(0, Number(data.total)) : 0;
        this.totalPages = Number.isFinite(Number(data.totalPages)) ? Math.max(1, Number(data.totalPages)) : 1;
        this.pageSize = 12;

        if (returnedPage !== this.archiveState.page) {
          this.archiveState = { ...this.archiveState, page: returnedPage };
          this.$router.replace({ query: blogRouteQuery(this.archiveState) });
        }
      } catch (error) {
        if (requestId !== this.archiveRequestId) {
          return;
        }

        console.error("Erro ao carregar artigos:", error);
        this.featured = [];
        this.articles = [];
        this.error = "archive-load-failed";
      } finally {
        if (requestId === this.archiveRequestId) {
          this.loading = false;
        }
      }
    },
  },
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
