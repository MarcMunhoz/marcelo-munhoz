<template>
  <q-page class="admin-page">
    <section class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-brand">
          <q-icon name="edit_note" size="28px" />
          <span>Admin</span>
        </div>

        <q-btn flat no-caps align="left" icon="dashboard" label="Dashboard" :class="{ active: activeSection === 'dashboard' }" @click="activeSection = 'dashboard'" />
        <q-btn flat no-caps align="left" icon="article" label="Articles" :class="{ active: activeSection === 'articles' }" @click="activeSection = 'articles'" />
        <q-btn flat no-caps align="left" icon="drafts" label="Drafts" :class="{ active: filters.status === 'draft' }" @click="setStatusFilter('draft')" />
        <q-btn flat no-caps align="left" icon="rate_review" label="Review" :class="{ active: filters.status === 'review' }" @click="setStatusFilter('review')" />
        <q-btn flat no-caps align="left" icon="perm_media" label="Media" disable />
        <q-btn flat no-caps align="left" icon="settings" label="Settings" disable />
      </aside>

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

            <div class="admin-session">
              <q-icon :name="session ? 'verified_user' : 'lock'" size="22px" />
              <div>
                <strong>{{ sessionLabel }}</strong>
                <span>{{ roleLabel }}</span>
              </div>
              <q-btn v-if="!session" outline color="blue-grey-7" icon="login" label="Sign in" size="sm" @click="openLogin" />
            </div>
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

          <section class="admin-main-grid">
            <section class="article-queue-panel">
              <div class="panel-heading">
                <div>
                  <p class="admin-kicker">Article queue</p>
                  <h2>Articles</h2>
                </div>
                <q-btn unelevated color="blue-grey-8" icon="add" label="New article" @click="startNewArticle" />
              </div>

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
                :pagination="{ rowsPerPage: 6 }"
                no-data-label="No articles match the current filters"
              >
                <template #body-cell-status="props">
                  <q-td :props="props">
                    <q-badge outline :color="statusColor(props.row.status)">{{ statusLabel(props.row.status) }}</q-badge>
                  </q-td>
                </template>

                <template #body-cell-tags="props">
                  <q-td :props="props">
                    <span class="tag-list">{{ props.row.tags.join(", ") }}</span>
                  </q-td>
                </template>

                <template #body-cell-actions="props">
                  <q-td :props="props" class="table-actions">
                    <q-btn dense flat round color="blue-grey-7" icon="edit" @click="editArticle(props.row)">
                      <q-tooltip>Edit article</q-tooltip>
                    </q-btn>
                    <q-btn dense flat round color="blue-grey-7" icon="rate_review" :disable="props.row.status === 'published'" @click="editArticle(props.row)">
                      <q-tooltip>Prepare for review</q-tooltip>
                    </q-btn>
                    <q-btn dense flat round color="amber-9" icon="visibility_off" :disable="!props.row.id" @click="requestUnpublicationFromRow(props.row)">
                      <q-tooltip>Request unpublication</q-tooltip>
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
                      <span>{{ article.author }} · {{ article.createAt }}</span>
                    </div>
                    <div class="owner-actions">
                      <q-btn dense unelevated color="blue-grey-8" icon="publish" label="Publish" :loading="loadingAction === `publish-${article.id}`" @click="publishSelectedArticle(article)" />
                      <q-btn dense outline color="blue-grey-7" icon="archive" label="Archive" :loading="loadingAction === `archive-${article.id}`" @click="archiveSelectedArticle(article)" />
                    </div>
                  </div>
                </article>

                <article class="owner-queue">
                  <h3>Unpublication requests</h3>
                  <p v-if="ownerQueues.unpublicationRequests.length === 0" class="empty-queue">No take-down requests waiting for review.</p>
                  <div v-for="article in ownerQueues.unpublicationRequests" :key="article.id" class="owner-queue-row">
                    <div>
                      <strong>{{ article.title }}</strong>
                      <span>{{ article.author }} · {{ article.createAt }}</span>
                    </div>
                    <div class="owner-actions">
                      <q-btn dense unelevated color="amber-9" icon="visibility_off" label="Unpublish" :loading="loadingAction === `unpublish-${article.id}`" @click="unpublishSelectedArticle(article)" />
                      <q-btn dense outline color="blue-grey-7" icon="archive" label="Archive" :loading="loadingAction === `archive-${article.id}`" @click="archiveSelectedArticle(article)" />
                      <q-btn dense outline color="negative" icon="delete_forever" label="Delete permanently" @click="openDeleteConfirmation(article)" />
                    </div>
                  </div>
                </article>
              </div>
            </section>

            <aside class="editor-panel">
              <div class="panel-heading compact">
                <div>
                  <p class="admin-kicker">Article editor</p>
                  <h2>{{ articleForm.id ? "Edit article" : "Create article" }}</h2>
                </div>
                <q-badge outline color="blue-grey-7">{{ statusMessage || "Unsaved" }}</q-badge>
              </div>

              <q-form class="editor-form" @submit.prevent="saveDraft">
                <q-input v-model="articleForm.title" label="Title" outlined dense :error="Boolean(errors.title)" :error-message="errors.title" />
                <q-input v-model="articleForm.slug" label="Slug" outlined dense :error="Boolean(errors.slug)" :error-message="errors.slug" />
                <q-input v-model="articleForm.description" label="Description" outlined dense type="textarea" autogrow :error="Boolean(errors.description)" :error-message="errors.description" />
                <q-input v-model="articleForm.body" label="Body" outlined type="textarea" :rows="8" :error="Boolean(errors.body)" :error-message="errors.body" />

                <div class="form-row">
                  <q-input v-model="articleForm.createAt" label="Display date" outlined dense type="date" />
                  <q-input v-model="articleForm.author" label="Author entry ID" outlined dense :error="Boolean(errors.author)" :error-message="errors.author" />
                </div>

                <div class="media-fields">
                  <div class="media-fields-title">
                    <q-icon name="cloud_upload" />
                    <span>Thumbnail</span>
                  </div>
                  <div class="media-actions">
                    <q-btn outline color="blue-grey-7" icon="perm_media" label="Select image" :loading="loadingAction === 'media-list'" @click="openMediaLibrary" />
                    <q-file
                      v-model="mediaUploadFile"
                      dense
                      outlined
                      accept="image/*"
                      label="Upload image"
                      class="media-upload"
                      :loading="loadingAction === 'media-upload'"
                      @update:model-value="handleMediaFile"
                    >
                      <template #prepend>
                        <q-icon name="upload" />
                      </template>
                    </q-file>
                  </div>
                  <q-input v-model="articleForm.thumbnailPublicId" label="Selected image ID" outlined dense readonly :error="Boolean(errors.thumbnail)" :error-message="errors.thumbnail" />
                  <q-input v-model="articleForm.thumbnailUrl" label="Selected image URL" outlined dense readonly />
                  <q-input v-model="articleForm.alt" label="Alt text" outlined dense />
                </div>

                <q-input v-model="articleForm.tags" label="Tags" outlined dense hint="Comma-separated Contentful tag IDs" />

                <q-banner v-if="feedbackMessage" :class="feedbackClass" rounded>{{ feedbackMessage }}</q-banner>

                <div class="editor-actions">
                  <q-btn unelevated color="blue-grey-8" icon="save" label="Save draft" type="submit" :loading="loadingAction === 'save'" />
                  <q-btn outline color="blue-grey-7" icon="rate_review" label="Submit for review" :disable="!articleForm.id" :loading="loadingAction === 'review'" @click="submitReview" />
                  <q-btn outline color="amber-9" icon="visibility_off" label="Request unpublication" :disable="!articleForm.id" :loading="loadingAction === 'unpublish'" @click="requestUnpublication" />
                </div>
              </q-form>
            </aside>
          </section>
        </template>
      </section>
    </section>

    <q-dialog v-model="mediaDialogOpen">
      <q-card class="media-dialog">
        <q-card-section class="media-dialog-header">
          <div>
            <p class="admin-kicker">Media library</p>
            <h2>Select an image</h2>
          </div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-banner v-if="mediaError" class="feedback-error" rounded>{{ mediaError }}</q-banner>
          <q-inner-loading :showing="loadingAction === 'media-list'">
            <q-spinner color="blue-grey-7" size="42px" />
          </q-inner-loading>

          <div class="media-grid">
            <button v-for="asset in mediaAssets" :key="asset.public_id" type="button" class="media-asset" @click="applySelectedMedia(asset)">
              <img :src="asset.secure_url || asset.url" :alt="asset.public_id" />
              <span>{{ asset.public_id }}</span>
            </button>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

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
  createArticleDraft,
  deleteArticle,
  listMediaAssets,
  publishArticle,
  requestArticleUnpublication,
  submitArticleForReview,
  unpublishArticle,
  updateArticleDraft,
  uploadMediaAsset,
  adminUserMessage,
  AdminApiError,
} from "../utils/adminApi.js";
import {
  applyArticleResponseToForm,
  articleToForm,
  buildArticlePayload,
  canConfirmArticleDeletion,
  createEmptyArticleForm,
  filterAdminArticles,
  ownerReviewQueues,
  removeArticleById,
  sampleAdminArticles,
  summarizeArticleStatuses,
  updateArticleStatusById,
} from "../utils/adminDashboard.js";
import { getAdminSession, isOwnerSession, isWriterSession, openAdminLogin } from "../utils/adminAuth.js";

