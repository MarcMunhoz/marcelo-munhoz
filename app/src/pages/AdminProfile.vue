<template>
  <q-page class="admin-profile-page">
    <section v-if="showProfileSurface" class="profile-shell">
      <header class="profile-heading">
        <div>
          <p class="admin-kicker">Blog admin</p>
          <h1>Author profile</h1>
          <p>Manage the public author information stored in Contentful.</p>
        </div>
        <q-btn outline color="blue-grey-7" icon="dashboard" label="Dashboard" no-caps to="/admin" />
      </header>

      <q-banner v-if="profileError" class="feedback-error" rounded>{{ profileError }}</q-banner>

      <section v-if="!canWrite" class="profile-blocked">
        <q-icon name="lock" size="30px" />
        <div>
          <h2>Writer access required</h2>
          <p>Sign in with an invited writer account to edit an author profile.</p>
          <q-btn outline color="blue-grey-7" icon="login" label="Sign in" size="sm" @click="openLogin" />
        </div>
      </section>

      <section v-else class="profile-grid">
        <q-card flat bordered class="profile-card">
          <q-card-section>
            <p class="admin-kicker">Public profile</p>
            <h2>{{ profileForm.name || "Author" }}</h2>
            <p class="profile-caption">These fields render as editorial author data. They do not update the Netlify Identity account.</p>
          </q-card-section>

          <q-form class="profile-form" @submit.prevent="saveProfile">
            <q-card-section class="profile-form-fields">
              <q-input v-model="profileForm.name" label="Name" outlined dense :error="Boolean(errors.name)" :error-message="errors.name" />

              <div class="markdown-editor">
                <div class="markdown-editor-label">Biography</div>
                <div class="markdown-editor-toolbar">
                  <q-btn flat dense icon="format_bold" @click="insertBiographyMarkdown('**', '**', 'bold text')" />
                  <q-btn flat dense icon="format_italic" @click="insertBiographyMarkdown('_', '_', 'italic text')" />
                  <q-btn flat dense icon="link" @click="insertBiographyMarkdown('[', '](https://)', 'link text')" />
                  <q-btn flat dense icon="format_list_bulleted" @click="insertBiographyMarkdown('- ', '', 'List item')" />
                  <q-btn flat dense icon="format_list_numbered" @click="insertBiographyMarkdown('1. ', '', 'List item')" />
                  <q-btn flat dense icon="format_quote" @click="insertBiographyMarkdown('> ', '', 'Quote')" />
                  <q-space />
                  <q-btn-toggle v-model="bioEditorMode" dense no-caps toggle-color="blue-grey-7" :options="bioEditorModeOptions" />
                </div>
                <textarea
                  v-show="bioEditorMode === 'editor'"
                  ref="bioEditor"
                  v-model="profileForm.biography"
                  class="markdown-editor-textarea"
                  rows="10"
                  aria-label="Biography"
                ></textarea>
                <div v-show="bioEditorMode === 'preview'" class="markdown-editor-preview" v-html="biographyPreview"></div>
              </div>
            </q-card-section>

            <q-banner v-if="feedbackMessage" :class="feedbackClass" rounded>{{ feedbackMessage }}</q-banner>

            <q-card-actions align="right">
              <q-btn unelevated color="blue-grey-8" icon="save" label="Save profile" no-caps type="submit" :loading="loadingAction === 'profile-save'" />
            </q-card-actions>
          </q-form>
        </q-card>

        <aside class="profile-photo-panel">
          <p class="admin-kicker">Photo</p>
          <div class="profile-photo-preview">
            <img
              v-if="profilePhotoUrl"
              :src="profilePhotoUrl"
              :alt="`${profileForm.name || 'Author'} profile photo`"
              referrerpolicy="no-referrer"
              @error="advanceProfilePhoto"
            />
            <q-avatar v-else color="blue-grey-7" text-color="white" size="96px">{{ profileInitials }}</q-avatar>
          </div>
          <div class="profile-photo-source" aria-live="polite">
            <span>Current source</span>
            <strong>{{ profilePhotoSource.label }}</strong>
            <small v-if="profilePhotoSource.detail">{{ profilePhotoSource.detail }}</small>
          </div>
          <q-input
            v-model="profileForm.gravatarProfile"
            label="Gravatar profile"
            hint="Public profile slug or gravatar.com profile URL. Email addresses are not accepted."
            outlined
            dense
            :error="Boolean(errors.gravatarProfile)"
            :error-message="errors.gravatarProfile"
            @update:model-value="updateGravatarProfile"
          />
          <p v-if="profileForm.gravatarProfile && !profileForm.gravatarHash" class="profile-photo-resolution-note">
            New Gravatar photos are checked when you save.
          </p>
          <q-input
            v-model="profileForm.fallbackPhotoUrl"
            label="Fallback photo URL"
            hint="Optional HTTPS image from Gravatar, Cloudinary, or Contentful."
            outlined
            dense
            :error="Boolean(errors.fallbackPhotoUrl)"
            :error-message="errors.fallbackPhotoUrl"
            @update:model-value="markPhotoSettingsChanged"
          />
          <q-btn
            v-if="profilePhotoActionLabel"
            flat
            no-caps
            color="negative"
            icon="hide_image"
            :label="profilePhotoActionLabel"
            @click="useProfileInitials"
          />
          <p v-if="profilePhotoActionLabel" class="profile-photo-removal-note">
            Clears the photo settings in this blog only. Your Gravatar profile and original image remain unchanged.
          </p>
          <p class="profile-photo-guidance">
            Use a centered square image. Ideal: 512×512 px; minimum: 256×256 px. Prefer JPG or WebP for photos, or PNG for transparency,
            ideally below 500 KB.
          </p>
        </aside>
      </section>
    </section>
    <section v-else class="profile-login-shell" aria-hidden="true"></section>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { getAuthorProfile, updateAuthorProfile, adminUserMessage } from "../utils/adminApi.js";
