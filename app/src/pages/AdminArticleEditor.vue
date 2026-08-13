<template>
  <q-page class="admin-editor-page">
    <section v-if="showEditorSurface" class="editor-shell">
      <header class="editor-heading">
        <div>
          <p class="admin-kicker">Article editor</p>
          <h1>{{ articleForm.id ? "Edit article" : "Create article" }}</h1>
          <p>{{ articleForm.id ? articleForm.title : "Create a new draft for review." }}</p>
        </div>
        <div class="editor-heading-actions">
          <q-badge outline color="blue-grey-7">{{ statusMessage || "Unsaved" }}</q-badge>
          <q-btn outline color="blue-grey-7" icon="arrow_back" label="Dashboard" no-caps @click="leaveEditor" />
        </div>
      </header>

      <q-banner v-if="dashboardError" class="feedback-error editor-feedback" rounded>{{ dashboardError }}</q-banner>

      <section v-if="!canWrite" class="editor-blocked">
        <q-icon name="lock" size="30px" />
        <div>
          <h2>Writer access required</h2>
          <p>Sign in with an invited writer account to edit articles.</p>
          <q-btn outline color="blue-grey-7" icon="login" label="Sign in" size="sm" @click="openLogin" />
        </div>
      </section>

      <q-form v-else class="editor-form-page" @submit.prevent="saveDraft">
        <section class="editor-card">
          <q-input
            :model-value="articleForm.title"
            label="Title"
            outlined
            dense
            :error="Boolean(errors.title)"
            :error-message="errors.title"
            @update:model-value="updateArticleTitle"
          />
          <q-input v-model="articleForm.slug" label="Slug" outlined dense :error="Boolean(errors.slug)" :error-message="errors.slug" @update:model-value="markSlugTouched" />
          <q-input v-model="articleForm.description" label="Description" outlined dense type="textarea" autogrow :error="Boolean(errors.description)" :error-message="errors.description" />

          <div class="markdown-editor" :class="{ 'has-error': errors.body }">
            <div class="markdown-editor-label">Body <span>(required)</span></div>
            <div class="markdown-editor-toolbar">
              <q-btn flat dense icon="title" @click="insertMarkdown('body', '# ', '', 'Heading')" />
              <q-btn flat dense icon="format_bold" @click="insertMarkdown('body', '**', '**', 'bold text')" />
              <q-btn flat dense icon="format_italic" @click="insertMarkdown('body', '_', '_', 'italic text')" />
              <q-btn flat dense icon="format_quote" @click="insertMarkdown('body', '> ', '', 'Quote')" />
              <q-btn flat dense icon="format_list_bulleted" @click="insertMarkdown('body', '- ', '', 'List item')" />
              <q-btn flat dense icon="format_list_numbered" @click="insertMarkdown('body', '1. ', '', 'List item')" />
              <q-btn flat dense icon="link" @click="insertMarkdown('body', '[', '](https://)', 'link text')" />
              <q-btn flat dense icon="more_horiz" @click="insertMarkdown('body', '`', '`', 'code')" />
              <q-space />
              <q-btn-toggle v-model="bodyEditorMode" dense no-caps toggle-color="blue-grey-7" :options="bodyEditorModeOptions" />
            </div>
            <textarea
              v-show="bodyEditorMode === 'editor'"
              ref="bodyEditor"
              v-model="articleForm.body"
              class="markdown-editor-textarea"
              rows="14"
              aria-label="Body"
            ></textarea>
            <div v-show="bodyEditorMode === 'preview'" class="markdown-editor-preview article-markdown-preview" v-html="articleBodyPreview"></div>
            <p v-if="errors.body" class="markdown-editor-error">{{ errors.body }}</p>
          </div>

          <div class="form-row">
            <q-input v-model="articleForm.createAt" label="Display date" outlined dense type="date" />
            <q-input v-model="articleForm.authorName" label="Author" outlined dense readonly :error="Boolean(errors.author)" :error-message="errors.author">
              <template #prepend>
                <q-icon name="person" />
              </template>
            </q-input>
          </div>
        </section>

        <section class="editor-card">
          <div class="media-fields-title">
            <q-icon name="cloud_upload" />
            <span>Thumbnail</span>
          </div>
          <button v-if="articleForm.thumbnailUrl" type="button" class="thumbnail-preview thumbnail-preview-button" @click="openMediaLibrary">
            <img :src="articleForm.thumbnailUrl" :alt="articleForm.alt || 'Article thumbnail preview'" />
            <span class="thumbnail-preview-action">
              <q-icon name="perm_media" />
              Replace image
            </span>
          </button>
          <div v-else class="thumbnail-preview empty" role="button" tabindex="0" @click="openMediaLibrary" @keyup.enter="openMediaLibrary">
            <q-icon name="image" size="34px" />
            <span>No thumbnail selected</span>
            <small>Select an image from the media library</small>
          </div>
          <div class="media-actions">
            <q-btn outline color="blue-grey-7" icon="perm_media" label="Select image" no-caps :loading="loadingAction === 'media-list'" @click="openMediaLibrary" />
            <q-btn
              outline
              color="blue-grey-7"
              icon="crop"
              label="Edit image"
              no-caps
              :disable="!articleForm.thumbnailPublicId"
              :loading="loadingAction === 'media-editor'"
              @click="editThumbnailImage"
            />
            <q-btn outline color="blue-grey-7" icon="backspace" label="Clear image" no-caps :disable="!articleForm.thumbnailUrl" @click="clearThumbnail" />
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
          <q-expansion-item v-if="articleForm.thumbnailPublicId || articleForm.thumbnailUrl" v-model="showMediaDiagnostics" dense icon="info" label="Image details" class="media-diagnostics">
            <dl>
              <div v-if="articleForm.thumbnailPublicId">
                <dt>Cloudinary public ID</dt>
                <dd>{{ articleForm.thumbnailPublicId }}</dd>
              </div>
              <div v-if="articleForm.thumbnailUrl">
                <dt>Delivery URL</dt>
                <dd>{{ articleForm.thumbnailUrl }}</dd>
              </div>
            </dl>
          </q-expansion-item>
        </section>

        <section class="editor-card">
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
        </section>

        <q-banner v-if="feedbackMessage" :class="feedbackClass" rounded>{{ feedbackMessage }}</q-banner>

        <div class="editor-actions">
          <q-btn v-if="canSaveArticle" unelevated color="blue-grey-8" icon="save" :label="saveButtonLabel" dense no-caps type="submit" :loading="loadingAction === 'save'" />
          <q-btn
            v-if="canSubmitArticleForReview"
            outline
            color="blue-grey-7"
            icon="rate_review"
            label="Submit for review"
            dense
            no-caps
            :disable="!articleForm.id"
            :loading="loadingAction === 'review'"
            @click="submitReview"
          />
          <q-btn
            v-if="canRequestArticleUnpublication"
            outline
            color="amber-9"
            icon="visibility_off"
            label="Request unpublication"
            dense
            no-caps
            :disable="!articleForm.id"
            :loading="loadingAction === 'unpublish'"
            @click="requestUnpublication"
          />
          <q-btn
            v-if="canOwnerUnpublishArticle"
            outline
            color="amber-9"
            icon="visibility_off"
            label="Unpublish"
            dense
            no-caps
            :disable="!articleForm.id"
            :loading="loadingAction === 'owner-unpublish'"
            @click="ownerUnpublish"
          />
        </div>
      </q-form>
    </section>
    <section v-else class="editor-login-shell" aria-hidden="true"></section>

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
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import {
  createArticleDraft,
  getMediaEditorConfig,
  getAuthorProfile,
  listAdminArticles,
  listMediaAssets,
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
  canEditArticleAction,
  canOwnerUnpublishAction,
  canPrepareReviewAction,
  canRequestUnpublicationAction,
  createEmptyArticleForm,
  mediaLibraryState,
  reconcileAdminDashboardData,
  slugFromTitle,
} from "../utils/adminDashboard.js";
import { getAdminSession, isWriterSession, openAdminLogin } from "../utils/adminAuth.js";
import { CloudinaryMediaEditorUnavailableError, openCloudinaryMediaEditor } from "../utils/cloudinaryMediaEditor.js";
import { marked } from "marked";

