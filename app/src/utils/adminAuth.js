const PREVIEW_ROLE_STORAGE_KEY = "admin.previewRole";
const PREVIEW_ROLES = new Set(["writer", "owner"]);
const ADMIN_ACCESS_CLICK_WINDOW_MS = 600;
let adminSignOutNavigation = false;

export const nextAdminAccessClick = (state, now = Date.now()) => {
  const insideWindow = state && now - state.lastClickAt <= ADMIN_ACCESS_CLICK_WINDOW_MS;
  const count = insideWindow ? state.count + 1 : 1;

  if (count === 3) {
    return { state: null, unlock: true };
  }

  return { state: { count, lastClickAt: now }, unlock: false };
};

export const adminAccessPhraseMatches = (value) => String(value || "").trim() === "AMIGO";

export const isAdminSignOutNavigation = () => adminSignOutNavigation;

export const redirectSignedOutAdmin = async ({ router, currentPath = "/" } = {}) => {
  if (currentPath === "/" || typeof router?.replace !== "function") {
    return false;
  }

  adminSignOutNavigation = true;
  try {
    await router.replace("/");
    return true;
  } finally {
    adminSignOutNavigation = false;
  }
};

export const rejectAdminAccess = async ({ notifyImpl, router, currentPath = "/" } = {}) => {
  notifyImpl?.({ type: "negative", message: "Você não é um AMIGO, até a próxima!" });
  await redirectSignedOutAdmin({ router, currentPath });
};

export const selectedPreviewRole = ({ storage = globalThis.localStorage } = {}) => {
  const role = storage?.getItem?.(PREVIEW_ROLE_STORAGE_KEY);
  return PREVIEW_ROLES.has(role) ? role : "owner";
};

export const setPreviewRole = (role, { storage = globalThis.localStorage } = {}) => {
  if (!PREVIEW_ROLES.has(role)) {
    return;
  }

  storage?.setItem?.(PREVIEW_ROLE_STORAGE_KEY, role);
};

export const createPreviewSession = ({ role = "owner" } = {}) => ({
  subject: `local-preview-${role}`,
  name: `${role === "owner" ? "Owner" : "Writer"} preview`,
  roles: [role],
  preview: true,
});

const rolesFromUser = (user = {}) => {
  const roles = user.app_metadata?.roles || user.app_metadata?.role || user.user_metadata?.roles || [];
  return (Array.isArray(roles) ? roles : [roles]).map((role) => String(role || "").trim().toLowerCase()).filter(Boolean);
};

const authorEntryIdFromUser = (user = {}) =>
  user.app_metadata?.authorEntryId || user.app_metadata?.author_entry_id || user.user_metadata?.authorEntryId || user.user_metadata?.author_entry_id || "";

const sessionFromUser = async (user) => {
  if (!user) {
    return null;
  }

  const token = typeof user.jwt === "function" ? await user.jwt() : null;
  const authorEntryId = authorEntryIdFromUser(user);

  return {
    subject: user.id || user.sub,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Authenticated user",
    roles: rolesFromUser(user).filter(Boolean),
    ...(authorEntryId ? { authorEntryId } : {}),
    token,
    preview: false,
  };
};

export const getAdminSession = async () => {
  const identity = globalThis.netlifyIdentity;
  const user = typeof identity?.currentUser === "function" ? identity.currentUser() : null;
  const session = await sessionFromUser(user);

  if (session) {
    return session;
  }

  return import.meta.env?.DEV ? createPreviewSession({ role: selectedPreviewRole() }) : null;
};

export const openAdminLogin = ({ identity = globalThis.netlifyIdentity, location = globalThis.location } = {}) => {
  if (typeof identity?.open === "function") {
    identity.open("login");
    return true;
  }

  return false;
};

export const bindIdentityCallbacks = ({ identity = globalThis.netlifyIdentity, onLogin, onLogout } = {}) => {
  if (typeof identity?.on !== "function") {
    return () => {};
  }

  let active = true;
  const loginCallback = (...args) => (active ? onLogin?.(...args) : undefined);
  const logoutCallback = (...args) => (active ? onLogout?.(...args) : undefined);

  identity.on("login", loginCallback);
  identity.on("logout", logoutCallback);

  return () => {
    if (!active) return;
    active = false;

    if (typeof identity.off === "function") {
      identity.off("login", loginCallback);
      identity.off("logout", logoutCallback);
    }
  };
};

export const createAdminProfileLoader = ({ getAuthorProfileImpl, applyProfile } = {}) => {
  let requestId = 0;

  const invalidate = () => {
    requestId += 1;
  };

  const load = async (session) => {
    const currentRequestId = ++requestId;

    if (!session) {
      applyProfile?.(null);
      return null;
    }

    try {
      const response = await getAuthorProfileImpl({ session });

      if (currentRequestId !== requestId) return null;
      const profile = response?.profile || null;
      applyProfile?.(profile);
      return profile;
    } catch {
      if (currentRequestId !== requestId) return null;
      applyProfile?.(null);
      return null;
    }
  };

  return { invalidate, load };
};

export const completeAdminIdentityLogin = async ({
  identity = globalThis.netlifyIdentity,
  getSessionImpl = getAdminSession,
  setSession,
  loadProfile,
  isLoginRequested = () => false,
  clearLoginRequest,
  router,
  isActive = () => true,
  isSessionCurrent = () => true,
} = {}) => {
  if (typeof identity?.close === "function") {
    identity.close();
  }

  const session = await getSessionImpl();

  if (!isActive()) return { navigated: false, session: null };
  setSession?.(session);
  await loadProfile?.(session);

  if (!isActive() || !isSessionCurrent(session)) {
    return { navigated: false, session };
  }

  if (isLoginRequested() && session && typeof router?.push === "function") {
    clearLoginRequest?.();
    await router.push("/admin");
    return { navigated: true, session };
  }

  return { navigated: false, session };
};

export const adminSessionDisplay = (session) => {
  if (!session) {
    return {
      name: "Signed out",
      role: "No access",
      context: "Sign in required",
      preview: false,
      canSignOut: false,
    };
  }

  const role = session.roles?.includes("owner") ? "Owner" : "Writer";

  if (session.preview) {
    return {
      name: "Local preview",
      role,
      context: "Development only",
      preview: true,
      canSignOut: false,
    };
  }

  return {
    name: session.name || "Authenticated user",
    role,
    context: "Signed in",
    preview: false,
    canSignOut: true,
  };
};

export const adminAccountInitials = (session) => {
  const display = adminSessionDisplay(session);
  const parts = String(display.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (display.preview) {
    return display.role.slice(0, 1).toUpperCase();
  }

  if (parts.length === 0 || display.name === "Signed out") {
    return "AD";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export const signOutAdmin = async ({ identity = globalThis.netlifyIdentity, confirmImpl = globalThis.confirm } = {}) => {
  if (typeof confirmImpl === "function" && !confirmImpl("Sign out of the admin area?")) {
    return false;
  }

  if (typeof identity?.logout === "function") {
    await identity.logout();
  }

  return true;
};

export const isWriterSession = (session) => Boolean(session?.roles?.includes("writer") || session?.roles?.includes("owner"));

export const isOwnerSession = (session) => Boolean(session?.roles?.includes("owner"));
