<template>
  <q-page class="admin-page">
    <section v-if="showAdminSurface" class="admin-shell">
      <section class="admin-workspace">
        <header class="admin-topbar">
          <div>
            <p class="admin-kicker">Blog admin</p>
            <h1>Editorial dashboard</h1>
          </div>

          <div class="admin-topbar-actions">
            <q-btn v-if="isOwner" outline no-caps color="blue-grey-8" icon="sell" label="Tags" to="/admin/tags" />
            <q-input v-model="filters.search" dense outlined clearable debounce="150" placeholder="Search articles" class="admin-search">
              <template #prepend>
                <q-icon name="search" />
              </template>
            </q-input>
          </div>
        </header>

        <section v-if="!canWrite" class="admin-blocked">
          <q-icon name="lock" size="30px" />
          <div>
            <h2>Writer access required</h2>
            <p>Sign in with an invited writer account to manage blog drafts.</p>
          </div>
        </section>

        <template v-else>
          <section class="status-grid" aria-label="Article status">
            <article class="status-card">
              <span>Published</span>
              <strong>{{ dashboardSummary.published }}</strong>
              <small>Live articles</small>
            </article>
            <article class="status-card">
              <span>Drafts</span>
              <strong>{{ dashboardSummary.drafts }}</strong>
              <small>Draft or unpublished</small>
            </article>
            <article class="status-card">
              <span>In review</span>
              <strong>{{ dashboardSummary.review }}</strong>
              <small>Owner queue</small>
            </article>
            <article class="status-card status-card-muted">
              <span>Page views pending</span>
              <strong>--</strong>
              <small>Free metrics source not connected</small>
            </article>
          </section>

          <div class="admin-filter-tabs" aria-label="Article filters">
            <q-btn-toggle
              :model-value="filters.status"
              flat
              no-caps
              toggle-color="blue-grey-8"
              :options="filterTabOptions"
              @update:model-value="setStatusFilter"
            />
          </div>

          <section class="admin-main-grid">
            <section class="article-queue-panel">
              <div class="panel-heading">
                <div>
                  <p class="admin-kicker">Article queue</p>
                  <h2>Articles</h2>
                </div>
                <q-btn unelevated color="blue-grey-8" icon="add" label="New article" @click="openEditorForNewArticle" />
              </div>

              <q-banner v-if="dashboardError" class="feedback-error dashboard-feedback" rounded>{{ dashboardError }}</q-banner>
              <q-banner v-if="feedbackMessage" :class="feedbackClass" class="dashboard-feedback" rounded>{{ feedbackMessage }}</q-banner>

              <div class="article-filters">
                <q-select v-model="filters.status" dense outlined clearable emit-value map-options label="Status" :options="statusOptions" />
                <q-input v-model="filters.tag" dense outlined clearable label="Tag" />
                <q-input v-model="filters.date" dense outlined clearable label="Date" type="date" />
                <q-input v-model="filters.author" dense outlined clearable label="Author" />
              </div>

              <q-table
                flat
                class="article-table"
                row-key="id"
                :rows="filteredArticles"
                :columns="articleColumns"
                :grid="compactArticleGrid"
                :loading="loadingAction === 'articles'"
                :pagination="{ rowsPerPage: 6 }"
                no-data-label="No articles match the current filters"
              >
                <template #item="props">
                  <div class="q-table__grid-item col-xs-12">
                    <admin-article-card
                      :article="props.row"
                      :session="session"
                      :active-tag="filters.tag"
                      :loading-action="loadingAction"
                      @edit="openEditorForArticle"
                      @review="openEditorForArticle"
                      @request-unpublication="requestUnpublicationFromRow"
                      @publish="publishSelectedArticle"
                      @unpublish="unpublishSelectedArticle"
                      @archive="archiveSelectedArticle"
                      @unarchive="unarchiveSelectedArticle"
                      @delete="openDeleteConfirmation"
                      @toggle-tag="toggleTagFilter"
                    />
                  </div>
                </template>

                <template #body-cell-status="props">
                  <q-td :props="props">
                    <span class="status-cell">
                      <q-badge outline :color="statusColor(props.row.status)">{{ statusLabel(props.row.status) }}</q-badge>
                    </span>
                  </q-td>
                </template>

                <template #body-cell-tags="props">
                  <q-td :props="props">
                    <span class="tag-list">
                      <q-badge
                        v-for="tag in props.row.displayTags"
                        :key="tag.id"
                        class="tag-filter-chip"
                        :class="{ 'tag-filter-chip--selected': filters.tag === tag.id }"
                        :outline="filters.tag !== tag.id"
                        color="blue-grey-7"
                        role="button"
                        tabindex="0"
                        :aria-pressed="filters.tag === tag.id"
                        @click="toggleTagFilter(tag.id)"
                        @keyup.enter="toggleTagFilter(tag.id)"
                        @keydown.space.prevent
                        @keyup.space.prevent="toggleTagFilter(tag.id)"
                      >
                        {{ tag.label }}
                      </q-badge>
                    </span>
                  </q-td>
                </template>

                <template #body-cell-actions="props">
                  <q-td :props="props" class="table-actions">
                    <q-btn v-if="canEditArticleAction(props.row, session)" dense flat round color="blue-grey-7" icon="edit" @click="openEditorForArticle(props.row)">
                      <q-tooltip>Edit article</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canPrepareReviewAction(props.row, session)" dense flat round color="blue-grey-7" icon="rate_review" @click="openEditorForArticle(props.row)">
                      <q-tooltip>Submit draft for review</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canRequestUnpublicationAction(props.row, session)" dense flat round color="amber-9" icon="visibility_off" :loading="loadingAction === `request-unpublication-${props.row.id}`" @click="requestUnpublicationFromRow(props.row)">
                      <q-tooltip>Request unpublication</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canOwnerPublishAction(props.row, session)" dense flat round color="blue-grey-8" icon="publish" @click="publishSelectedArticle(props.row)">
                      <q-tooltip>{{ props.row.lifecycleStatus === "changed" ? "Publish changes" : "Publish" }}</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canOwnerUnpublishAction(props.row, session)" dense flat round color="amber-9" icon="visibility_off" @click="unpublishSelectedArticle(props.row)">
                      <q-tooltip>Unpublish</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canArchiveArticleAction(props.row, session)" dense flat round color="blue-grey-7" icon="archive" @click="archiveSelectedArticle(props.row)">
                      <q-tooltip>Archive</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canUnarchiveArticleAction(props.row, session)" dense flat round color="blue-grey-7" icon="unarchive" @click="unarchiveSelectedArticle(props.row)">
                      <q-tooltip>Unarchive</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canUnarchiveArticleAction(props.row, session)" dense flat round color="negative" icon="delete_forever" @click="openDeleteConfirmation(props.row)">
                      <q-tooltip>Delete permanently</q-tooltip>
                    </q-btn>
                  </q-td>
                </template>
              </q-table>
            </section>

            <section v-if="isOwner" class="owner-review-panel">
              <div class="panel-heading">
                <div>
                  <p class="admin-kicker">Owner review</p>
                  <h2>Review queue</h2>
                </div>
                <q-badge outline color="blue-grey-7">{{ ownerQueueCount }} pending</q-badge>
              </div>

              <div class="owner-queue-grid">
                <article class="owner-queue">
                  <h3>Publication requests</h3>
                  <p v-if="ownerQueues.submissions.length === 0" class="empty-queue">No drafts waiting for publication.</p>
                  <div v-for="article in ownerQueues.submissions" :key="article.id" class="owner-queue-row">
                    <div>
                      <strong>{{ article.title }}</strong>
                      <span>{{ article.displayAuthor }} · {{ article.displayDate }}</span>
                    </div>
                    <div class="owner-actions">
                      <q-btn dense unelevated color="blue-grey-8" icon="publish" :label="article.lifecycleStatus === 'changed' ? 'Publish changes' : 'Publish'" :loading="loadingAction === `publish-${article.id}`" @click="publishSelectedArticle(article)" />
                      <q-btn v-if="canArchiveArticleAction(article, session)" dense outline color="blue-grey-7" icon="archive" label="Archive" :loading="loadingAction === `archive-${article.id}`" @click="archiveSelectedArticle(article)" />
                    </div>
                  </div>
                </article>

                <article class="owner-queue">
                  <h3>Unpublication requests</h3>
                  <p v-if="ownerQueues.unpublicationRequests.length === 0" class="empty-queue">No take-down requests waiting for review.</p>
                  <div v-for="article in ownerQueues.unpublicationRequests" :key="article.id" class="owner-queue-row">
                    <div>
                      <strong>{{ article.title }}</strong>
                      <span>{{ article.displayAuthor }} · {{ article.displayDate }}</span>
                    </div>
                    <div class="owner-actions">
                      <q-btn dense unelevated color="amber-9" icon="visibility_off" label="Unpublish" :loading="loadingAction === `unpublish-${article.id}`" @click="unpublishSelectedArticle(article)" />
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </section>
        </template>
      </section>
    </section>

    <section v-else class="admin-login-shell" aria-hidden="true"></section>

    <q-dialog v-model="deleteDialogOpen">
      <q-card class="delete-dialog">
        <q-card-section>
          <p class="admin-kicker">Owner action</p>
          <h2>Delete permanently</h2>
          <p>
            This permanently deletes <strong>{{ articlePendingDeletion?.title }}</strong>. Type the article title to confirm.
          </p>
          <q-input v-model="deleteConfirmation" outlined dense label="Article title" autofocus />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="blue-grey-7" label="Cancel" v-close-popup />
          <q-btn
            unelevated
            color="negative"
            icon="delete_forever"
            label="Delete permanently"
            :disable="deleteConfirmation !== articlePendingDeletion?.title"
            :loading="loadingAction === `delete-${articlePendingDeletion?.id}`"
            @click="confirmPermanentDeletion"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