import { adminAccountInitials, adminSessionDisplay, getAdminSession, isWriterSession, openAdminLogin } from "../utils/adminAuth.js";
import {
  authorProfileToForm,
  buildAuthorProfilePayload,
  createEmptyAuthorProfileForm,
  slugFromTitle,
  updateAuthorGravatarDraft,
} from "../utils/adminDashboard.js";
import {
  authorPhotoCandidates,
  authorPhotoResetActionLabel,
  authorPhotoSource,
  isAllowedFallbackPhotoUrl,
  nextAuthorPhotoIndex,
  normalizeGravatarProfileInput,
} from "../utils/authorPhotos.js";
import { marked } from "marked";

export default defineComponent({
  name: "AdminProfilePage",
  data() {
    return {
      session: null,
      sessionResolved: false,
      loginRedirecting: false,
      profileForm: createEmptyAuthorProfileForm(),
      profilePhotoIndex: 0,
      errors: {},
      profileError: "",
      feedbackMessage: "",
      feedbackTone: "info",
      loadingAction: "",
      bioEditorMode: "editor",
      bioEditorModeOptions: [
        { label: "Editor", value: "editor" },
        { label: "Preview", value: "preview" },
      ],
    };
  },
  computed: {
    canWrite() {
      return isWriterSession(this.session);
    },
    showProfileSurface() {
      return this.sessionResolved && !this.loginRedirecting;
    },
    sessionDisplay() {
      return adminSessionDisplay(this.session);
    },
    profileInitials() {
      return adminAccountInitials({ name: this.profileForm.name || this.sessionDisplay.name, roles: this.session?.roles || [] });
    },
    profilePhotoCandidates() {
      return authorPhotoCandidates(this.profilePhotoSettings);
    },
    profilePhotoSettings() {
      return {
        photo: {
          gravatar_profile: this.profileForm.gravatarProfile,
          gravatar_hash: this.profileForm.gravatarHash,
          fallback_url: this.profileForm.fallbackPhotoUrl,
          secure_url: this.profileForm.photoUrl,
        },
      };
    },
    profilePhotoUrl() {
      return this.profilePhotoCandidates[this.profilePhotoIndex] || "";
    },
    profilePhotoSource() {
      return authorPhotoSource(this.profilePhotoSettings, this.profilePhotoIndex);
    },
    profilePhotoActionLabel() {
      return authorPhotoResetActionLabel(this.profilePhotoSource.kind, this.profilePhotoCandidates.length);
    },
    feedbackClass() {
      return {
        "feedback-success": this.feedbackTone === "success",
        "feedback-error": this.feedbackTone === "error",
        "feedback-info": this.feedbackTone === "info",
      };
    },
    biographyPreview() {
      return marked.parse(this.profileForm.biography || "");
    },
  },
  watch: {
    "profileForm.gravatarProfile"() {
      this.profilePhotoIndex = 0;
    },
    "profileForm.fallbackPhotoUrl"() {
      this.profilePhotoIndex = 0;
    },
  },
  async mounted() {
    this.bindIdentityCallbacks();
    this.session = await getAdminSession();
    this.sessionResolved = true;
    this.redirectToLoginIfSignedOut();
    this.loadAuthorProfile();
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
        this.loadAuthorProfile();
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
    async loadAuthorProfile() {
      if (!this.canWrite) {
        return;
      }

      this.profileError = "";
      this.loadingAction = "profile-load";

      try {
        const response = await getAuthorProfile({ session: this.session });
        this.applyResolvedSession(response.session);
        this.profileForm = authorProfileToForm(response.profile);
        this.profilePhotoIndex = 0;
      } catch (error) {
        this.profileForm = createEmptyAuthorProfileForm();
        this.profileError = adminUserMessage(error);
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
    validateProfileForm() {
      const errors = {};

      if (!this.profileForm.name.trim()) {
        errors.name = "Name is required";
      }

      if (this.profileForm.slug && !/^[a-z]+(?:-[a-z]+)*$/.test(this.profileForm.slug)) {
        errors.slug = "Use letters and hyphens only";
      }

      if (!this.profileForm.slug && this.profileForm.name) {
        this.profileForm.slug = slugFromTitle(this.profileForm.name);
      }

      if (this.profileForm.gravatarProfile && !normalizeGravatarProfileInput(this.profileForm.gravatarProfile)) {
        errors.gravatarProfile = "Use a public Gravatar profile slug or URL";
      }

      if (!isAllowedFallbackPhotoUrl(this.profileForm.fallbackPhotoUrl)) {
        errors.fallbackPhotoUrl = "Use an approved HTTPS image URL";
      }

      this.errors = errors;
      return Object.keys(errors).length === 0;
    },
    async saveProfile() {
      if (!this.validateProfileForm()) {
        this.showFeedback("Fix the highlighted fields before saving.", "error");
        return;
      }

      this.loadingAction = "profile-save";

      try {
        const response = await updateAuthorProfile({
          profile: buildAuthorProfilePayload(this.profileForm),
          session: this.session,
        });
        this.profileForm.version = response.sys?.version || this.profileForm.version;
        await this.loadAuthorProfile();
        this.showFeedback("Author profile saved.", "success");
      } catch (error) {
        this.showFeedback(adminUserMessage(error), "error");
      } finally {
        this.loadingAction = "";
      }
    },
    insertBiographyMarkdown(before, after = "", placeholder = "text") {
      const value = String(this.profileForm.biography || "");
      const insertion = `${before}${placeholder}${after}`;
      this.profileForm.biography = value ? `${value}${value.endsWith("\n") ? "" : "\n"}${insertion}` : insertion;
    },
    advanceProfilePhoto() {
      this.profilePhotoIndex = nextAuthorPhotoIndex(this.profilePhotoCandidates, this.profilePhotoIndex);
    },
    markPhotoSettingsChanged() {
      this.profileForm.photoSettingsChanged = true;
      this.profilePhotoIndex = 0;
    },
    updateGravatarProfile(value) {
      this.profileForm = updateAuthorGravatarDraft(this.profileForm, value);
      this.profilePhotoIndex = 0;
    },
    useProfileInitials() {
      this.profileForm.gravatarProfile = "";
      this.profileForm.gravatarHash = "";
      this.profileForm.fallbackPhotoUrl = "";
      this.profileForm.photoUrl = "";
      this.markPhotoSettingsChanged();
    },
    showFeedback(message, tone = "info") {
      this.feedbackMessage = message;
      this.feedbackTone = tone;
    },
  },
});
</script>

<style lang="scss" scoped>
.admin-profile-page {
  background: #f2f4f3;
  color: #263238;
  min-height: inherit;
}

.profile-shell {
  padding: 22px;
}

.profile-heading {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
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

.admin-kicker {
  color: #607d8b;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.profile-blocked,
.profile-grid {
  display: grid;
  gap: 16px;
}

.profile-blocked {
  align-items: center;
  background: #ffffff;
  border-left: 4px solid #b7791f;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 18px;
}

.profile-grid {
  align-items: start;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
}

.profile-card,
.profile-photo-panel {
  background: #ffffff;
}

.profile-caption,
.profile-photo-panel p {
  color: #607d8b;
}

.profile-form-fields {
  display: grid;
  gap: 14px;
}

.markdown-editor {
  background: #ffffff;
  border: 1px solid #b0bec5;
  display: grid;
}

.markdown-editor-label {
  color: #263238;
  font-weight: 700;
  padding: 12px 14px 0;
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
  min-height: 280px;
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

.profile-photo-preview {
  align-items: center;
  display: flex;
  min-height: 180px;
  justify-content: center;
  width: 100%;

  img {
    border-radius: 4px;
    display: block;
    max-height: 220px;
    object-fit: cover;
    width: 100%;
  }
}

.profile-photo-source {
  background: #f5f7f7;
  border-left: 3px solid #607d8b;
  display: grid;
  gap: 2px;
  padding: 10px 12px;

  span {
    color: #607d8b;
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  small {
    color: #607d8b;
    overflow-wrap: anywhere;
  }
}

.profile-photo-removal-note {
  font-size: 0.8rem;
  margin: -8px 0 0;
}

.profile-photo-resolution-note {
  font-size: 0.8rem;
  margin: -8px 0 0;
}

.profile-photo-panel {
  align-self: start;
  border: 1px solid #cfd8dc;
  display: grid;
  gap: 14px;
  padding: 16px;
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

.profile-login-shell {
  min-height: calc(100vh - 98px);
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
