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

const sessionFromUser = async (user) => {
  if (!user) {
    return null;
  }

  const token = typeof user.jwt === "function" ? await user.jwt() : null;

  return {
    subject: user.id || user.sub,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Authenticated user",
    roles: rolesFromUser(user).filter(Boolean),
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

export const openAdminLogin = () => {
  const identity = globalThis.netlifyIdentity;

  if (typeof identity?.open === "function") {
    identity.open("login");
  }
};

export const isWriterSession = (session) => Boolean(session?.roles?.includes("writer") || session?.roles?.includes("owner"));

export const isOwnerSession = (session) => Boolean(session?.roles?.includes("owner"));