defineOptions({ name: "AdminDashboardPage" });
import { computed, onBeforeUnmount, onMounted, reactive, toRefs } from "vue";
import { useRouter } from "vue-router";
import AdminArticleCard from "../components/AdminArticleCard.vue";
import {
  archiveArticle,
  deleteArticle,
  listAdminArticles,
  publishArticle,
  requestArticleUnpublication,
  unarchiveArticle,
  unpublishArticle,
  adminUserMessage,
} from "../utils/adminApi.js";
import {
  canArchiveArticleAction,
  canEditArticleAction,
  canOwnerPublishAction,
  canOwnerUnpublishAction,
  canPrepareReviewAction,
  canConfirmArticleDeletion,
  canRequestUnpublicationAction,
  canUnarchiveArticleAction,
  filterAdminArticles,
  ownerReviewQueues,
  removeArticleById,
  reconcileAdminDashboardData,
  summarizeArticleStatuses,
  updateArticleStatusById,
} from "../utils/adminDashboard.js";
import { toggleArticleTagFilter } from "../utils/adminTags.js";
import { bindIdentityCallbacks, getAdminSession, isOwnerSession, isWriterSession, signOutAdmin } from "../utils/adminAuth.js";
import { observeMediaQuery } from "../utils/responsiveMedia.js";

