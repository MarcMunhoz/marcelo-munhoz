<template>
  <article class="admin-article-card">
    <div class="admin-article-card__heading">
      <h3>{{ article.title }}</h3>
      <q-badge outline :color="statusColor(article.status)">{{ statusLabel(article.status) }}</q-badge>
    </div>

    <dl class="admin-article-card__metadata">
      <div>
        <dt>Author</dt>
        <dd>{{ article.displayAuthor }}</dd>
      </div>
      <div>
        <dt>Date</dt>
        <dd>{{ article.displayDate }}</dd>
      </div>
    </dl>

    <div class="admin-article-card__tags" aria-label="Article tags">
      <q-badge
        v-for="tag in article.displayTags"
        :key="tag.id"
        class="tag-filter-chip"
        :class="{ 'tag-filter-chip--selected': activeTag === tag.id }"
        :outline="activeTag !== tag.id"
        color="blue-grey-7"
        role="button"
        tabindex="0"
        :aria-pressed="activeTag === tag.id"
        @click="$emit('toggle-tag', tag.id)"
        @keyup.enter="$emit('toggle-tag', tag.id)"
        @keydown.space.prevent
        @keyup.space.prevent="$emit('toggle-tag', tag.id)"
      >
        {{ tag.label }}
      </q-badge>
    </div>

    <div class="admin-article-card__actions" aria-label="Article actions">
      <q-btn v-if="canEditArticleAction(article, session)" dense outline color="blue-grey-7" icon="edit" label="Edit" @click="$emit('edit', article)" />
      <q-btn v-if="canPrepareReviewAction(article, session)" dense outline color="blue-grey-7" icon="rate_review" label="Review" @click="$emit('review', article)" />
      <q-btn v-if="canRequestUnpublicationAction(article, session)" dense outline color="amber-9" icon="visibility_off" label="Request unpublication" :loading="loadingAction === 'unpublish'" @click="$emit('request-unpublication', article)" />
      <q-btn v-if="canOwnerPublishAction(article, session)" dense unelevated color="blue-grey-8" icon="publish" :label="article.lifecycleStatus === 'changed' ? 'Publish changes' : 'Publish'" :loading="loadingAction === `publish-${article.id}`" @click="$emit('publish', article)" />
      <q-btn v-if="canOwnerUnpublishAction(article, session)" dense outline color="amber-9" icon="visibility_off" label="Unpublish" :loading="loadingAction === `unpublish-${article.id}`" @click="$emit('unpublish', article)" />
      <q-btn v-if="canArchiveArticleAction(article, session)" dense outline color="blue-grey-7" icon="archive" label="Archive" :loading="loadingAction === `archive-${article.id}`" @click="$emit('archive', article)" />
      <q-btn v-if="canUnarchiveArticleAction(article, session)" dense outline color="blue-grey-7" icon="unarchive" label="Unarchive" :loading="loadingAction === `unarchive-${article.id}`" @click="$emit('unarchive', article)" />
      <q-btn v-if="canUnarchiveArticleAction(article, session)" dense outline color="negative" icon="delete_forever" label="Delete" :loading="loadingAction === `delete-${article.id}`" @click="$emit('delete', article)" />
    </div>
  </article>
</template>

<script>
import { defineComponent } from "vue";
import {
  canArchiveArticleAction,
  canEditArticleAction,
  canOwnerPublishAction,
  canOwnerUnpublishAction,
  canPrepareReviewAction,
  canRequestUnpublicationAction,
  canUnarchiveArticleAction,
} from "../utils/adminDashboard.js";

export default defineComponent({
  name: "AdminArticleCard",
  props: {
    article: { type: Object, required: true },
    session: { type: Object, default: null },
    activeTag: { type: String, default: "" },
    loadingAction: { type: String, default: "" },
  },
  emits: ["edit", "review", "request-unpublication", "publish", "unpublish", "archive", "unarchive", "delete", "toggle-tag"],
  methods: {
    canArchiveArticleAction,
    canEditArticleAction,
    canOwnerPublishAction,
    canOwnerUnpublishAction,
    canPrepareReviewAction,
    canRequestUnpublicationAction,
    canUnarchiveArticleAction,
    statusColor(status) {
      return {
        published: "teal-8",
        changed: "deep-orange-8",
        draft: "blue-grey-7",
        unpublished: "amber-9",
        unpublicationRequested: "amber-9",
        review: "indigo-7",
        archived: "grey-7",
      }[status] || "blue-grey-7";
    },
    statusLabel(status) {
      return {
        published: "Published",
        changed: "Unpublished changes",
        draft: "Draft",
        unpublished: "Unpublished",
        unpublicationRequested: "Unpublication requested",
        review: "In review",
        archived: "Archived",
      }[status] || "Draft";
    },
  },
});
</script>

<style lang="scss" scoped>
.admin-article-card {
  background: #ffffff;
  border: 1px solid #e0e6e8;
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
}

.admin-article-card__heading,
.admin-article-card__tags,
.admin-article-card__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-article-card__heading {
  justify-content: space-between;

  h3 {
    font-size: 1rem;
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.admin-article-card__metadata {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;

  div {
    min-width: 0;
  }

  dt {
    color: #607d8b;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  dd {
    color: #37474f;
    margin: 2px 0 0;
    overflow-wrap: anywhere;
  }
}

.admin-article-card__actions {
  align-items: stretch;

  :deep(.q-btn) {
    flex: 1 1 132px;
  }
}

.tag-filter-chip {
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #263238;
    outline-offset: 2px;
  }
}

.tag-filter-chip--selected {
  color: #ffffff;
}
</style>
