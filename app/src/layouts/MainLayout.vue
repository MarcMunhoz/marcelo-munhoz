<template>
  <q-layout view="hHh lpR fff">
    <q-header elevated reveal class="bg-grey-5">
      <q-toolbar class="site-toolbar">
        <q-avatar>
          <img :src="avatar" class="" />
        </q-avatar>

        <q-toolbar-title class="site-toolbar-title">
          <span v-if="$route.path !== '/'">
            <span role="button" tabindex="0" class="site-name cursor-pointer uppercase" @click="handleNameClick" @keyup.enter="handleNameClick" @keyup.space.prevent="handleNameClick">Marcelo Munhoz</span>
            | <i class="not-italic text-blue-grey-5 header-title">{{ $route.name }}</i>
          </span>
          <span v-else role="button" tabindex="0" class="site-name cursor-pointer uppercase" @click="handleNameClick" @keyup.enter="handleNameClick" @keyup.space.prevent="handleNameClick"> Marcelo Munhoz </span>
        </q-toolbar-title>

        <q-btn outline icon="badge" label="About" aria-label="About" to="/about" size="sm" class="site-nav-action desktop-navigation-action mr-4" color="blue-grey-5">
          <q-tooltip>About</q-tooltip>
        </q-btn>
        <q-btn outline icon="newspaper" label="Blog" aria-label="Blog" to="/blog" size="sm" class="site-nav-action desktop-navigation-action mr-4" color="blue-grey-5">
          <q-tooltip>Blog</q-tooltip>
        </q-btn>
        <q-btn-dropdown
          v-if="adminSession"
          id="admin-menu-trigger"
          outline
          no-caps
          icon="edit_note"
          :label="adminNavLabel"
          aria-label="Admin"
          toggle-aria-label="Admin"
          size="sm"
          color="blue-grey-5"
          class="site-nav-action desktop-navigation-action admin-account-menu"
        >
          <q-list class="admin-account-list">
            <q-item class="admin-account-summary">
              <q-item-section avatar>
                <q-avatar color="blue-grey-7" text-color="white" size="34px">
                  <img
                    v-if="adminProfilePhotoUrl"
                    :src="adminProfilePhotoUrl"
                    :alt="`${adminDisplay.name} profile photo`"
                    referrerpolicy="no-referrer"
                    @error="advanceAdminProfilePhoto"
                  />
                  <template v-else>{{ adminInitials }}</template>
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ adminDisplay.name }}</q-item-label>
                <q-item-label caption>{{ adminNavCaption }}</q-item-label>
              </q-item-section>
            </q-item>

            <q-separator />

            <q-item clickable v-close-popup to="/admin">
              <q-item-section avatar>
                <q-icon name="dashboard" />
              </q-item-section>
              <q-item-section>Dashboard</q-item-section>
            </q-item>
            <q-item v-if="adminSession" clickable v-close-popup to="/admin/profile">
              <q-item-section avatar>
                <q-icon name="person" />
              </q-item-section>
              <q-item-section>Author profile</q-item-section>
            </q-item>
            <q-item v-if="adminDisplay.canSignOut" clickable v-close-popup @click="signOut">
              <q-item-section avatar>
                <q-icon name="logout" />
              </q-item-section>
              <q-item-section>Sign out</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <q-tooltip v-if="adminSession" target="#admin-menu-trigger">Admin</q-tooltip>

        <q-btn-dropdown
          outline
          no-caps
          icon="menu"
          aria-label="Navigation menu"
          toggle-aria-label="Navigation menu"
          size="sm"
          color="blue-grey-5"
          class="mobile-navigation-menu"
        >
          <q-list class="mobile-navigation-list">
            <q-item clickable v-close-popup to="/about">
              <q-item-section avatar><q-icon name="badge" /></q-item-section>
              <q-item-section>About</q-item-section>
            </q-item>
            <q-item clickable v-close-popup to="/blog">
              <q-item-section avatar><q-icon name="newspaper" /></q-item-section>
              <q-item-section>Blog</q-item-section>
            </q-item>
            <q-separator v-if="adminSession" />
            <q-item v-if="adminSession" clickable v-close-popup to="/admin">
              <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
              <q-item-section>Dashboard</q-item-section>
            </q-item>
            <q-item v-if="adminSession" clickable v-close-popup to="/admin/profile">
              <q-item-section avatar><q-icon name="person" /></q-item-section>
              <q-item-section>Author profile</q-item-section>
            </q-item>
            <q-item v-if="adminDisplay.canSignOut" clickable v-close-popup @click="signOut">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>Sign out</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-page-container class="">
      <router-view />
    </q-page-container>

    <q-footer elevated class="bg-grey-5 text-center py-2">
      <q-toolbar class="site-footer-toolbar">
        <q-toolbar-title class="site-footer-content" :class="['text-base']">
          © 2018-Today / Copyright Marcelo Munhoz. All rights reserved.
          <p class="text-sm">
            This site is built with
            <a href="https://quasar.dev" class="font-weight-bold text-blue-grey-5">Quasar</a>, and hosted on <a href="https://www.netlify.com" class="font-weight-bold text-blue-grey-5">Netlify</a>. The source code is hosted on <a href="https://github.com" class="font-weight-bold text-blue-grey-5">Github</a>.
          </p>
        </q-toolbar-title>
      </q-toolbar>
    </q-footer>

    <q-dialog v-model="adminAccessDialog">
      <q-card class="admin-access-card">
        <q-card-section>
          <h2 class="admin-access-title">Diga “AMIGO” e entre</h2>
          <p class="admin-access-copy">Digite a palavra para abrir o acesso administrativo.</p>
        </q-card-section>
        <q-form @submit.prevent="submitAdminAccess">
          <q-card-section>
            <q-input v-model="adminAccessPhrase" autofocus outlined label="Palavra" />
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat no-caps label="Cancelar" v-close-popup />
            <q-btn unelevated no-caps color="blue-grey-8" label="Entrar" type="submit" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script>
