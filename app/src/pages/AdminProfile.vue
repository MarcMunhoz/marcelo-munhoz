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
                <pre v-show="bioEditorMode === 'preview'" class="markdown-editor-preview">{{ biographyPreview }}</pre>
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

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getAuthorProfile, updateAuthorProfile, adminUserMessage } from "../utils/adminApi.js";
import { adminAccountInitials, adminSessionDisplay, bindIdentityCallbacks, getAdminSession, isWriterSession } from "../utils/adminAuth.js";
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

const router = useRouter();
let active = true;
let profileRequestId = 0;
let stopIdentityCallbacks = () => {};
const session = ref(null);
const sessionResolved = ref(false);
const profileForm = ref(createEmptyAuthorProfileForm());
const profilePhotoIndex = ref(0);
const errors = ref({});
const profileError = ref("");
const feedbackMessage = ref("");
const feedbackTone = ref("info");
const loadingAction = ref("");
const bioEditorMode = ref("editor");
const bioEditorModeOptions = [
        { label: "Editor", value: "editor" },
        { label: "Preview", value: "preview" },
];
const canWrite = computed(() => isWriterSession(session.value));
const showProfileSurface = computed(() => sessionResolved.value);
const sessionDisplay = computed(() => adminSessionDisplay(session.value));
const profileInitials = computed(() => adminAccountInitials({ name: profileForm.value.name || sessionDisplay.value.name, roles: session.value?.roles || [] }));
const profilePhotoSettings = computed(() => ({
        photo: {
          gravatar_profile: profileForm.value.gravatarProfile,
          gravatar_hash: profileForm.value.gravatarHash,
          fallback_url: profileForm.value.fallbackPhotoUrl,
          secure_url: profileForm.value.photoUrl,
        },
      }));
const profilePhotoCandidates = computed(() => authorPhotoCandidates(profilePhotoSettings.value));
const profilePhotoUrl = computed(() => profilePhotoCandidates.value[profilePhotoIndex.value] || "");
const profilePhotoSource = computed(() => authorPhotoSource(profilePhotoSettings.value, profilePhotoIndex.value));
const profilePhotoActionLabel = computed(() => authorPhotoResetActionLabel(profilePhotoSource.value.kind, profilePhotoCandidates.value.length));
const feedbackClass = computed(() => ({
        "feedback-success": feedbackTone.value === "success",
        "feedback-error": feedbackTone.value === "error",
        "feedback-info": feedbackTone.value === "info",
      }));
const biographyPreview = computed(() => profileForm.value.biography || "");
watch(() => profileForm.value.gravatarProfile, () => { profilePhotoIndex.value = 0; });
watch(() => profileForm.value.fallbackPhotoUrl, () => { profilePhotoIndex.value = 0; });

const registerIdentityCallbacks = () => {
  const identity = globalThis.netlifyIdentity;
  stopIdentityCallbacks = bindIdentityCallbacks({
    identity,
    onLogin: async () => {
      identity?.close?.();
      const sessionAfterLogin = await getAdminSession();
      if (!active) return;
      session.value = sessionAfterLogin;
      await loadAuthorProfile();
    },
  });
};
const redirectSignedOutVisitor = () => {
      if (!session.value) {
        router.replace("/");
      }
};
const applyResolvedSession = (resolvedSession = {}) => {
  if (resolvedSession.authorEntryId) session.value = { ...session.value, authorEntryId: resolvedSession.authorEntryId };
};
const loadAuthorProfile = async () => {
      const currentRequestId = ++profileRequestId;
      if (!canWrite.value) {
        return;
      }

      profileError.value = "";
      loadingAction.value = "profile-load";

      try {
        const response = await getAuthorProfile({ session: session.value });
        if (!active || currentRequestId !== profileRequestId) return;
        applyResolvedSession(response.session);
        profileForm.value = authorProfileToForm(response.profile);
        profilePhotoIndex.value = 0;
      } catch (error) {
        if (!active || currentRequestId !== profileRequestId) return;
        profileForm.value = createEmptyAuthorProfileForm();
        profileError.value = adminUserMessage(error);
      } finally {
        if (active && currentRequestId === profileRequestId) loadingAction.value = "";
      }
};
const validateProfileForm = () => {
      const validationErrors = {};

      if (!profileForm.value.name.trim()) {
        validationErrors.name = "Name is required";
      }

      if (profileForm.value.slug && !/^[a-z]+(?:-[a-z]+)*$/.test(profileForm.value.slug)) {
        validationErrors.slug = "Use letters and hyphens only";
      }

      if (!profileForm.value.slug && profileForm.value.name) {
        profileForm.value.slug = slugFromTitle(profileForm.value.name);
      }

      if (profileForm.value.gravatarProfile && !normalizeGravatarProfileInput(profileForm.value.gravatarProfile)) {
        validationErrors.gravatarProfile = "Use a public Gravatar profile slug or URL";
      }

      if (!isAllowedFallbackPhotoUrl(profileForm.value.fallbackPhotoUrl)) {
        validationErrors.fallbackPhotoUrl = "Use an approved HTTPS image URL";
      }

      errors.value = validationErrors;
      return Object.keys(validationErrors).length === 0;
};
const showFeedback = (message, tone = "info") => { feedbackMessage.value = message; feedbackTone.value = tone; };
const saveProfile = async () => {
      if (!validateProfileForm()) {
        showFeedback("Fix the highlighted fields before saving.", "error");
        return;
      }

      loadingAction.value = "profile-save";

      try {
        const response = await updateAuthorProfile({
          profile: buildAuthorProfilePayload(profileForm.value),
          session: session.value,
        });
        profileForm.value.version = response.sys?.version || profileForm.value.version;
        await loadAuthorProfile();
        showFeedback("Author profile saved.", "success");
      } catch (error) {
        showFeedback(adminUserMessage(error), "error");
      } finally {
        loadingAction.value = "";
      }
};
const insertBiographyMarkdown = (before, after = "", placeholder = "text") => {
      const value = String(profileForm.value.biography || "");
      const insertion = `${before}${placeholder}${after}`;
      profileForm.value.biography = value ? `${value}${value.endsWith("\n") ? "" : "\n"}${insertion}` : insertion;
};
const advanceProfilePhoto = () => { profilePhotoIndex.value = nextAuthorPhotoIndex(profilePhotoCandidates.value, profilePhotoIndex.value); };
const markPhotoSettingsChanged = () => { profileForm.value.photoSettingsChanged = true; profilePhotoIndex.value = 0; };
const updateGravatarProfile = (value) => { profileForm.value = updateAuthorGravatarDraft(profileForm.value, value); profilePhotoIndex.value = 0; };
const useProfileInitials = () => {
  profileForm.value.gravatarProfile = ""; profileForm.value.gravatarHash = ""; profileForm.value.fallbackPhotoUrl = ""; profileForm.value.photoUrl = ""; markPhotoSettingsChanged();
};
onMounted(async () => {
  registerIdentityCallbacks();
  const initialSession = await getAdminSession();
  if (!active) return;
  session.value = initialSession;
  sessionResolved.value = true;
  redirectSignedOutVisitor();
  loadAuthorProfile();
});
onBeforeUnmount(() => {
  active = false;
  profileRequestId += 1;
  stopIdentityCallbacks();
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