export default defineComponent({
  name: "AdminArticleEditor",
  data() {
    return {
      session: null,
      sessionResolved: false,
      loginRedirecting: false,
      articleForm: createEmptyArticleForm(),
      originalFormSnapshot: "",
      slugTouched: false,
      errors: {},
      mediaAssets: [],
      mediaDialogOpen: false,
      mediaError: "",
      mediaEditorConfig: null,
      mediaUploadFile: null,
      showMediaDiagnostics: false,
      bodyEditorMode: "editor",
      bodyEditorModeOptions: [
        { label: "Editor", value: "editor" },
        { label: "Preview", value: "preview" },
      ],
      loadedArticle: null,
      statusMessage: "",
      feedbackMessage: "",
      feedbackTone: "info",
      dashboardError: "",
      loadingAction: "",
    };
  },
  computed: {
    canWrite() {
      return isWriterSession(this.session);
    },
    showEditorSurface() {
      return this.sessionResolved && !this.loginRedirecting;
    },
    isNewArticle() {
      return this.$route.name === "Admin Article New";
    },
    hasUnsavedChanges() {
      return this.originalFormSnapshot !== JSON.stringify(this.articleForm);
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
    canSaveArticle() {
      return this.isNewArticle || canEditArticleAction(this.loadedArticle, this.session);
    },
    canSubmitArticleForReview() {
      return canPrepareReviewAction(this.loadedArticle, this.session);
    },
    canRequestArticleUnpublication() {
      return canRequestUnpublicationAction(this.loadedArticle, this.session);
    },
    canOwnerUnpublishArticle() {
      return canOwnerUnpublishAction(this.loadedArticle, this.session);
    },
    saveButtonLabel() {
      return this.loadedArticle?.status === "published" ? "Save" : "Save draft";
    },
    articleBodyPreview() {
      return marked.parse(this.articleForm.body || "");
    },
  },
  async mounted() {
    this.bindIdentityCallbacks();
    this.session = await getAdminSession();
    this.sessionResolved = true;
    this.redirectToLoginIfSignedOut();
    await this.loadEditor();
  },
  beforeRouteLeave(_to, _from, next) {
    if (this.hasUnsavedChanges && !globalThis.confirm?.("Leave the article editor and discard unsaved changes?")) {
      next(false);
      return;
    }

    next();
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
        await this.loadEditor();
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
    snapshotForm() {
      this.originalFormSnapshot = JSON.stringify(this.articleForm);
    },
    async loadEditor() {
      if (!this.canWrite) {
        return;
      }

      if (this.isNewArticle) {
        this.articleForm = createEmptyArticleForm();
        this.loadedArticle = null;
        await this.applyCurrentAuthorProfile();
        this.statusMessage = "New draft";
        this.slugTouched = false;
        this.snapshotForm();
        return;
      }

      this.loadingAction = "articles";
      this.dashboardError = "";

      try {
        const response = await listAdminArticles({ session: this.session });
        this.applyResolvedSession(response.session);
        const dashboard = reconcileAdminDashboardData(response);
        const articleRouteKey = this.$route.params.entryId;
        const article = dashboard.articles.find((item) => item.id === articleRouteKey || item.slug === articleRouteKey);

        if (!article) {
          this.dashboardError = "Article not found or not editable by this account.";
          return;
        }

        if (!canEditArticleAction(article, this.session)) {
          this.loadedArticle = article;
          this.dashboardError = "This article belongs to another author. Use owner moderation actions from the dashboard instead.";
          return;
        }

        this.loadedArticle = article;
        this.articleForm = articleToForm(article);
        this.statusMessage = "Loaded";
        this.slugTouched = true;
        this.snapshotForm();
      } catch (error) {
        this.dashboardError = adminUserMessage(error);
      } finally {
        this.loadingAction = "";
      }
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
    async applyCurrentAuthorProfile() {
      try {
        const response = await getAuthorProfile({ session: this.session });
        this.applyResolvedSession(response.session);
        const profile = response.profile || {};
        this.articleForm.author = profile.id || this.session?.authorEntryId || "";
        this.articleForm.authorEntryId = profile.id || this.session?.authorEntryId || "";
        this.articleForm.authorName = profile.name || this.session?.name || "";
      } catch (error) {
        this.articleForm.author = this.session?.authorEntryId || "";
        this.articleForm.authorEntryId = this.session?.authorEntryId || "";
        this.articleForm.authorName = this.session?.name || "";
        this.dashboardError = adminUserMessage(error);
      }
    },
    leaveEditor() {
      this.$router.push("/admin");
    },
    updateArticleTitle(value) {
      this.articleForm.title = value;

      if (!this.articleForm.id && !this.slugTouched) {
        this.articleForm.slug = slugFromTitle(value);
      }
    },
    markSlugTouched() {
      this.slugTouched = true;
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
    async saveDraft() {
      if (!this.canSaveArticle) {
        this.showFeedback("This article belongs to another author. Use moderation actions from the dashboard.", "error");
        return;
      }

      if (!this.validateArticleForm()) {
        this.showFeedback("Fix the highlighted fields before saving.", "error");
        return;
      }

      this.loadingAction = "save";

      try {
        const payload = buildArticlePayload(this.articleForm);
        const response = this.articleForm.id
          ? await updateArticleDraft({ articleId: this.articleForm.id, article: payload, session: this.session })
          : await createArticleDraft({ article: payload, session: this.session });

        this.articleForm = applyArticleResponseToForm(this.articleForm, response);
        this.loadedArticle = {
          ...(this.loadedArticle || {}),
          id: this.articleForm.id,
          status: this.loadedArticle?.status || "draft",
          authorEntryId: this.articleForm.authorEntryId,
          writerSubject: this.session?.subject || this.loadedArticle?.writerSubject || "",
        };
        this.statusMessage = "Draft saved";
        this.snapshotForm();
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
        this.snapshotForm();
        this.showFeedback("Submitted for owner review.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
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
        this.snapshotForm();
        this.showFeedback("Unpublication request sent.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    async ownerUnpublish() {
      this.loadingAction = "owner-unpublish";

      try {
        await unpublishArticle({
          articleId: this.articleForm.id,
          version: this.articleForm.version,
          session: this.session,
        });
        this.loadedArticle = { ...(this.loadedArticle || {}), status: "unpublished" };
        this.snapshotForm();
        this.showFeedback("Article unpublished.", "success");
      } catch (error) {
        this.handleAdminError(error);
      } finally {
        this.loadingAction = "";
      }
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
      this.articleForm.thumbnailPublicId = asset.publicId || asset.public_id || "";
      this.articleForm.thumbnailUrl = asset.thumbnailUrl || asset.secure_url || asset.url || "";
      this.articleForm.alt = this.articleForm.alt || asset.alt || asset.title || "";
      this.mediaDialogOpen = false;
      this.showMediaDiagnostics = false;
      this.showFeedback("Image selected.", "success");
    },
    applyEditedMedia(asset = {}) {
      const secureUrl = asset.secureUrl || asset.secure_url || asset.url || "";

      if (!secureUrl) {
        this.showFeedback("The editor did not return an image URL. Select or upload an image instead.", "error");
        return;
      }

      this.articleForm.thumbnailPublicId = asset.publicId || asset.public_id || this.articleForm.thumbnailPublicId;
      this.articleForm.thumbnailUrl = secureUrl;
      this.showMediaDiagnostics = false;
      this.showFeedback("Edited image applied. Save the draft to keep it.", "success");
    },
    async loadMediaEditorConfig() {
      if (this.mediaEditorConfig) {
        return this.mediaEditorConfig;
      }

      const response = await getMediaEditorConfig({ session: this.session });
      this.mediaEditorConfig = response.mediaEditor || null;
      return this.mediaEditorConfig;
    },
    async editThumbnailImage() {
      if (!this.articleForm.thumbnailPublicId) {
        this.showFeedback("Select an image before opening the editor.", "error");
        return;
      }

      this.mediaError = "";
      this.loadingAction = "media-editor";

      try {
        const config = await this.loadMediaEditorConfig();
        await openCloudinaryMediaEditor({
          cloudName: config?.cloudName,
          publicId: this.articleForm.thumbnailPublicId,
          onExport: this.applyEditedMedia,
        });
        this.showFeedback("Image editor opened. Export an image there to update the thumbnail.", "info");
      } catch (error) {
        this.handleMediaEditorError(error);
      } finally {
        this.loadingAction = "";
      }
    },
    clearThumbnail() {
      this.articleForm.thumbnailPublicId = "";
      this.articleForm.thumbnailUrl = "";
      this.showMediaDiagnostics = false;
      this.showFeedback("Image cleared.", "info");
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
    insertMarkdown(field, before, after = "", placeholder = "text") {
      const value = String(this.articleForm[field] || "");
      const insertion = `${before}${placeholder}${after}`;
      this.articleForm[field] = value ? `${value}${value.endsWith("\n") ? "" : "\n"}${insertion}` : insertion;
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
    handleMediaEditorError(error) {
      if (error instanceof AdminApiError) {
        this.mediaError = adminUserMessage(error, { media: true });
      } else if (error instanceof CloudinaryMediaEditorUnavailableError) {
        this.mediaError = "Image editor is unavailable. Select or upload an image instead.";
      } else {
        this.mediaError = "Image editor is unavailable. Select or upload an image instead.";
      }

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
.admin-editor-page {
  background: #f2f4f3;
  color: #263238;
  min-height: inherit;
}

.editor-shell {
  max-width: none;
  padding: 22px;
}

.editor-heading,
.editor-heading-actions,
.form-row,
.editor-actions,
.media-fields-title {
  display: flex;
  gap: 14px;
}

.editor-heading {
  align-items: center;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 18px;

  h1 {
    font-size: 1.8rem;
    line-height: 1.15;
    margin: 0;
  }

  p:not(.admin-kicker) {
    color: #607d8b;
    margin: 6px 0 0;
  }
}

.editor-heading-actions {
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.admin-kicker {
  color: #607d8b;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.editor-blocked {
  align-items: center;
  background: #ffffff;
  border-left: 4px solid #b7791f;
  display: flex;
  gap: 16px;
  padding: 18px;
}

.editor-form-page {
  display: grid;
  gap: 14px;
}

.editor-card {
  background: #ffffff;
  border: 1px solid #cfd8dc;
  display: grid;
  gap: 12px;
  padding: 16px;
}

.markdown-editor {
  background: #ffffff;
  border: 1px solid #b0bec5;
  display: grid;
}

.markdown-editor.has-error {
  border-color: #c62828;
}

.markdown-editor-label {
  color: #263238;
  font-weight: 700;
  padding: 12px 14px 0;

  span {
    color: #607d8b;
    font-weight: 400;
  }
}

.markdown-editor-toolbar {
  align-items: center;
  border-bottom: 1px solid #cfd8dc;
  display: flex;
  gap: 4px;
  padding: 8px 12px;
}

.markdown-editor-textarea,
.markdown-editor-preview {
  border: 0;
  color: #263238;
  font: 1rem/1.6 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  min-height: 320px;
  padding: 18px;
  width: 100%;
}

.markdown-editor-textarea {
  resize: vertical;

  &:focus {
    outline: 2px solid #78909c;
    outline-offset: -2px;
  }
}

.markdown-editor-preview {
  background: #fbfcfc;
  overflow-wrap: anywhere;
}

.markdown-editor-error {
  color: #c62828;
  margin: 0;
  padding: 0 14px 12px;
}

.form-row {
  > * {
    flex: 1 1 0;
  }
}

.media-fields-title {
  align-items: center;
  color: #455a64;
  font-weight: 700;
}

.media-actions {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(140px, 170px) minmax(120px, 150px) minmax(120px, 150px) minmax(0, 1fr);
}

.media-upload {
  min-width: 0;
}

.thumbnail-preview {
  align-items: center;
  background: #eef3f5;
  border: 1px solid transparent;
  display: flex;
  justify-content: center;
  min-height: 220px;
  overflow: hidden;
  position: relative;

  img {
    max-height: 360px;
    object-fit: cover;
    width: 100%;
  }
}

.thumbnail-preview-button {
  cursor: pointer;
  padding: 0;
  text-align: inherit;
  width: 100%;

  &:focus-visible,
  &:hover {
    border-color: #607d8b;
  }
}

.thumbnail-preview-action {
  align-items: center;
  background: rgb(38 50 56 / 88%);
  color: #ffffff;
  display: flex;
  font-weight: 700;
  gap: 6px;
  inset: auto 12px 12px auto;
  padding: 8px 10px;
  position: absolute;
}

.thumbnail-preview.empty {
  color: #607d8b;
  display: grid;
  gap: 6px;
  min-height: 140px;
  place-items: center;
}

.media-diagnostics {
  border: 1px dashed #cfd8dc;

  dl {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0 12px 12px;
  }

  dt {
    color: #607d8b;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
}

.tag-chip-list,
.editor-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.media-dialog {
  max-width: min(1160px, 96vw);
  min-width: min(900px, 96vw);
}

.media-dialog-header {
  align-items: center;
  border-bottom: 1px solid #e0e6e8;
  display: flex;
  justify-content: space-between;
}

.media-dialog-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.media-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.media-asset {
  background: #ffffff;
  border: 1px solid #cfd8dc;
  color: #263238;
  cursor: pointer;
  display: grid;
  gap: 7px;
  padding: 10px;
  text-align: left;

  img {
    aspect-ratio: 16 / 9;
    object-fit: cover;
    width: 100%;
  }
}

.media-asset-title {
  overflow-wrap: anywhere;
}

.media-empty-state {
  align-items: center;
  border: 1px dashed #b0bec5;
  color: #607d8b;
  display: grid;
  gap: 10px;
  min-height: 190px;
  place-items: center;
  text-align: center;
}

.feedback-success {
  background: #e6f4ef;
  color: #00695c;
}

.feedback-error {
  background: #fdecea;
  color: #b71c1c;
}

.feedback-info {
  background: #edf4f7;
  color: #37474f;
}

.editor-login-shell {
  min-height: calc(100vh - 98px);
}

@media (max-width: 720px) {
  .form-row,
  .media-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