import { defineComponent } from "vue";
import { getAuthorProfile } from "../utils/adminApi.js";
import {
  adminAccessPhraseMatches,
  adminAccountInitials,
  adminSessionDisplay,
  getAdminSession,
  nextAdminAccessClick,
  openAdminLogin,
  redirectSignedOutAdmin,
  rejectAdminAccess,
  signOutAdmin,
} from "../utils/adminAuth.js";
import { authorPhotoCandidates, nextAuthorPhotoIndex } from "../utils/authorPhotos.js";

export default defineComponent({
  name: "MainLayout",
  data() {
    return {
      avatar: "https://en.gravatar.com/userimage/6120444/f6673ca4647b547645d7384a96b8921c",
      adminSession: null,
      adminProfile: null,
      adminProfilePhotoIndex: 0,
      adminAccessDialog: false,
      adminAccessPhrase: "",
      adminAccessClickState: null,
      nameNavigationTimer: null,
      adminLoginRequested: false,
    };
  },
  computed: {
    adminDisplay() {
      return adminSessionDisplay(this.adminSession);
    },
    adminNavLabel() {
      return this.adminSession ? this.adminDisplay.name : "Admin";
    },
    adminNavCaption() {
      return this.adminSession ? `${this.adminDisplay.role} · ${this.adminDisplay.context}` : "Sign in required";
    },
    adminInitials() {
      return adminAccountInitials(this.adminSession);
    },
    adminProfilePhotoUrl() {
      return authorPhotoCandidates(this.adminProfile || {})[this.adminProfilePhotoIndex] || "";
    },
  },
  async mounted() {
    this.adminSession = await getAdminSession();
    await this.loadAdminProfile();
    this.bindIdentityCallbacks();
  },
  beforeUnmount() {
    clearTimeout(this.nameNavigationTimer);
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

        this.adminSession = await getAdminSession();
        await this.loadAdminProfile();
        if (this.adminLoginRequested && this.adminSession) {
          this.adminLoginRequested = false;
          await this.$router.push("/admin");
        }
      });
      identity.on("logout", () => this.finishAdminSignOut());
    },
    async loadAdminProfile() {
      if (!this.adminSession) {
        this.adminProfile = null;
        this.adminProfilePhotoIndex = 0;
        return;
      }

      try {
        const response = await getAuthorProfile({ session: this.adminSession });
        this.adminProfile = response.profile || null;
        this.adminProfilePhotoIndex = 0;
      } catch {
        this.adminProfile = null;
        this.adminProfilePhotoIndex = 0;
      }
    },
    advanceAdminProfilePhoto() {
      this.adminProfilePhotoIndex = nextAuthorPhotoIndex(authorPhotoCandidates(this.adminProfile || {}), this.adminProfilePhotoIndex);
    },
    async signOut() {
      const signedOut = await signOutAdmin();

      if (signedOut && this.adminSession) await this.finishAdminSignOut();
    },
    async finishAdminSignOut() {
      this.adminSession = null;
      this.adminProfile = null;
      this.adminProfilePhotoIndex = 0;
      await redirectSignedOutAdmin({ router: this.$router, currentPath: this.$route.path });
    },
    navigateHome() {
      if (this.$route.path !== "/") this.$router.push("/");
    },
    handleNameClick() {
      const result = nextAdminAccessClick(this.adminAccessClickState);
      this.adminAccessClickState = result.state;
      clearTimeout(this.nameNavigationTimer);

      if (result.unlock) {
        this.adminAccessPhrase = "";
        this.adminAccessDialog = true;
        return;
      }

      this.nameNavigationTimer = setTimeout(() => {
        this.adminAccessClickState = null;
        this.navigateHome();
      }, 600);
    },
    async submitAdminAccess() {
      if (!adminAccessPhraseMatches(this.adminAccessPhrase)) {
        this.adminAccessDialog = false;
        this.adminAccessPhrase = "";
        await rejectAdminAccess({
          notifyImpl: (options) => this.$q.notify(options),
          router: this.$router,
          currentPath: this.$route.path,
        });
        return;
      }

      this.adminAccessDialog = false;
      this.adminLoginRequested = openAdminLogin();
    },
  },
});
</script>