const router = useRouter();
let active = true;
let dashboardRequestId = 0;
let stopIdentityCallbacks = () => {};
const state = reactive({
      session: null,
      sessionResolved: false,
      activeSection: "dashboard",
      articles: [],
      adminSummary: summarizeArticleStatuses([]),
      reviewRequests: [],
      filters: {
        search: "",
        status: "",
        tag: "",
        date: "",
        author: "",
      },
      deleteDialogOpen: false,
      articlePendingDeletion: null,
      deleteConfirmation: "",
      feedbackMessage: "",
      feedbackTone: "info",
      feedbackTimer: null,
      dashboardError: "",
      loadingAction: "",
      compactArticleGrid: false,
      stopCompactArticleGridObserver: null,
      articleColumns: [
        { name: "title", label: "Title", field: "title", align: "left", sortable: true },
        { name: "status", label: "Status", field: "status", align: "left", sortable: true },
        { name: "tags", label: "Tags", field: "tags", align: "left" },
        { name: "createAt", label: "Date", field: "displayDate", align: "left", sortable: true },
        { name: "author", label: "Author", field: "displayAuthor", align: "left", sortable: true },
        { name: "actions", label: "Actions", field: "actions", align: "right" },
      ],
      statusOptions: [
        { label: "Published", value: "published" },
        { label: "Unpublished changes", value: "changed" },
        { label: "Draft", value: "draft" },
        { label: "Unpublished", value: "unpublished" },
        { label: "Unpublication requested", value: "unpublicationRequested" },
        { label: "In review", value: "review" },
        { label: "Archived", value: "archived" },
      ],
      filterTabOptions: [
        { label: "All", value: "" },
        { label: "Drafts", value: "draft" },
        { label: "Review", value: "review" },
        { label: "Published", value: "published" },
        { label: "Archived", value: "archived" },
      ],
});
const {
  session, sessionResolved, articles, adminSummary, reviewRequests, filters, deleteDialogOpen,
  articlePendingDeletion, deleteConfirmation, feedbackMessage, dashboardError, loadingAction,
  compactArticleGrid, articleColumns, statusOptions, filterTabOptions,
} = toRefs(state);
const canWrite = computed(() => isWriterSession(state.session));
const showAdminSurface = computed(() => state.sessionResolved);
const isOwner = computed(() => isOwnerSession(state.session));
const dashboardSummary = computed(() => state.adminSummary || summarizeArticleStatuses(state.articles));
const ownerQueues = computed(() => ownerReviewQueues(state.articles));
const ownerQueueCount = computed(() => ownerQueues.value.submissions.length + ownerQueues.value.unpublicationRequests.length);
const filteredArticles = computed(() => filterAdminArticles(state.articles, state.filters));
const feedbackClass = computed(() => ({
  "feedback-success": state.feedbackTone === "success",
  "feedback-error": state.feedbackTone === "error",
  "feedback-info": state.feedbackTone === "info",
}));
const registerIdentityCallbacks = () => {
  const identity = globalThis.netlifyIdentity;
  stopIdentityCallbacks = bindIdentityCallbacks({
    identity,
    onLogin: async () => {
      identity?.close?.();
      const sessionAfterLogin = await getAdminSession();
      if (!active) return;
      state.session = sessionAfterLogin;
      await loadArticleDashboard();
    },
  });
};
const redirectSignedOutVisitor = () => {
      if (!state.session) {
        router.replace("/");
      }
};
const applyResolvedSession = (session = {}) => {
  if (session.authorEntryId) state.session = { ...state.session, authorEntryId: session.authorEntryId };
};
const loadArticleDashboard = async () => {
      const currentRequestId = ++dashboardRequestId;
      if (!canWrite.value) {
        return;
      }

      state.dashboardError = "";
      state.loadingAction = "articles";

      try {
        const response = await listAdminArticles({ session: state.session });
        if (!active || currentRequestId !== dashboardRequestId) return;
        applyResolvedSession(response.session);
        const dashboard = reconcileAdminDashboardData(response);
        state.articles = dashboard.articles;
        state.adminSummary = dashboard.summary;
        state.reviewRequests = dashboard.reviewRequests;
      } catch (error) {
        if (!active || currentRequestId !== dashboardRequestId) return;
        state.articles = [];
        state.adminSummary = summarizeArticleStatuses([]);
        state.reviewRequests = [];
        state.dashboardError = adminUserMessage(error);
      } finally {
        if (active && currentRequestId === dashboardRequestId) state.loadingAction = "";
      }
};
const setStatusFilter = (status) => { state.filters.status = state.filters.status === status ? "" : status || ""; state.activeSection = "dashboard"; };
const toggleTagFilter = (tagId) => { state.filters = toggleArticleTagFilter(state.filters, tagId); };
const openEditorForNewArticle = () => router.push("/admin/articles/new");
const openEditorForArticle = (article) => router.push(`/admin/articles/${encodeURIComponent(article.slug || article.id)}/edit`);
const statusColor = (status) => {
      return {
        published: "teal-8",
        changed: "deep-orange-8",
        draft: "blue-grey-7",
        unpublished: "amber-9",
        unpublicationRequested: "amber-9",
        review: "indigo-7",
        archived: "grey-7",
      }[status] || "blue-grey-7";
};
const statusLabel = (status) => {
      return {
        published: "Published",
        changed: "Unpublished changes",
        draft: "Draft",
        unpublished: "Unpublished",
        unpublicationRequested: "Unpublication requested",
        review: "In review",
        archived: "Archived",
      }[status] || "Draft";
};
const signOut = async () => {
      const signedOut = await signOutAdmin();

      if (signedOut) {
        state.session = null; state.articles = []; state.adminSummary = summarizeArticleStatuses([]); state.reviewRequests = [];
      }
};
const requestUnpublicationFromRow = async (article) => {
      state.loadingAction = `request-unpublication-${article.id}`;

      try {
        await requestArticleUnpublication({
          articleId: article.id,
          version: article.version,
          notes: "",
          session: state.session,
        });
        await loadArticleDashboard(); showFeedback("Unpublication request sent.", "success");
      } catch (error) {
        handleAdminError(error);
      } finally {
        state.loadingAction = "";
      }
};
const updateArticleStatus = (articleId, status) => { state.articles = updateArticleStatusById(state.articles, articleId, status); };
const removeArticle = (articleId) => { state.articles = removeArticleById(state.articles, articleId); };
const showFeedback = (message, tone = "info") => {
  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
  state.feedbackMessage = message; state.feedbackTone = tone;
  state.feedbackTimer = setTimeout(() => { state.feedbackMessage = ""; state.feedbackTimer = null; }, 5000);
};
const handleAdminError = (error) => showFeedback(adminUserMessage(error), "error");
const runOwnerLifecycleAction = async (article, actionName, operation, successMessage, afterSuccess) => {
      if (!isOwner.value) {
        showFeedback("Only owners can perform this action.", "error");
        return;
      }

      state.loadingAction = `${actionName}-${article.id}`;

      try {
        const result = await operation({
          articleId: article.id,
          version: article.version,
          requestId: article.requestId,
          requestVersion: article.requestVersion,
          session: state.session,
        });
        afterSuccess?.();
        await loadArticleDashboard();
        if (result?.editorialRequestClosurePending) {
          showFeedback("Article published. Review cleanup is pending.", "info");
        } else {
          showFeedback(successMessage, "success");
        }
      } catch (error) {
        handleAdminError(error);
      } finally {
        state.loadingAction = "";
      }
};
const publishSelectedArticle = (article) => {
      const successMessage = article.lifecycleStatus === "changed" ? "Article changes published." : "Article published.";
      return runOwnerLifecycleAction(article, "publish", publishArticle, successMessage, () => updateArticleStatus(article.id, "published"));
};
const unpublishSelectedArticle = (article) => runOwnerLifecycleAction(article, "unpublish", unpublishArticle, "Article unpublished.", () => updateArticleStatus(article.id, "unpublished"));
const archiveSelectedArticle = (article) => runOwnerLifecycleAction(article, "archive", archiveArticle, "Article archived.", () => updateArticleStatus(article.id, "archived"));
const unarchiveSelectedArticle = (article) => runOwnerLifecycleAction(article, "unarchive", unarchiveArticle, "Article unarchived.", () => updateArticleStatus(article.id, "draft"));
const openDeleteConfirmation = (article) => {
      if (!isOwner.value) {
        showFeedback("Only owners can perform this action.", "error");
        return;
      }

      state.articlePendingDeletion = article; state.deleteConfirmation = ""; state.deleteDialogOpen = true;
};
const confirmPermanentDeletion = async () => {
      const article = state.articlePendingDeletion;

      if (!canConfirmArticleDeletion(article, state.deleteConfirmation)) {
        return;
      }

      await runOwnerLifecycleAction(article, "delete", deleteArticle, "Article permanently deleted.", () => removeArticle(article.id));
      state.deleteDialogOpen = false; state.articlePendingDeletion = null; state.deleteConfirmation = "";
};
onMounted(async () => {
  state.stopCompactArticleGridObserver = observeMediaQuery("(max-width: 720px)", (matches) => { state.compactArticleGrid = matches; });
  registerIdentityCallbacks();
  const initialSession = await getAdminSession();
  if (!active) return;
  state.session = initialSession; state.sessionResolved = true; redirectSignedOutVisitor(); loadArticleDashboard();
});
onBeforeUnmount(() => {
  active = false;
  dashboardRequestId += 1;
  stopIdentityCallbacks();
  state.stopCompactArticleGridObserver?.();
  if (state.feedbackTimer) clearTimeout(state.feedbackTimer);
});
</script>