export default defineComponent({
  name: "AdminPage",
  data() {
    return {
      session: null,
      activeSection: "dashboard",
      articles: [],
      articleForm: createEmptyArticleForm(),
      filters: {
        search: "",
        status: "",
        tag: "",
        date: "",
        author: "",
      },
      errors: {},
      mediaAssets: [],
      mediaDialogOpen: false,
      mediaError: "",
      mediaUploadFile: null,
      deleteDialogOpen: false,
      articlePendingDeletion: null,
      deleteConfirmation: "",
      statusMessage: "",
      feedbackMessage: "",
      feedbackTone: "info",
      loadingAction: "",
      articleColumns: [
        { name: "title", label: "Title", field: "title", align: "left", sortable: true },
        { name: "status", label: "Status", field: "status", align: "left", sortable: true },
        { name: "tags", label: "Tags", field: "tags", align: "left" },
        { name: "createAt", label: "Date", field: "createAt", align: "left", sortable: true },
        { name: "author", label: "Author", field: "author", align: "left", sortable: true },
        { name: "actions", label: "", field: "actions", align: "right" },
      ],
      statusOptions: [
        { label: "Published", value: "published" },
        { label: "Draft", value: "draft" },
        { label: "Unpublished", value: "unpublished" },
        { label: "Unpublication requested", value: "unpublicationRequested" },
        { label: "In review", value: "review" },
      ],
    };
  },
  computed: {
    canWrite() {
      return isWriterSession(this.session);
    },
    sessionLabel() {
      return this.session?.name || "Signed out";
    },
    roleLabel() {
      if (!this.session) {
        return "No session";
      }

      if (this.session.preview) {
        return "Writer preview";
      }

      return isOwnerSession(this.session) ? "Owner" : "Writer";
    },
    isOwner() {
      return isOwnerSession(this.session);
    },
    dashboardSummary() {
      return summarizeArticleStatuses(this.articles);
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
    this.session = await getAdminSession();
    this.loadArticleDashboard();
  },
  methods: {
    openLogin() {
      openAdminLogin();
    },
    loadArticleDashboard() {
      this.articles = sampleAdminArticles;
    },
    setStatusFilter(status) {
      this.filters.status = this.filters.status === status ? "" : status;
      this.activeSection = "dashboard";
    },
    startNewArticle() {
      this.articleForm = createEmptyArticleForm();
      this.errors = {};
      this.statusMessage = "New draft";
      this.showFeedback("", "info");
    },
    editArticle(article) {
      this.articleForm = articleToForm(article);
      this.errors = {};
      this.statusMessage = "Loaded";
      this.showFeedback("", "info");
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
    validateArticleForm() {
      const errors = {};

      if (!this.articleForm.title.trim()) {
        errors.title = "Title is required";
      }

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.articleForm.slug)) {
        errors.slug = "Use a URL-safe slug";
      }

      if (!this.articleForm.description.trim()) {
        errors.description = "Description is required";
      }

      if (!this.articleForm.body.trim()) {
        errors.body = "Body is required";
      }

      if (!this.articleForm.author.trim()) {
        errors.author = "Author entry ID is required";
      }

      if (this.articleForm.thumbnailUrl && !this.articleForm.thumbnailPublicId) {
        errors.thumbnail = "Select media again so the Cloudinary public ID is saved.";
      }

      this.errors = errors;
      return Object.keys(errors).length === 0;
    },
    articlePayload() {
      return buildArticlePayload(this.articleForm);
    },
    async openMediaLibrary() {
      this.mediaDialogOpen = true;
      this.mediaError = "";
      this.loadingAction = "media-list";

      try {
        const response = await listMediaAssets({ session: this.session });
        this.mediaAssets = response.assets || [];
      } catch (error) {
        this.handleMediaError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    applySelectedMedia(asset = {}) {
      this.articleForm.thumbnailPublicId = asset.public_id || "";
      this.articleForm.thumbnailUrl = asset.secure_url || asset.url || "";
      this.mediaDialogOpen = false;
      this.showFeedback("Image selected.", "success");
    },
    async handleMediaFile(file) {
      if (!file) {
        return;
      }

      this.mediaError = "";
      this.loadingAction = "media-upload";

      try {
        const dataUrl = await this.readFileAsDataUrl(file);
        const response = await uploadMediaAsset({
          file: dataUrl,
          filename: file.name,
          session: this.session,
        });

        this.applySelectedMedia(response.asset);
        this.mediaUploadFile = null;
      } catch (error) {
        this.handleMediaError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    readFileAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    },
    applyArticleResponse(payload = {}) {
      this.articleForm = applyArticleResponseToForm(this.articleForm, payload);
    },
    async saveDraft() {
      if (!this.validateArticleForm()) {
        this.showFeedback("Fix the highlighted fields before saving.", "error");
        return;
      }

      this.loadingAction = "save";

      try {
        const payload = this.articlePayload();
        const response = this.articleForm.id
          ? await updateArticleDraft({ articleId: this.articleForm.id, article: payload, session: this.session })
          : await createArticleDraft({ article: payload, session: this.session });

        this.applyArticleResponse(response);
        this.statusMessage = "Draft saved";
        this.showFeedback("Draft saved.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    async submitReview() {
      this.loadingAction = "review";

      try {
        await submitArticleForReview({
          articleId: this.articleForm.id,
          version: this.articleForm.version,
          notes: "",
          session: this.session,
        });
        this.showFeedback("Submitted for owner review.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    requestUnpublicationFromRow(article) {
      this.editArticle(article);
      return this.requestUnpublication();
    },
    async requestUnpublication() {
      this.loadingAction = "unpublish";

      try {
        await requestArticleUnpublication({
          articleId: this.articleForm.id,
          version: this.articleForm.version,
          notes: "",
          session: this.session,
        });
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
    handleMediaError(error) {
      if (error instanceof AdminApiError) {
        this.mediaError = adminUserMessage(error, { media: true });
        this.showFeedback(this.mediaError, "error");
        return;
      }

      this.mediaError = adminUserMessage(error, { media: true });
      this.showFeedback(this.mediaError, "error");
    },
    showFeedback(message, tone = "info") {
      this.feedbackMessage = message;
      this.feedbackTone = tone;
    },
  },
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
  grid-template-columns: 220px minmax(0, 1fr);
  min-height: calc(100vh - 98px);
}

.admin-sidebar {
  background: #546e7a;
  color: #eef3f5;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 14px;

  .q-btn {
    justify-content: flex-start;
    min-height: 40px;
  }

  .active {
    background: rgba(255, 255, 255, 0.16);
  }
}

.admin-brand {
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  font-size: 1.1rem;
  font-weight: 700;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  text-transform: uppercase;
}

.admin-workspace {
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
}

.admin-search {
  min-width: 260px;
}

.admin-kicker {
  color: #607d8b;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.admin-session {
  align-items: center;
  background: #ffffff;
  border: 1px solid #cfd8dc;
  display: flex;
  gap: 10px;
  min-height: 46px;
  padding: 8px 10px;

  span {
    color: #607d8b;
    display: block;
    font-size: 0.8rem;
  }
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 18px;
}

.status-card,
.article-queue-panel,
.owner-review-panel,
.editor-panel {
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
  grid-template-columns: minmax(0, 1.45fr) minmax(360px, 0.75fr);
}

.article-queue-panel,
.owner-review-panel,
.editor-panel {
  padding: 16px;
}

.owner-review-panel {
  grid-column: 1 / -1;
}

.owner-queue-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  margin-bottom: 12px;
}

.article-table {
  border: 1px solid #e0e6e8;
}

.tag-list {
  color: #455a64;
  font-size: 0.86rem;
}

.table-actions {
  white-space: nowrap;
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
  grid-template-columns: 150px minmax(0, 1fr);
}

.media-upload {
  min-width: 0;
}

.media-dialog {
  min-width: min(920px, 92vw);
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

@media (max-width: 1100px) {
  .admin-shell,
  .admin-main-grid,
  .owner-queue-grid {
    grid-template-columns: 1fr;
  }

  .admin-sidebar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .admin-brand {
    grid-column: 1 / -1;
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
}
</style>