<style lang="scss" scoped>
.admin-account-menu {
  max-width: min(220px, 42vw);

  :deep(.q-btn__content) {
    min-width: 0;
  }

  :deep(.block) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.admin-account-list {
  min-width: 240px;
}

.mobile-navigation-menu {
  display: none;
}

.mobile-navigation-list {
  min-width: min(240px, calc(100vw - 24px));
}

.admin-access-card {
  max-width: calc(100vw - 24px);
  width: 380px;
}

.admin-access-title {
  font-size: 1.25rem;
  margin: 0 0 0.35rem;
}

.admin-access-copy {
  color: #546e7a;
  margin: 0;
}

.admin-account-summary {
  cursor: default;
  padding-bottom: 12px;
  padding-top: 12px;
}

.site-footer-content {
  min-width: 0;
  overflow: visible;
  overflow-wrap: anywhere;
  white-space: normal;
}

@media (max-width: 700px) {
  .site-toolbar {
    gap: 0.25rem;
    min-width: 0;
    padding-inline: 0.5rem;
  }

  .site-toolbar-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .desktop-navigation-action {
    display: none;
  }

  .mobile-navigation-menu {
    display: inline-flex;
    flex: 0 0 auto;
  }

  .admin-account-list {
    min-width: min(240px, calc(100vw - 24px));
  }

  .site-footer-toolbar {
    min-width: 0;
    padding-inline: 0.75rem;
  }
}
</style>
