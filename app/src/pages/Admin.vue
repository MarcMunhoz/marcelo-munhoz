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
            <q-btn outline color="blue-grey-7" icon="login" label="Sign in" size="sm" @click="openLogin" />
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
                :loading="loadingAction === 'articles'"
                :pagination="{ rowsPerPage: 6 }"
                no-data-label="No articles match the current filters"
              >
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
                      <q-badge v-for="tag in props.row.displayTags" :key="tag.id" outline color="blue-grey-7">{{ tag.label }}</q-badge>
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
                    <q-btn v-if="canRequestUnpublicationAction(props.row, session)" dense flat round color="amber-9" icon="visibility_off" @click="requestUnpublicationFromRow(props.row)">
                      <q-tooltip>Request unpublication</q-tooltip>
                    </q-btn>
                    <q-btn v-if="canOwnerPublishAction(props.row, session)" dense flat round color="blue-grey-8" icon="publish" @click="publishSelectedArticle(props.row)">
                      <q-tooltip>Publish</q-tooltip>
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
                      <q-btn dense unelevated color="blue-grey-8" icon="publish" label="Publish" :loading="loadingAction === `publish-${article.id}`" @click="publishSelectedArticle(article)" />
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

<script>
import { defineComponent } from "vue";
import {
  archiveArticle,
  deleteArticle,
  listAdminArticles,
  publishArticle,
  requestArticleUnpublication,
  unarchiveArticle,
  unpublishArticle,
  adminUserMessage,
  AdminApiError,
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
import { getAdminSession, isOwnerSession, isWriterSession, openAdminLogin, signOutAdmin } from "../utils/adminAuth.js";

export default defineComponent({
  name: "AdminPage",
  data() {
    return {
      session: null,
      sessionResolved: false,
      loginRedirecting: false,
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
      articleColumns: [
        { name: "title", label: "Title", field: "title", align: "left", sortable: true },
        { name: "status", label: "Status", field: "status", align: "left", sortable: true },
        { name: "tags", label: "Tags", field: "tags", align: "left" },
        { name: "createAt", label: "Date", field: "displayDate", align: "left", sortable: true },
        { name: "author", label: "Author", field: "displayAuthor", align: "left", sortable: true },
        { name: "actions", label: "", field: "actions", align: "right" },
      ],
      statusOptions: [
        { label: "Published", value: "published" },
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
    };
  },
  computed: {
    canWrite() {
      return isWriterSession(this.session);
    },
    showAdminSurface() {
      return this.sessionResolved && !this.loginRedirecting;
    },
    isOwner() {
      return isOwnerSession(this.session);
    },
    dashboardSummary() {
      return this.adminSummary || summarizeArticleStatuses(this.articles);
    },
    ownerQueues() {
      return ownerReviewQueues(this.articles);
    },
    ownerQueueCount() {
      return this.ownerQueues.submissions.length + this.ownerQueues.unpublicationRequests.length;
    },
    filteredArticles() {
      return filterAdminArticles(this.articles, this.filters);
    },
    feedbackClass() {
      return {
        "feedback-success": this.feedbackTone === "success",
        "feedback-error": this.feedbackTone === "error",
        "feedback-info": this.feedbackTone === "info",
      };
    },
  },
  async mounted() {
    this.bindIdentityCallbacks();
    this.session = await getAdminSession();
    this.sessionResolved = true;
    this.redirectToLoginIfSignedOut();
    this.loadArticleDashboard();
  },
  beforeUnmount() {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
  },
  methods: {
    bindIdentityCallbacks() {
      const identity = globalThis.netlifyIdentity;

      if (typeof identity?.on !== "function") {
        return;
      }

      identity.on("login", async () => {
        if (typeof identity.close === "function") {
          identity.close();
        }

        this.loginRedirecting = false;
        this.session = await getAdminSession();
        this.loadArticleDashboard();
      });
    },
    openLogin() {
      openAdminLogin();
    },
    redirectToLoginIfSignedOut() {
      if (!this.session) {
        this.loginRedirecting = true;
        this.openLogin();
      }
    },
    async loadArticleDashboard() {
      if (!this.canWrite) {
        return;
      }

      this.dashboardError = "";
      this.loadingAction = "articles";

      try {
        const response = await listAdminArticles({ session: this.session });
        this.applyResolvedSession(response.session);
        const dashboard = reconcileAdminDashboardData(response);
        this.articles = dashboard.articles;
        this.adminSummary = dashboard.summary;
        this.reviewRequests = dashboard.reviewRequests;
      } catch (error) {
        this.articles = [];
        this.adminSummary = summarizeArticleStatuses([]);
        this.reviewRequests = [];
        this.dashboardError = adminUserMessage(error);
      } finally {
        this.loadingAction = "";
      }
    },
    setStatusFilter(status) {
      this.filters.status = this.filters.status === status ? "" : status || "";
      this.activeSection = "dashboard";
    },
    openEditorForNewArticle() {
      this.$router.push("/admin/articles/new");
    },
    applyResolvedSession(session = {}) {
      if (!session.authorEntryId) {
        return;
      }

      this.session = {
        ...this.session,
        authorEntryId: session.authorEntryId,
      };
    },
    openEditorForArticle(article) {
      this.$router.push(`/admin/articles/${encodeURIComponent(article.slug || article.id)}/edit`);
    },
    startNewArticle() {
      this.openEditorForNewArticle();
    },
    editArticle(article) {
      this.openEditorForArticle(article);
    },
    statusColor(status) {
      return {
        published: "teal-8",
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
        draft: "Draft",
        unpublished: "Unpublished",
        unpublicationRequested: "Unpublication requested",
        review: "In review",
        archived: "Archived",
      }[status] || "Draft";
    },
    async signOut() {
      const signedOut = await signOutAdmin();

      if (signedOut) {
        this.session = null;
        this.articles = [];
        this.adminSummary = summarizeArticleStatuses([]);
        this.reviewRequests = [];
      }
    },
    canEditArticleAction,
    canPrepareReviewAction,
    canRequestUnpublicationAction,
    canOwnerPublishAction,
    canOwnerUnpublishAction,
    canArchiveArticleAction,
    async requestUnpublicationFromRow(article) {
      this.loadingAction = "unpublish";

      try {
        await requestArticleUnpublication({
          articleId: article.id,
          version: article.version,
          notes: "",
          session: this.session,
        });
        await this.loadArticleDashboard();
        this.showFeedback("Unpublication request sent.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    updateArticleStatus(articleId, status) {
      this.articles = updateArticleStatusById(this.articles, articleId, status);
    },
    removeArticle(articleId) {
      this.articles = removeArticleById(this.articles, articleId);
    },
    async runOwnerLifecycleAction(article, actionName, operation, successMessage, afterSuccess) {
      if (!this.isOwner) {
        this.showFeedback("Only owners can perform this action.", "error");
        return;
      }

      this.loadingAction = `${actionName}-${article.id}`;

      try {
        await operation({
          articleId: article.id,
          version: article.version,
          session: this.session,
        });
        afterSuccess?.();
        await this.loadArticleDashboard();
        this.showFeedback(successMessage, "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    publishSelectedArticle(article) {
      return this.runOwnerLifecycleAction(article, "publish", publishArticle, "Article published.", () => this.updateArticleStatus(article.id, "published"));
    },
    unpublishSelectedArticle(article) {
      return this.runOwnerLifecycleAction(article, "unpublish", unpublishArticle, "Article unpublished.", () => this.updateArticleStatus(article.id, "unpublished"));
    },
    archiveSelectedArticle(article) {
      return this.runOwnerLifecycleAction(article, "archive", archiveArticle, "Article archived.", () => this.updateArticleStatus(article.id, "archived"));
    },
    unarchiveSelectedArticle(article) {
      return this.runOwnerLifecycleAction(article, "unarchive", unarchiveArticle, "Article unarchived.", () => this.updateArticleStatus(article.id, "draft"));
    },
    openDeleteConfirmation(article) {
      if (!this.isOwner) {
        this.showFeedback("Only owners can perform this action.", "error");
        return;
      }

      this.articlePendingDeletion = article;
      this.deleteConfirmation = "";
      this.deleteDialogOpen = true;
    },
    async confirmPermanentDeletion() {
      const article = this.articlePendingDeletion;

      if (!canConfirmArticleDeletion(article, this.deleteConfirmation)) {
        return;
      }

      await this.runOwnerLifecycleAction(article, "delete", deleteArticle, "Article permanently deleted.", () => this.removeArticle(article.id));
      this.deleteDialogOpen = false;
      this.articlePendingDeletion = null;
      this.deleteConfirmation = "";
    },
    handleAdminError(error) {
      if (error instanceof AdminApiError) {
        this.showFeedback(adminUserMessage(error), "error");
        return;
      }

      this.showFeedback(adminUserMessage(error), "error");
    },
    showFeedback(message, tone = "info") {
      if (this.feedbackTimer) {
        clearTimeout(this.feedbackTimer);
      }

      this.feedbackMessage = message;
      this.feedbackTone = tone;
      this.feedbackTimer = setTimeout(() => {
        this.feedbackMessage = "";
        this.feedbackTimer = null;
      }, 5000);
    },
  },
});
</script>

<style lang="scss" scoped>
.admin-page {
  background: #f2f4f3;
  color: #263238;
  min-height: inherit;
  overflow-x: hidden;
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
  overflow-x: hidden;
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

  .owner-queue-row {
    display: flex;
  }

  .owner-actions {
    justify-content: flex-start;
  }

  .admin-search {
    min-width: 0;
  }

  .status-grid,
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
</style>