<style lang="scss" scoped>
.admin-page {
  background: #f2f4f3;
  color: #263238;
  min-height: inherit;
}

.admin-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: calc(100vh - 98px);
  width: 100%;
}

.admin-login-shell {
  min-height: calc(100vh - 98px);
}

.admin-workspace {
  min-width: 0;
  padding: 22px;
}

.admin-topbar,
.admin-topbar-actions,
.panel-heading,
.article-filters,
.form-row,
.editor-actions,
.media-fields-title {
  display: flex;
  gap: 14px;
}

.admin-topbar {
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 20px;

  h1 {
    font-size: 1.8rem;
    line-height: 1.15;
    margin: 0;
  }
}

.admin-topbar-actions {
  align-items: center;
  flex: 1 1 360px;
  flex-wrap: wrap;
  justify-content: flex-end;
  min-width: 0;
}

.admin-search {
  flex: 1 1 240px;
  min-width: min(260px, 100%);
}

.admin-kicker {
  color: #607d8b;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.admin-filter-tabs {
  margin: 0 0 14px;
  max-width: 100%;
  overflow-x: auto;
}

.admin-filter-tabs .q-btn-toggle {
  width: max-content;
}

.admin-blocked {
  align-items: center;
  background: #ffffff;
  border-left: 4px solid #b7791f;
  display: flex;
  gap: 16px;
  padding: 18px;
}

