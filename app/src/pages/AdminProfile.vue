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
              <q-input v-model="profileForm.slug" label="Author slug" outlined dense :error="Boolean(errors.slug)" :error-message="errors.slug" />
              <q-input v-model="profileForm.biography" label="Biography" outlined type="textarea" autogrow :rows="6" />

              <div class="profile-photo-field">
                <div class="profile-photo-preview">
                  <img v-if="profileForm.photoUrl" :src="profileForm.photoUrl" :alt="`${profileForm.name || 'Author'} profile photo`" />
                  <q-avatar v-else color="blue-grey-7" text-color="white" size="72px">{{ profileInitials }}</q-avatar>
                </div>
                <div class="profile-photo-controls">
                  <q-input v-model="profileForm.photoUrl" label="Profile photo URL" outlined dense />
                  <p>Optional. Leave empty to use the text fallback.</p>
                </div>
              </div>
            </q-card-section>

            <q-banner v-if="feedbackMessage" :class="feedbackClass" rounded>{{ feedbackMessage }}</q-banner>

            <q-card-actions align="right">
              <q-btn unelevated color="blue-grey-8" icon="save" label="Save profile" no-caps type="submit" :loading="loadingAction === 'profile-save'" />
            </q-card-actions>
          </q-form>
        </q-card>

        <aside class="identity-card">
          <p class="admin-kicker">Signed in as</p>
          <strong>{{ sessionDisplay.name }}</strong>
          <span>{{ sessionDisplay.role }} · {{ sessionDisplay.context }}</span>
          <p>Authentication and roles stay in Netlify Identity. Public author content stays in Contentful.</p>
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
import { authorProfileToForm, buildAuthorProfilePayload, createEmptyAuthorProfileForm, slugFromTitle } from "../utils/adminDashboard.js";

export default defineComponent({
  name: "AdminProfilePage",
  data() {
    return {
      session: null,
      sessionResolved: false,
      loginRedirecting: false,
      profileForm: createEmptyAuthorProfileForm(),
      errors: {},
      profileError: "",
      feedbackMessage: "",
      feedbackTone: "info",
      loadingAction: "",
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
        this.profileForm = authorProfileToForm(response.profile);
      } catch (error) {
        this.profileForm = createEmptyAuthorProfileForm();
        this.profileError = adminUserMessage(error);
      } finally {
        this.loadingAction = "";
      }
    },
    validateProfileForm() {
      const errors = {};

      if (!this.profileForm.name.trim()) {
        errors.name = "Name is required";
      }

      if (this.profileForm.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.profileForm.slug)) {
        errors.slug = "Use a URL-safe slug";
      }

      if (!this.profileForm.slug && this.profileForm.name) {
        this.profileForm.slug = slugFromTitle(this.profileForm.name);
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
        this.showFeedback("Author profile saved.", "success");
      } catch (error) {
        this.showFeedback(adminUserMessage(error), "error");
      } finally {
        this.loadingAction = "";
      }
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
  grid-template-columns: minmax(0, 1fr) minmax(240px, 320px);
}

.profile-card,
.identity-card {
  background: #ffffff;
}

.profile-caption,
.identity-card p,
.identity-card span,
.profile-photo-controls p {
  color: #607d8b;
}

.profile-form-fields {
  display: grid;
  gap: 14px;
}

.profile-photo-field {
  align-items: center;
  border: 1px solid #d8e1e5;
  display: grid;
  gap: 16px;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 14px;
}

.profile-photo-preview {
  align-items: center;
  display: flex;
  height: 88px;
  justify-content: center;
  width: 88px;

  img {
    border-radius: 50%;
    height: 72px;
    object-fit: cover;
    width: 72px;
  }
}

.identity-card {
  align-self: start;
  border: 1px solid #cfd8dc;
  display: grid;
  gap: 8px;
  padding: 16px;

  strong,
  span {
    display: block;
  }
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
  .profile-grid,
  .profile-photo-field {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
