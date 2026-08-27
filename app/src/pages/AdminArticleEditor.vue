<template>
  <q-page class="admin-editor-page">
    <section v-if="showEditorSurface" class="editor-shell">
      <header class="editor-heading">
        <div class="editor-heading-content">
          <p class="admin-kicker">Article editor</p>
          <h1>{{ articleForm.id ? "Edit article" : "Create article" }}</h1>
          <p>{{ articleForm.id ? articleForm.title : "Create a new draft for review." }}</p>
        </div>
        <div class="editor-heading-actions">
          <div class="article-language-switch" role="group" aria-label="Article language">
            <button
              v-for="option in articleLocaleOptions"
              :key="option.value"
              type="button"
              class="article-language-switch__option"
              :class="{ active: articleForm.locale === option.value }"
              :aria-pressed="articleForm.locale === option.value"
              @click="articleForm.locale = option.value"
            >
              {{ option.label }}
            </button>
            <span class="article-language-switch__track" :class="{ english: articleForm.locale === 'en-US' }"></span>
          </div>
          <q-badge class="editor-status" outline color="blue-grey-7">{{ statusMessage || "Unsaved" }}</q-badge>
          <q-btn class="editor-dashboard-action" outline color="blue-grey-7" icon="arrow_back" label="Dashboard" no-caps @click="leaveEditor" />
        </div>
      </header>

      <q-banner v-if="dashboardError" class="feedback-error editor-feedback" rounded>{{ dashboardError }}</q-banner>

      <section v-if="!canWrite" class="editor-blocked">
        <q-icon name="lock" size="30px" />
        <div>
          <h2>Writer access required</h2>
          <p>Sign in with an invited writer account to edit articles.</p>
        </div>
      </section>

      <section v-else-if="editorLoading" class="editor-loading" aria-live="polite">
        <q-inner-loading showing>
          <q-spinner size="42px" color="blue-grey-6" />
          <p>Loading article editor</p>
        </q-inner-loading>
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
              <div class="markdown-format-actions">
                <q-btn-dropdown flat dense icon="title" dropdown-icon="arrow_drop_down" :disable="bodyEditorMode === 'preview'">
                  <q-list dense>
                    <q-item v-close-popup clickable @click="insertMarkdown('body', '# ', '', 'Heading 1')">
                      <q-item-section>Heading 1</q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="insertMarkdown('body', '## ', '', 'Heading 2')">
                      <q-item-section>Heading 2</q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="insertMarkdown('body', '### ', '', 'Heading 3')">
                      <q-item-section>Heading 3</q-item-section>
                    </q-item>
                  </q-list>
                  <q-tooltip>Headings</q-tooltip>
                </q-btn-dropdown>
                <q-btn flat dense icon="format_bold" :disable="bodyEditorMode === 'preview'" @click="insertMarkdown('body', '**', '**', 'bold text')" />
                <q-btn flat dense icon="format_italic" :disable="bodyEditorMode === 'preview'" @click="insertMarkdown('body', '_', '_', 'italic text')" />
                <q-btn flat dense icon="format_quote" :disable="bodyEditorMode === 'preview'" @click="insertMarkdown('body', '> ', '', 'Quote')" />
                <q-btn flat dense icon="format_list_bulleted" :disable="bodyEditorMode === 'preview'" @click="insertMarkdown('body', '- ', '', 'List item')" />
                <q-btn flat dense icon="format_list_numbered" :disable="bodyEditorMode === 'preview'" @click="insertMarkdown('body', '1. ', '', 'List item')" />
                <q-btn flat dense icon="link" :disable="bodyEditorMode === 'preview'" @click="insertMarkdown('body', '[', '](https://)', 'link text')" />
                <q-btn-dropdown flat dense icon="more_horiz" dropdown-icon="arrow_drop_down" :disable="bodyEditorMode === 'preview'">
                  <q-list dense>
                    <q-item v-close-popup clickable @click="insertMarkdown('body', '`', '`', 'code')">
                      <q-item-section>Inline code</q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="insertMarkdown('body', '```\n', '\n```', 'code block')">
                      <q-item-section>Code block</q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="insertMarkdown('body', '\n---\n', '', '')">
                      <q-item-section>Divider</q-item-section>
                    </q-item>
                  </q-list>
                  <q-tooltip>More actions</q-tooltip>
                </q-btn-dropdown>
              </div>
              <div class="markdown-mode-actions">
                <q-btn-toggle v-model="bodyEditorMode" dense no-caps toggle-color="blue-grey-7" :options="bodyEditorModeOptions" />
              </div>
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
            <q-btn class="media-action" outline color="blue-grey-7" icon="perm_media" label="Select image" no-caps :loading="loadingAction === 'media-list'" @click="openMediaLibrary" />
            <q-btn
              class="media-action"
              outline
              color="blue-grey-7"
              icon="crop"
              label="Edit image"
              no-caps
              :disable="!articleForm.thumbnailPublicId"
              :loading="loadingAction === 'media-editor'"
              @click="editThumbnailImage"
            />
            <q-btn class="media-action" outline color="blue-grey-7" icon="backspace" label="Clear image" no-caps :disable="!articleForm.thumbnailUrl" @click="clearThumbnail" />
            <q-file
              v-model="mediaUploadFile"
              dense
              outlined
              accept="image/*"
              label="Upload image"
              class="media-upload media-action"
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
          <q-select
            v-model="articleForm.tagList"
            :options="filteredTagOptions"
            label="Tags"
            outlined
            dense
            multiple
            use-chips
            use-input
            fill-input
            input-debounce="0"
            option-value="id"
            option-label="label"
            emit-value
            map-options
            :loading="tagsLoading"
            @filter="filterTagOptions"
            @new-value="createNewContentfulTag"
            @update:model-value="syncArticleTags"
            @keyup.enter.stop.prevent
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-blue-grey-7">No matching Contentful tags</q-item-section>
              </q-item>
            </template>
          </q-select>
        </section>

        <q-banner v-if="feedbackMessage" :class="feedbackClass" rounded>{{ feedbackMessage }}</q-banner>

        <div class="editor-actions">
          <q-btn v-if="canSaveArticle" class="editor-action editor-action-primary" unelevated color="blue-grey-8" icon="save" :label="saveButtonLabel" dense no-caps type="submit" :loading="loadingAction === 'save'" />
          <q-btn
            v-if="canSubmitArticleForReview"
            class="editor-action editor-action-secondary"
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
            class="editor-action editor-action-secondary"
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
            class="editor-action editor-action-secondary"
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

        <q-card-section class="media-dialog-content">
          <div class="media-dialog-toolbar">
            <q-file
              v-model="mediaUploadFile"
              dense
              outlined
              accept="image/*"
              label="Upload image"
              class="media-upload media-action"
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

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, toRefs } from "vue"
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router"
import {
  createArticleDraft,
  createContentfulTag,
  getMediaEditorConfig,
  getAuthorProfile,
  listContentfulTags,
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
  formatMarkdownSelection,
  mediaLibraryState,
  reconcileAdminDashboardData,
  runTerminalAdminAction,
  slugFromTitle,
} from "../utils/adminDashboard.js";
import { bindIdentityCallbacks as bindAdminIdentityCallbacks, getAdminSession, isAdminSignOutNavigation, isWriterSession } from "../utils/adminAuth.js";
import { normalizeEditorialTagOptions } from "../utils/adminTags.js";
import { CloudinaryMediaEditorUnavailableError, openCloudinaryMediaEditor } from "../utils/cloudinaryMediaEditor.js";
import { marked } from "marked";
const route = useRoute();
const router = useRouter();
const bodyEditor = ref(null);
const templateRefs = { bodyEditor };
let active = true;
let editorRequestId = 0;
let stopIdentityCallbacks = () => {};
const state = reactive({
  session: null, sessionResolved: false, articleForm: createEmptyArticleForm(), originalFormSnapshot: "", slugTouched: false,
  errors: {}, mediaAssets: [], mediaDialogOpen: false, mediaError: "", mediaEditorConfig: null, mediaUploadFile: null,
  availableTagOptions: [], filteredTagOptions: [], tagsLoading: false, showMediaDiagnostics: false, bodyEditorMode: "editor",
  bodyEditorModeOptions: [{ label: "Editor", value: "editor" }, { label: "Preview", value: "preview" }],
  articleLocaleOptions: [{ label: "PT", value: "pt-BR" }, { label: "EN", value: "en-US" }], loadedArticle: null,
  statusMessage: "", feedbackMessage: "", feedbackTone: "info", dashboardError: "", loadingAction: "", editorLoading: false,
});
const canWrite = computed(() => isWriterSession(state.session));
const showEditorSurface = computed(() => state.sessionResolved);
const isNewArticle = computed(() => route.name === "Admin Article New");
const hasUnsavedChanges = computed(() => state.originalFormSnapshot !== JSON.stringify(state.articleForm));
const mediaState = computed(() => mediaLibraryState({ assets: state.mediaAssets, error: state.mediaError, isLoading: state.loadingAction === "media-list" }));
const feedbackClass = computed(() => ({ "feedback-success": state.feedbackTone === "success", "feedback-error": state.feedbackTone === "error", "feedback-info": state.feedbackTone === "info" }));
const canSaveArticle = computed(() => isNewArticle.value || canEditArticleAction(state.loadedArticle, state.session));
const canSubmitArticleForReview = computed(() => canPrepareReviewAction(state.loadedArticle, state.session));
const canRequestArticleUnpublication = computed(() => canRequestUnpublicationAction(state.loadedArticle, state.session));
const canOwnerUnpublishArticle = computed(() => canOwnerUnpublishAction(state.loadedArticle, state.session));
const saveButtonLabel = computed(() => ["published", "changed"].includes(state.loadedArticle?.status) ? "Save" : "Save draft");
const articleBodyPreview = computed(() => marked.parse(state.articleForm.body || ""));
Object.assign(state, { canWrite, showEditorSurface, isNewArticle, hasUnsavedChanges, mediaState, feedbackClass, canSaveArticle, canSubmitArticleForReview, canRequestArticleUnpublication, canOwnerUnpublishArticle, saveButtonLabel, articleBodyPreview });
const methods = {
bindIdentityCallbacks() {
  const identity = globalThis.netlifyIdentity;
  stopIdentityCallbacks = bindAdminIdentityCallbacks({
    identity,
    onLogin: async () => {
      identity?.close?.();
      const sessionAfterLogin = await getAdminSession();
      if (!active) return;
      state.session = sessionAfterLogin;
      await state.loadEditor();
    },
  });
},
redirectSignedOutVisitor() {
  if (!state.session) {
    router.replace("/");
  }
},
snapshotForm() {
  state.originalFormSnapshot = JSON.stringify(state.articleForm);
},
async loadEditor() {
  const currentRequestId = ++editorRequestId;
  if (!state.canWrite) {
    return;
  }

  state.editorLoading = true;

  try {
    await state.loadContentfulTags(currentRequestId);
    if (!active || currentRequestId !== editorRequestId) return;

    if (state.isNewArticle) {
      state.articleForm = createEmptyArticleForm();
      state.loadedArticle = null;
      await state.applyCurrentAuthorProfile(currentRequestId);
      if (!active || currentRequestId !== editorRequestId) return;
      state.statusMessage = "New draft";
      state.slugTouched = false;
      state.snapshotForm();
      return;
    }

    state.loadingAction = "articles";
    state.dashboardError = "";

    const response = await listAdminArticles({ session: state.session });
    if (!active || currentRequestId !== editorRequestId) return;
    state.applyResolvedSession(response.session);
    const dashboard = reconcileAdminDashboardData(response);
    const articleRouteKey = route.params.entryId;
    const article = dashboard.articles.find((item) => item.id === articleRouteKey || item.slug === articleRouteKey);

    if (!article) {
      state.dashboardError = "Article not found or not editable by this account.";
      return;
    }

    if (!canEditArticleAction(article, state.session)) {
      state.loadedArticle = article;
      state.dashboardError = "This article belongs to another author. Use owner moderation actions from the dashboard instead.";
      return;
    }

    state.loadedArticle = article;
    state.articleForm = articleToForm(article);
    state.statusMessage = "Loaded";
    state.slugTouched = true;
    state.snapshotForm();
  } catch (error) {
    if (!active || currentRequestId !== editorRequestId) return;
    state.dashboardError = adminUserMessage(error);
  } finally {
    if (active && currentRequestId === editorRequestId) {
      state.loadingAction = "";
      state.editorLoading = false;
    }
  }
},
applyResolvedSession(session = {}) {
  if (!session.authorEntryId) {
    return;
  }

  state.session = {
    ...state.session,
    authorEntryId: session.authorEntryId,
  };
},
async applyCurrentAuthorProfile(currentRequestId = editorRequestId) {
  try {
    const response = await getAuthorProfile({ session: state.session });
    if (!active || currentRequestId !== editorRequestId) return;
    state.applyResolvedSession(response.session);
    const profile = response.profile || {};
    state.articleForm.author = profile.id || state.session?.authorEntryId || "";
    state.articleForm.authorEntryId = profile.id || state.session?.authorEntryId || "";
    state.articleForm.authorName = profile.name || state.session?.name || "";
  } catch (error) {
    if (!active || currentRequestId !== editorRequestId) return;
    state.articleForm.author = state.session?.authorEntryId || "";
    state.articleForm.authorEntryId = state.session?.authorEntryId || "";
    state.articleForm.authorName = state.session?.name || "";
    state.dashboardError = adminUserMessage(error);
  }
},
normalizeTagOptions(tags = []) {
  return normalizeEditorialTagOptions(tags);
},
async loadContentfulTags(currentRequestId = editorRequestId) {
  state.tagsLoading = true;

  try {
    const response = await listContentfulTags({ session: state.session });
    if (!active || currentRequestId !== editorRequestId) return;
    state.availableTagOptions = state.normalizeTagOptions(response.tags);
    state.filteredTagOptions = state.availableTagOptions;
  } catch (error) {
    if (!active || currentRequestId !== editorRequestId) return;
    state.availableTagOptions = [];
    state.filteredTagOptions = [];
    state.dashboardError = adminUserMessage(error);
  } finally {
    if (active && currentRequestId === editorRequestId) state.tagsLoading = false;
  }
},
filterTagOptions(value, update) {
  const needle = String(value || "").trim().toLowerCase();

  update(() => {
    state.filteredTagOptions = needle
      ? state.availableTagOptions.filter((tag) => `${tag.label} ${tag.id}`.toLowerCase().includes(needle))
      : state.availableTagOptions;
  });
},
async createNewContentfulTag(value, done) {
  const name = String(value || "").trim();

  if (!name) {
    done();
    return;
  }

  const existingTag = state.availableTagOptions.find((tag) => tag.label.toLowerCase() === name.toLowerCase() || tag.id.toLowerCase() === name.toLowerCase());

  if (existingTag) {
    done(existingTag.id, "add-unique");
    nextTick(state.syncArticleTags);
    return;
  }

  state.tagsLoading = true;

  try {
    const response = await createContentfulTag({ name, session: state.session });
    const createdTag = state.normalizeTagOptions([response.tag])[0];

    if (!createdTag) {
      done();
      state.showFeedback("The tag could not be created.", "error");
      return;
    }

    state.availableTagOptions = [...state.availableTagOptions.filter((tag) => tag.id !== createdTag.id), createdTag].sort((left, right) =>
      left.label.localeCompare(right.label)
    );
    state.filteredTagOptions = state.availableTagOptions;
    done(createdTag.id, "add-unique");
    nextTick(state.syncArticleTags);
    state.showFeedback("Tag created.", "success");
  } catch (error) {
    done();
    state.handleAdminError(error);
  } finally {
    state.tagsLoading = false;
  }
},
leaveEditor() {
  router.push("/admin");
},
updateArticleTitle(value) {
  state.articleForm.title = value;

  if (!state.articleForm.id && !state.slugTouched) {
    state.articleForm.slug = slugFromTitle(value);
  }
},
markSlugTouched() {
  state.slugTouched = true;
},
validateArticleForm() {
  const errors = {};

  if (!state.articleForm.title.trim()) {
    errors.title = "Title is required";
  }

  if (!/^[a-z]+(?:-[a-z]+)*$/.test(state.articleForm.slug)) {
    errors.slug = "Use letters and hyphens only";
  }

  if (!state.articleForm.description.trim()) {
    errors.description = "Description is required";
  }

  if (!state.articleForm.body.trim()) {
    errors.body = "Body is required";
  }

  if (!String(state.articleForm.authorEntryId || state.articleForm.author || "").trim()) {
    errors.author = "Author profile is required";
  }

  if (state.articleForm.thumbnailUrl && !state.articleForm.thumbnailPublicId) {
    errors.thumbnail = "Select media again so the Cloudinary public ID is saved.";
  }

  state.errors = errors;
  return Object.keys(errors).length === 0;
},
async saveDraft() {
  if (!state.canSaveArticle) {
    state.showFeedback("This article belongs to another author. Use moderation actions from the dashboard.", "error");
    return;
  }

  if (!state.validateArticleForm()) {
    state.showFeedback("Fix the highlighted fields before saving.", "error");
    return;
  }

  state.loadingAction = "save";

  try {
    const payload = buildArticlePayload(state.articleForm);
    await runTerminalAdminAction({
      operation: () =>
        state.articleForm.id
          ? updateArticleDraft({ articleId: state.articleForm.id, article: payload, session: state.session })
          : createArticleDraft({ article: payload, session: state.session }),
      onSuccess: (response) => {
        state.articleForm = applyArticleResponseToForm(state.articleForm, response);
        const previousLifecycleStatus = state.loadedArticle?.lifecycleStatus || state.loadedArticle?.status;
        const savedStatus = ["published", "changed"].includes(previousLifecycleStatus) ? "changed" : "draft";

        state.loadedArticle = {
          ...(state.loadedArticle || {}),
          id: state.articleForm.id,
          status: savedStatus,
          lifecycleStatus: savedStatus,
          authorEntryId: state.articleForm.authorEntryId,
          writerSubject: state.session?.subject || state.loadedArticle?.writerSubject || "",
        };
        state.statusMessage = "Draft saved";
        state.snapshotForm();
        state.showFeedback("Draft saved.", "success");
      },
      router: router,
    });
  } catch (error) {
    state.handleAdminError(error);
  } finally {
    state.loadingAction = "";
  }
},
async submitReview() {
  state.loadingAction = "review";

  try {
    await runTerminalAdminAction({
      operation: () =>
        submitArticleForReview({
          articleId: state.articleForm.id,
          version: state.articleForm.version,
          notes: "",
          session: state.session,
        }),
      onSuccess: () => {
        state.snapshotForm();
        state.showFeedback("Submitted for owner review.", "success");
      },
      router: router,
    });
  } catch (error) {
    state.handleAdminError(error);
  } finally {
    state.loadingAction = "";
  }
},
async requestUnpublication() {
  state.loadingAction = "unpublish";

  try {
    await runTerminalAdminAction({
      operation: () =>
        requestArticleUnpublication({
          articleId: state.articleForm.id,
          version: state.articleForm.version,
          notes: "",
          session: state.session,
        }),
      onSuccess: () => {
        state.snapshotForm();
        state.showFeedback("Unpublication request sent.", "success");
      },
      router: router,
    });
  } catch (error) {
    state.handleAdminError(error);
  } finally {
    state.loadingAction = "";
  }
},
async ownerUnpublish() {
  state.loadingAction = "owner-unpublish";

  try {
    await runTerminalAdminAction({
      operation: () =>
        unpublishArticle({
          articleId: state.articleForm.id,
          version: state.articleForm.version,
          session: state.session,
        }),
      onSuccess: () => {
        state.loadedArticle = { ...(state.loadedArticle || {}), status: "unpublished" };
        state.snapshotForm();
        state.showFeedback("Article unpublished.", "success");
      },
      router: router,
    });
  } catch (error) {
    state.handleAdminError(error);
  } finally {
    state.loadingAction = "";
  }
},
async openMediaLibrary() {
  state.mediaDialogOpen = true;
  state.mediaError = "";
  state.loadingAction = "media-list";

  try {
    const response = await listMediaAssets({ session: state.session });
    state.mediaAssets = response.assets || [];
  } catch (error) {
    state.handleMediaError(error);
  } finally {
    state.loadingAction = "";
  }
},
applySelectedMedia(asset = {}) {
  state.articleForm.thumbnailPublicId = asset.publicId || asset.public_id || "";
  state.articleForm.thumbnailUrl = asset.thumbnailUrl || asset.secure_url || asset.url || "";
  state.articleForm.thumbnail = asset.asset || {
    public_id: state.articleForm.thumbnailPublicId,
    secure_url: state.articleForm.thumbnailUrl,
    url: state.articleForm.thumbnailUrl,
  };
  state.articleForm.alt = state.articleForm.alt || asset.alt || asset.title || "";
  state.mediaDialogOpen = false;
  state.showMediaDiagnostics = false;
  state.showFeedback("Image selected.", "success");
},
applyEditedMedia(asset = {}) {
  const secureUrl = asset.secureUrl || asset.secure_url || asset.url || "";

  if (!secureUrl) {
    state.showFeedback("The editor did not return an image URL. Select or upload an image instead.", "error");
    return;
  }

  state.articleForm.thumbnailPublicId = asset.publicId || asset.public_id || state.articleForm.thumbnailPublicId;
  state.articleForm.thumbnailUrl = secureUrl;
  state.articleForm.thumbnail = {
    ...(state.articleForm.thumbnail || {}),
    public_id: state.articleForm.thumbnailPublicId,
    secure_url: secureUrl,
    url: secureUrl,
  };
  state.showMediaDiagnostics = false;
  state.showFeedback("Edited image applied. Save the draft to keep it.", "success");
},
async loadMediaEditorConfig() {
  if (state.mediaEditorConfig) {
    return state.mediaEditorConfig;
  }

  const response = await getMediaEditorConfig({ session: state.session });
  state.mediaEditorConfig = response.mediaEditor || null;
  return state.mediaEditorConfig;
},
async editThumbnailImage() {
  if (!state.articleForm.thumbnailPublicId) {
    state.showFeedback("Select an image before opening the editor.", "error");
    return;
  }

  state.mediaError = "";
  state.loadingAction = "media-editor";

  try {
    const config = await state.loadMediaEditorConfig();
    await openCloudinaryMediaEditor({
      cloudName: config?.cloudName,
      publicId: state.articleForm.thumbnailPublicId,
      onExport: state.applyEditedMedia,
    });
    state.showFeedback("Image editor opened. Export an image there to update the thumbnail.", "info");
  } catch (error) {
    state.handleMediaEditorError(error);
  } finally {
    state.loadingAction = "";
  }
},
clearThumbnail() {
  state.articleForm.thumbnailPublicId = "";
  state.articleForm.thumbnailUrl = "";
  state.articleForm.thumbnail = null;
  state.showMediaDiagnostics = false;
  state.showFeedback("Image cleared.", "info");
},
syncArticleTags() {
  state.articleForm.tags = state.articleForm.tagList.join(", ");
},
removeTagFromArticleForm(tag) {
  state.articleForm.tagList = state.articleForm.tagList.filter((item) => item !== tag);
  state.syncArticleTags();
},
insertMarkdown(field, before, after = "", placeholder = "text") {
  const editor = templateRefs[`${field}Editor`]?.value;
  const currentValue = String(state.articleForm[field] || "");
  const result = formatMarkdownSelection({
    value: currentValue,
    selectionStart: editor?.selectionStart,
    selectionEnd: editor?.selectionEnd,
    before,
    after,
    placeholder,
  });

  state.articleForm[field] = result.value;
  nextTick(() => {
    if (typeof editor?.focus === "function") {
      editor.focus();
    }

    if (typeof editor?.setSelectionRange === "function") {
      editor.setSelectionRange(result.selectionStart, result.selectionEnd);
    }
  });
},
async handleMediaFile(file) {
  if (!file) {
    return;
  }

  state.mediaError = "";
  state.loadingAction = "media-upload";

  try {
    const dataUrl = await state.readFileAsDataUrl(file);
    const response = await uploadMediaAsset({
      file: dataUrl,
      filename: file.name,
      session: state.session,
    });

    state.applySelectedMedia(response.asset);
    state.mediaUploadFile = null;
  } catch (error) {
    state.handleMediaError(error);
  } finally {
    state.loadingAction = "";
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
    state.showFeedback(adminUserMessage(error), "error");
    return;
  }

  state.showFeedback(adminUserMessage(error), "error");
},
handleMediaError(error) {
  if (error instanceof AdminApiError) {
    state.mediaError = adminUserMessage(error, { media: true });
    state.showFeedback(state.mediaError, "error");
    return;
  }

  state.mediaError = adminUserMessage(error, { media: true });
  state.showFeedback(state.mediaError, "error");
},
handleMediaEditorError(error) {
  if (error instanceof AdminApiError) {
    state.mediaError = adminUserMessage(error, { media: true });
  } else if (error instanceof CloudinaryMediaEditorUnavailableError) {
    state.mediaError = "Image editor is unavailable. Select or upload an image instead.";
  } else {
    state.mediaError = "Image editor is unavailable. Select or upload an image instead.";
  }

  state.showFeedback(state.mediaError, "error");
},
showFeedback(message, tone = "info") {
  state.feedbackMessage = message;
  state.feedbackTone = tone;
}
};
Object.entries(methods).forEach(([name, method]) => { state[name] = method.bind(state); });
const exposed = { ...toRefs(state), bodyEditor };
onBeforeRouteLeave((_to, _from, next) => {
  if (isAdminSignOutNavigation()) return next();
  if (hasUnsavedChanges.value && !globalThis.confirm?.("Leave the article editor and discard unsaved changes?")) return next(false);
  next();
});
onMounted(async () => {
  state.bindIdentityCallbacks();
  const initialSession = await getAdminSession();
  if (!active) return;
  state.session = initialSession;
  state.sessionResolved = true;
  state.redirectSignedOutVisitor();
  await state.loadEditor();
});
onBeforeUnmount(() => {
  active = false;
  editorRequestId += 1;
  stopIdentityCallbacks();
});
const {
  session, sessionResolved, articleForm, originalFormSnapshot, slugTouched, errors, mediaAssets, mediaDialogOpen, mediaError,
  mediaEditorConfig, mediaUploadFile, availableTagOptions, filteredTagOptions, tagsLoading, showMediaDiagnostics,
  bodyEditorMode, bodyEditorModeOptions, articleLocaleOptions, loadedArticle, statusMessage, feedbackMessage, feedbackTone,
  dashboardError, loadingAction, editorLoading, bindIdentityCallbacks, redirectSignedOutVisitor, snapshotForm, loadEditor,
  applyResolvedSession, applyCurrentAuthorProfile, normalizeTagOptions, loadContentfulTags, filterTagOptions,
  createNewContentfulTag, leaveEditor, updateArticleTitle, markSlugTouched, validateArticleForm, saveDraft, submitReview,
  requestUnpublication, ownerUnpublish, openMediaLibrary, applySelectedMedia, applyEditedMedia, loadMediaEditorConfig,
  editThumbnailImage, clearThumbnail, syncArticleTags, removeTagFromArticleForm, insertMarkdown, handleMediaFile,
  readFileAsDataUrl, handleAdminError, handleMediaError, handleMediaEditorError, showFeedback,
} = exposed;
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