.status-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin-bottom: 18px;
}

.status-card,
.article-queue-panel,
.owner-review-panel {
  background: #ffffff;
  border: 1px solid #cfd8dc;
}

.status-card {
  min-height: 112px;
  padding: 16px;

  span,
  small {
    color: #607d8b;
    display: block;
  }

  strong {
    color: #263238;
    display: block;
    font-size: 2rem;
    line-height: 1.15;
    margin: 8px 0 4px;
  }
}

.status-card-muted {
  background: #eef3f5;
}

.admin-main-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr);
}

.article-queue-panel,
.owner-review-panel {
  min-width: 0;
  padding: 16px;
}

.owner-review-panel {
  grid-column: 1 / -1;
}

.owner-queue-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.owner-queue {
  border: 1px solid #e0e6e8;
  display: grid;
  gap: 10px;
  padding: 12px;

  h3 {
    color: #37474f;
    font-size: 1rem;
    margin: 0;
  }
}

.owner-queue-row {
  align-items: center;
  border-top: 1px solid #edf1f2;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding-top: 10px;

  span {
    color: #607d8b;
    display: block;
    font-size: 0.82rem;
  }
}

.owner-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.empty-queue {
  color: #607d8b;
  margin: 0;
}

.panel-heading {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;

  h2 {
    font-size: 1.25rem;
    margin: 0;
  }
}

