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

    <q-dialog v-model="adminSessionWarning" persistent>
      <q-card class="admin-session-warning-card" role="alertdialog" aria-live="assertive" aria-labelledby="admin-session-warning-title">
        <q-card-section>
          <h2 id="admin-session-warning-title" class="admin-access-title">Admin session expiring</h2>
          <p class="admin-access-copy">Your administrative session will end in less than one minute due to inactivity.</p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Sign out" @click="signOutFromWarning" />
          <q-btn unelevated no-caps color="blue-grey-8" label="Continue session" @click="continueAdminSession" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-banner
      v-if="adminAccessNotice"
      class="admin-access-notice"
      rounded
      role="alert"
      aria-live="assertive"
    >
      {{ adminAccessNotice }}
    </q-banner>
  </q-layout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getAuthorProfile } from "../utils/adminApi.js";
import {
  adminAccessPhraseMatches,
  adminAccountInitials,
  adminSessionDisplay,
  bindIdentityCallbacks,
  completeAdminIdentityLogin,
  createAdminProfileLoader,
  getAdminSession,
  nextAdminAccessClick,
  openAdminLogin,
  redirectSignedOutAdmin,
  rejectAdminAccess,
  signOutAdmin,
} from "../utils/adminAuth.js";
import { adminSessionLifecycle } from "../utils/adminSessionLifecycle.js";
import { authorPhotoCandidates, nextAuthorPhotoIndex } from "../utils/authorPhotos.js";

const route = useRoute();
const router = useRouter();
const avatar = "https://en.gravatar.com/userimage/6120444/f6673ca4647b547645d7384a96b8921c";
const adminSession = ref(null);
const adminProfile = ref(null);
const adminProfilePhotoIndex = ref(0);
const adminAccessDialog = ref(false);
const adminAccessPhrase = ref("");
const adminAccessClickState = ref(null);
const nameNavigationTimer = ref(null);
const adminLoginRequested = ref(false);
const adminAccessNotice = ref("");
const adminAccessNoticeTimer = ref(null);
const adminSessionWarning = ref(false);
const adminDisplay = computed(() => adminSessionDisplay(adminSession.value));
const adminNavLabel = computed(() => (adminSession.value ? adminDisplay.value.name : "Admin"));
const adminNavCaption = computed(() =>
  adminSession.value ? `${adminDisplay.value.role} · ${adminDisplay.value.context}` : "Sign in required"
);
const adminInitials = computed(() => adminAccountInitials(adminSession.value));
const adminProfilePhotoUrl = computed(
  () => authorPhotoCandidates(adminProfile.value || {})[adminProfilePhotoIndex.value] || ""
);
let stopIdentityCallbacks = () => {};
let stopAdminActivity = () => {};
let unmounted = false;

const profileLoader = createAdminProfileLoader({
  getAuthorProfileImpl: getAuthorProfile,
  applyProfile: (profile) => {
    adminProfile.value = profile;
    adminProfilePhotoIndex.value = 0;
  },
});

const loadAdminProfile = (session = adminSession.value) => profileLoader.load(session);

const advanceAdminProfilePhoto = () => {
  adminProfilePhotoIndex.value = nextAuthorPhotoIndex(
    authorPhotoCandidates(adminProfile.value || {}),
    adminProfilePhotoIndex.value
  );
};

const finishAdminSignOut = async () => {
  adminSessionLifecycle.clearLocalSession();
  adminSessionLifecycle.stop();
  stopAdminActivity();
  stopAdminActivity = () => {};
  adminSessionWarning.value = false;
  profileLoader.invalidate();
  adminSession.value = null;
  adminProfile.value = null;
  adminProfilePhotoIndex.value = 0;
  await redirectSignedOutAdmin({ router, currentPath: route.path });
};

const signOut = async () => {
  await signOutAdmin({ onLocalSignOut: finishAdminSignOut });
};

const signOutFromWarning = () => signOutAdmin({ confirmImpl: () => true, onLocalSignOut: finishAdminSignOut });