.editor-heading-content {
  min-width: 0;
}

.editor-heading-actions {
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.article-language-switch {
  align-items: center;
  background: #ffffff;
  border: 1px solid #90a4ae;
  border-radius: 999px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 36px;
  overflow: hidden;
  padding: 3px;
  position: relative;

  &__option {
    background: transparent;
    border: 0;
    color: #607d8b;
    cursor: pointer;
    font-size: 0.74rem;
    font-weight: 800;
    letter-spacing: 0;
    min-width: 42px;
    padding: 6px 10px;
    position: relative;
    z-index: 1;

    &.active {
      color: #ffffff;
    }
  }

  &__track {
    background: #455a64;
    border-radius: 999px;
    bottom: 3px;
    left: 3px;
    position: absolute;
    top: 3px;
    transition: transform 140ms ease;
    width: calc(50% - 3px);

    &.english {
      transform: translateX(100%);
    }
  }
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

.editor-loading {
  background: #ffffff;
  border: 1px solid #cfd8dc;
  min-height: 340px;
  position: relative;

  p {
    color: #607d8b;
    font-weight: 700;
    margin: 12px 0 0;
  }
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

.markdown-format-actions,
.markdown-mode-actions {
  align-items: center;
  display: flex;
  gap: 4px;
}

.markdown-format-actions {
  flex: 1 1 auto;
  min-width: 0;
}

.markdown-mode-actions {
  flex: 0 0 auto;
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

.media-action {
  min-width: 0;
  width: 100%;
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
  display: flex;
  flex-direction: column;
  max-width: min(1160px, 96vw);
  max-height: calc(100dvh - 24px);
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

.media-dialog-content {
  min-height: 0;
  overflow: auto;
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

@media (max-width: 1080px) {
  .media-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .editor-shell {
    padding: 14px;
  }

  .editor-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .editor-heading-actions {
    justify-content: space-between;
  }

  .editor-heading-content,
  .editor-status,
  .editor-dashboard-action {
    min-width: 0;
  }

  .editor-card,
  .markdown-editor,
  .markdown-editor-toolbar,
  .markdown-mode-actions {
    min-width: 0;
  }

  .markdown-editor-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .markdown-format-actions {
    overflow-x: auto;
    padding-bottom: 2px;
    padding-inline: 4px;
    scroll-padding-inline: 4px;
    width: 100%;
  }

  .markdown-format-actions :focus-visible,
  .markdown-mode-actions :focus-visible {
    outline: 2px solid #455a64 !important;
    outline-offset: 2px;
  }

  .markdown-mode-actions {
    width: 100%;
  }

  .markdown-mode-actions .q-btn-toggle {
    width: 100%;
  }

  .form-row,
  .media-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .media-dialog {
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
    min-width: 0;
    width: calc(100vw - 24px);
  }

  .editor-actions {
    align-items: stretch;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor-action {
    min-width: 0;
    width: 100%;
  }

  .editor-action-primary {
    grid-column: 1 / -1;
  }
}
</style>