.compact {
  align-items: center;
}

.article-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  margin-bottom: 12px;
}

.article-table {
  border: 1px solid #e0e6e8;
  overflow-x: auto;
}

.dashboard-feedback {
  margin-bottom: 12px;
}

.tag-list {
  align-items: center;
  color: #455a64;
  display: flex;
  flex-wrap: wrap;
  font-size: 0.86rem;
  gap: 6px;
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

.status-cell {
  align-items: center;
  display: flex;
  justify-content: flex-start;
  min-height: 32px;
}

.table-actions {
  align-items: center;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  min-width: 120px;
  white-space: nowrap;
}

.editor-drawer {
  background: #ffffff;
  max-width: 100vw;
  width: min(560px, 100vw);
}

.editor-drawer-body {
  display: grid;
  gap: 14px;
  min-height: 100%;
  overflow-y: auto;
  padding: 18px;
}

.editor-drawer-header {
  border-bottom: 1px solid #e0e6e8;
  padding-bottom: 12px;
}

.editor-drawer-actions {
  align-items: center;
  display: flex;
  gap: 8px;
}

.editor-form {
  display: grid;
  gap: 12px;
}

.form-row {
  > * {
    flex: 1 1 0;
  }
}

.media-fields {
  border: 1px dashed #b0bec5;
  display: grid;
  gap: 10px;
  padding: 12px;
}

.media-fields-title {
  align-items: center;
  color: #455a64;
  font-weight: 700;
}

.media-actions {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(140px, 180px) minmax(0, 1fr);
}

.media-upload {
  min-width: 0;
}

.thumbnail-preview {
  align-items: center;
  background: #eef3f5;
  border: 1px solid #dbe3e6;
  display: flex;
  gap: 12px;
  min-height: 148px;
  overflow: hidden;

  img {
    aspect-ratio: 16 / 9;
    display: block;
    object-fit: cover;
    width: 100%;
  }
}

.thumbnail-preview.empty {
  color: #607d8b;
  justify-content: center;
}

.tag-editor {
  display: grid;
  gap: 8px;
}

.tag-chip-list {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
}

.media-dialog {
  min-width: min(920px, 92vw);
}

.media-dialog-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;

  .media-upload {
    max-width: 360px;
    width: min(360px, 100%);
  }
}

