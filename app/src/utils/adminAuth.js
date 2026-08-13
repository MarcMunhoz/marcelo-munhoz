const PREVIEW_ROLE_STORAGE_KEY = "admin.previewRole";
const PREVIEW_ROLES = new Set(["writer", "owner"]);

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
  return Array.isArray(roles) ? roles : [roles];
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