const continueAdminSession = () => {
  if (adminSessionLifecycle.continueSession()) adminSessionWarning.value = false;
};

const startAdminSessionLifecycle = (session) => {
  adminSessionLifecycle.stop();
  stopAdminActivity();
  stopAdminActivity = () => {};
  adminSessionWarning.value = false;

  if (!session || session.preview) return;

  adminSessionLifecycle.start({
    identity: globalThis.netlifyIdentity,
    onWarning: () => {
      adminSessionWarning.value = true;
    },
    onExpire: () => finishAdminSignOut(),
  });
  stopAdminActivity = adminSessionLifecycle.observeActivity({
    isAdminSurface: () => Boolean(route.meta?.requiresAdmin),
  });
};

const navigateHome = () => {
  if (route.path !== "/") router.push("/");
};

const handleNameClick = () => {
  const result = nextAdminAccessClick(adminAccessClickState.value);
  adminAccessClickState.value = result.state;
  clearTimeout(nameNavigationTimer.value);

  if (result.unlock) {
    adminAccessPhrase.value = "";
    adminAccessDialog.value = true;
    return;
  }

  nameNavigationTimer.value = setTimeout(() => {
    adminAccessClickState.value = null;
    navigateHome();
  }, 600);
};

const showAdminAccessNotice = (message) => {
  clearTimeout(adminAccessNoticeTimer.value);
  adminAccessNotice.value = String(message || "");
  adminAccessNoticeTimer.value = setTimeout(() => {
    adminAccessNotice.value = "";
    adminAccessNoticeTimer.value = null;
  }, 3500);
};

const submitAdminAccess = async () => {
  if (!adminAccessPhraseMatches(adminAccessPhrase.value)) {
    adminAccessDialog.value = false;
    adminAccessPhrase.value = "";
    await rejectAdminAccess({
      notifyImpl: ({ message }) => showAdminAccessNotice(message),
      router,
      currentPath: route.path,
    });
    return;
  }

  adminAccessDialog.value = false;
  adminLoginRequested.value = openAdminLogin();
};

onMounted(async () => {
  const identity = globalThis.netlifyIdentity;
  stopIdentityCallbacks = bindIdentityCallbacks({
    identity,
    onLogin: () => {
      profileLoader.invalidate();
      return completeAdminIdentityLogin({
        identity,
        lifecycle: adminSessionLifecycle,
        getSessionImpl: getAdminSession,
        setSession: (sessionAfterLogin) => {
          adminSession.value = sessionAfterLogin;
          startAdminSessionLifecycle(sessionAfterLogin);
        },
        loadProfile: loadAdminProfile,
        isLoginRequested: () => adminLoginRequested.value,
        clearLoginRequest: () => {
          adminLoginRequested.value = false;
        },
        router,
        isActive: () => !unmounted,
        isSessionCurrent: (sessionAfterLogin) => adminSession.value === sessionAfterLogin,
      });
    },
    onLogout: () => finishAdminSignOut(),
  });

  const session = await getAdminSession();

  if (unmounted) return;
  adminSession.value = session;
  startAdminSessionLifecycle(session);
  await loadAdminProfile();
});

onBeforeUnmount(() => {
  unmounted = true;
  profileLoader.invalidate();
  clearTimeout(nameNavigationTimer.value);
  clearTimeout(adminAccessNoticeTimer.value);
  stopIdentityCallbacks();
  adminSessionLifecycle.stop();
  stopAdminActivity();
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

.admin-session-warning-card {
  max-width: calc(100vw - 24px);
  width: 440px;
}

.admin-access-title {
  font-size: 1.25rem;
  margin: 0 0 0.35rem;
}

.admin-access-copy {
  color: #546e7a;
  margin: 0;
}

.admin-access-notice {
  background: #ffebee;
  bottom: max(16px, env(safe-area-inset-bottom));
  color: #b71c1c;
  left: 50%;
  max-width: calc(100vw - 32px);
  position: fixed;
  transform: translateX(-50%);
  width: max-content;
  z-index: 7000;
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