.media-state-banner {
  margin-bottom: 14px;
}

.media-empty-state {
  align-items: center;
  border: 1px dashed #b0bec5;
  color: #607d8b;
  display: grid;
  justify-items: center;
  min-height: 180px;
  padding: 24px;
  text-align: center;

  strong {
    color: #37474f;
  }
}

.delete-dialog {
  max-width: 520px;
  width: min(520px, 92vw);

  h2 {
    font-size: 1.25rem;
    margin: 0 0 12px;
  }
}

.media-dialog-header {
  align-items: flex-start;
  border-bottom: 1px solid #e0e6e8;
  display: flex;
  justify-content: space-between;

  h2 {
    font-size: 1.25rem;
    margin: 0;
  }
}

.media-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  min-height: 180px;
}

.media-asset {
  background: #ffffff;
  border: 1px solid #cfd8dc;
  color: #263238;
  cursor: pointer;
  display: grid;
  gap: 8px;
  grid-template-rows: auto auto 1fr;
  padding: 8px;
  text-align: left;

  img {
    aspect-ratio: 16 / 10;
    background: #eef3f5;
    object-fit: cover;
    width: 100%;
  }

  span {
    color: #455a64;
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }

  &:hover,
  &:focus {
    border-color: #607d8b;
    outline: 2px solid rgba(96, 125, 139, 0.24);
  }
}

.media-asset-title {
  color: #263238;
  font-size: 0.88rem;
  line-height: 1.25;
}

.editor-actions {
  flex-wrap: wrap;
}

.feedback-success {
  background: #e4f4ef;
  color: #176b5d;
}

.feedback-error {
  background: #fff3e0;
  color: #8a4b08;
}

.feedback-info {
  background: #eef3f5;
  color: #455a64;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .admin-workspace {
    padding: 16px;
  }

  .owner-queue-row,
  .form-row,
  .media-actions {
    grid-template-columns: 1fr;
  }

  .editor-drawer {
    width: min(520px, 100vw);
  }

  .panel-heading,
  .admin-topbar-actions {
    align-items: stretch;
  }
}

@media (max-width: 1100px) {
  .admin-shell,
  .admin-main-grid,
  .owner-queue-grid {
    grid-template-columns: 1fr;
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .admin-workspace {
    padding: 14px;
  }

  .admin-topbar,
  .admin-topbar-actions,
  .form-row,
  .owner-queue-row {
    align-items: stretch;
    flex-direction: column;
  }

  .admin-topbar-actions {
    flex: 0 1 auto;
  }

  .owner-queue-row {
    display: flex;
    overflow: visible;
  }

  .panel-heading {
    flex-direction: column;
  }

  .owner-actions {
    justify-content: flex-start;
  }

  .admin-search {
    flex: 0 1 auto;
    min-width: 0;
    width: 100%;
  }

  .status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .article-filters,
  .media-actions {
    grid-template-columns: 1fr;
  }

  .editor-drawer {
    width: 100vw;
  }

  .table-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 340px) {
  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
