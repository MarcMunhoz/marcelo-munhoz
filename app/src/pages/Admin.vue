<template>
  <q-page class="admin-page">
    <section class="admin-shell">
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
                      <span>{{ article.displayAuthor }} · {{ article.displayDate }}</span>
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
          </section>
        </template>
      </section>
    </section>

    <q-drawer v-model="editorOpen" side="right" overlay bordered class="editor-drawer" :width="560">
      <div class="editor-drawer-body">
        <div class="panel-heading compact editor-drawer-header">
          <div>
            <p class="admin-kicker">Article editor</p>
            <h2>{{ articleForm.id ? "Edit article" : "Create article" }}</h2>
          </div>
          <div class="editor-drawer-actions">
            <q-badge outline color="blue-grey-7">{{ statusMessage || "Unsaved" }}</q-badge>
            <q-btn flat round dense color="blue-grey-7" icon="close" @click="closeEditor">
              <q-tooltip>Close editor</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-form class="editor-form" @submit.prevent="saveDraft">
          <q-input v-model="articleForm.title" label="Title" outlined dense :error="Boolean(errors.title)" :error-message="errors.title" />
          <q-input v-model="articleForm.slug" label="Slug" outlined dense :error="Boolean(errors.slug)" :error-message="errors.slug" />
          <q-input v-model="articleForm.description" label="Description" outlined dense type="textarea" autogrow :error="Boolean(errors.description)" :error-message="errors.description" />
          <q-input v-model="articleForm.body" label="Body" outlined type="textarea" :rows="8" :error="Boolean(errors.body)" :error-message="errors.body" />

          <div class="form-row">
            <q-input v-model="articleForm.createAt" label="Display date" outlined dense type="date" />
            <q-input v-model="articleForm.authorName" label="Author" outlined dense readonly :error="Boolean(errors.author)" :error-message="errors.author">
              <template #prepend>
                <q-icon name="person" />
              </template>
            </q-input>
          </div>

          <div class="media-fields">
            <div class="media-fields-title">
              <q-icon name="cloud_upload" />
              <span>Thumbnail</span>
            </div>
            <div v-if="articleForm.thumbnailUrl" class="thumbnail-preview">
              <img :src="articleForm.thumbnailUrl" :alt="articleForm.alt || 'Article thumbnail preview'" />
            </div>
            <div v-else class="thumbnail-preview empty">
              <q-icon name="image" size="34px" />
              <span>No thumbnail selected</span>
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
            <q-input v-model="articleForm.alt" label="Alt text" outlined dense />
          </div>

          <div class="tag-editor">
            <q-input v-model="articleForm.tagInput" label="Tags" outlined dense @keyup.enter.prevent="addTagToArticleForm">
              <template #append>
                <q-btn flat round dense color="blue-grey-7" icon="add" @click="addTagToArticleForm">
                  <q-tooltip>Add tag</q-tooltip>
                </q-btn>
              </template>
            </q-input>
            <div class="tag-chip-list">
              <q-chip v-for="tag in articleForm.tagList" :key="tag" removable outline color="blue-grey-7" @remove="removeTagFromArticleForm(tag)">
                {{ tag }}
              </q-chip>
            </div>
          </div>

          <q-banner v-if="feedbackMessage" :class="feedbackClass" rounded>{{ feedbackMessage }}</q-banner>

          <div class="editor-actions">
            <q-btn unelevated color="blue-grey-8" icon="save" label="Save draft" dense no-caps size="sm" type="submit" :loading="loadingAction === 'save'" />
            <q-btn outline color="blue-grey-7" icon="rate_review" label="Submit for review" dense no-caps size="sm" :disable="!articleForm.id" :loading="loadingAction === 'review'" @click="submitReview" />
            <q-btn outline color="amber-9" icon="visibility_off" label="Request unpublication" dense no-caps size="sm" :disable="!articleForm.id" :loading="loadingAction === 'unpublish'" @click="requestUnpublication" />
          </div>
        </q-form>
      </div>
    </q-drawer>

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
          <div class="media-dialog-toolbar">
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

          <q-banner v-if="mediaState.status === 'error'" class="feedback-error media-state-banner" rounded>{{ mediaState.message }}</q-banner>
          <div v-if="mediaState.status === 'empty'" class="media-empty-state">
            <q-icon name="image_not_supported" size="38px" />
            <strong>No images available</strong>
            <span>{{ mediaState.message }}</span>
          </div>
          <q-inner-loading :showing="loadingAction === 'media-list'">
            <q-spinner color="blue-grey-7" size="42px" />
          </q-inner-loading>

          <div v-if="mediaState.status === 'ready'" class="media-grid">
            <button v-for="asset in mediaState.assets" :key="asset.publicId" type="button" class="media-asset" @click="applySelectedMedia(asset)">
              <img :src="asset.thumbnailUrl" :alt="asset.alt" />
              <strong class="media-asset-title">{{ asset.title }}</strong>
              <span v-if="asset.dimensions">{{ asset.dimensions }}</span>
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
  listAdminArticles,
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
  canArchiveArticleAction,
  canEditArticleAction,
  canOwnerPublishAction,
  canOwnerUnpublishAction,
  canPrepareReviewAction,
  canConfirmArticleDeletion,
  canRequestUnpublicationAction,
  createEmptyArticleForm,
  filterAdminArticles,
  mediaLibraryState,
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
      activeSection: "dashboard",
      articles: [],
      adminSummary: summarizeArticleStatuses([]),
      reviewRequests: [],
      editorOpen: false,
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
      ],
      filterTabOptions: [
        { label: "All", value: "" },
        { label: "Drafts", value: "draft" },
        { label: "Review", value: "review" },
        { label: "Published", value: "published" },
      ],
    };
  },
  computed: {
    canWrite() {
      return isWriterSession(this.session);
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
    mediaState() {
      return mediaLibraryState({
        assets: this.mediaAssets,
        error: this.mediaError,
        isLoading: this.loadingAction === "media-list",
      });
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
    async loadArticleDashboard() {
      if (!this.canWrite) {
        return;
      }

      this.dashboardError = "";
      this.loadingAction = "articles";

      try {
        const dashboard = reconcileAdminDashboardData(await listAdminArticles({ session: this.session }));
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
      this.articleForm = createEmptyArticleForm();
      this.errors = {};
      this.statusMessage = "New draft";
      this.showFeedback("", "info");
      this.editorOpen = true;
    },
    openEditorForArticle(article) {
      this.articleForm = articleToForm(article);
      this.errors = {};
      this.statusMessage = "Loaded";
      this.showFeedback("", "info");
      this.editorOpen = true;
    },
    closeEditor() {
      this.editorOpen = false;
      this.errors = {};
      this.statusMessage = "";
      this.showFeedback("", "info");
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

      if (!String(this.articleForm.authorEntryId || this.articleForm.author || "").trim()) {
        errors.author = "Author profile is required";
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
    async signOut() {
      const signedOut = await signOutAdmin();

      if (signedOut) {
        this.session = null;
        this.articles = [];
        this.adminSummary = summarizeArticleStatuses([]);
        this.reviewRequests = [];
        this.editorOpen = false;
      }
    },
    canEditArticleAction,
    canPrepareReviewAction,
    canRequestUnpublicationAction,
    canOwnerPublishAction,
    canOwnerUnpublishAction,
    canArchiveArticleAction,
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
      this.articleForm.thumbnailPublicId = asset.publicId || asset.public_id || "";
      this.articleForm.thumbnailUrl = asset.thumbnailUrl || asset.secure_url || asset.url || "";
      this.articleForm.alt = this.articleForm.alt || asset.alt || asset.title || "";
      this.mediaDialogOpen = false;
      this.showFeedback("Image selected.", "success");
    },
    syncArticleTags() {
      this.articleForm.tags = this.articleForm.tagList.join(", ");
    },
    addTagToArticleForm() {
      const tag = String(this.articleForm.tagInput || "").trim();

      if (!tag || this.articleForm.tagList.includes(tag)) {
        this.articleForm.tagInput = "";
        return;
      }

      this.articleForm.tagList = [...this.articleForm.tagList, tag];
      this.articleForm.tagInput = "";
      this.syncArticleTags();
    },
    removeTagFromArticleForm(tag) {
      this.articleForm.tagList = this.articleForm.tagList.filter((item) => item !== tag);
      this.syncArticleTags();
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
        await this.loadArticleDashboard();
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
        await this.loadArticleDashboard();
        this.showFeedback("Submitted for owner review.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    requestUnpublicationFromRow(article) {
      this.openEditorForArticle(article);
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
  overflow-x: hidden;
}

.admin-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: calc(100vh - 98px);
  width: 100%;
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
