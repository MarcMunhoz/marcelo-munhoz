import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  adminAccountInitials,
  adminSessionDisplay,
  bindIdentityCallbacks,
  completeAdminIdentityLogin,
  createAdminProfileLoader,
  createPreviewSession,
  getAdminSession,
  isAdminSignOutNavigation,
  openAdminLogin,
  redirectSignedOutAdmin,
  selectedPreviewRole,
  signOutAdmin,
} from "../../src/utils/adminAuth.js";

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
};

const acceptedLifecycle = {
  acceptedSessionId: () => "browser-session-test",
  canUseSession: (sessionId) => sessionId === "browser-session-test",
};

describe("admin auth preview sessions", () => {
  it("uses owner as the default local preview role for full admin testing", () => {
    assert.equal(selectedPreviewRole({ storage: null }), "owner");
    assert.deepEqual(createPreviewSession({ role: "owner" }), {
      subject: "local-preview-owner",
      name: "Owner preview",
      roles: ["owner"],
      preview: true,
    });
  });

  it("allows switching the local preview role between writer and owner", () => {
    const storage = {
      getItem(key) {
        return key === "admin.previewRole" ? "writer" : null;
      },
    };

    assert.equal(selectedPreviewRole({ storage }), "writer");
    assert.deepEqual(createPreviewSession({ role: "writer" }), {
      subject: "local-preview-writer",
      name: "Writer preview",
      roles: ["writer"],
      preview: true,
    });
  });

  it("falls back to owner when local preview storage contains an unsupported role", () => {
    const storage = {
      getItem() {
        return "admin";
      },
    };

    assert.equal(selectedPreviewRole({ storage }), "owner");
  });

  it("formats authenticated owner and writer sessions with display identity and role", () => {
    assert.deepEqual(adminSessionDisplay({ name: "Marcelo Munhoz", roles: ["owner"] }), {
      name: "Marcelo Munhoz",
      role: "Owner",
      context: "Signed in",
      preview: false,
      canSignOut: true,
    });
    assert.deepEqual(adminSessionDisplay({ name: "Guest Writer", roles: ["writer"] }), {
      name: "Guest Writer",
      role: "Writer",
      context: "Signed in",
      preview: false,
      canSignOut: true,
    });
  });

  it("normalizes authenticated identity roles before display and authorization checks", async () => {
    const previousIdentity = globalThis.netlifyIdentity;

    globalThis.netlifyIdentity = {
      currentUser() {
        return {
          id: "user-123",
          email: "owner@example.test",
          app_metadata: {
            roles: ["Owner"],
          },
          async jwt() {
            return "token";
          },
        };
      },
    };

    try {
      const session = await getAdminSession({ lifecycle: acceptedLifecycle });

      assert.deepEqual(session.roles, ["owner"]);
      assert.equal(adminSessionDisplay(session).role, "Owner");
    } finally {
      globalThis.netlifyIdentity = previousIdentity;
    }
  });

  it("loads the Contentful author profile id from authenticated user metadata", async () => {
    const previousIdentity = globalThis.netlifyIdentity;

    globalThis.netlifyIdentity = {
      currentUser() {
        return {
          id: "user-123",
          email: "writer@example.test",
          app_metadata: {
            roles: ["writer"],
            authorEntryId: "author-1",
          },
          async jwt() {
            return "token";
          },
        };
      },
    };

    try {
      assert.deepEqual(await getAdminSession({ lifecycle: acceptedLifecycle }), {
        subject: "user-123",
        name: "writer@example.test",
        roles: ["writer"],
        authorEntryId: "author-1",
        token: "token",
        preview: false,
        lifecycleId: "browser-session-test",
      });
    } finally {
      globalThis.netlifyIdentity = previousIdentity;
    }
  });

  it("formats local preview as development context instead of a real identity", () => {
    assert.deepEqual(adminSessionDisplay(createPreviewSession({ role: "owner" })), {
      name: "Local preview",
      role: "Owner",
      context: "Development only",
      preview: true,
      canSignOut: false,
    });
  });

  it("formats account menu initials without requiring a profile photo", () => {
    assert.equal(adminAccountInitials({ name: "Marcelo Munhoz", roles: ["owner"] }), "MM");
    assert.equal(adminAccountInitials({ name: "Guest", roles: ["writer"] }), "G");
    assert.equal(adminAccountInitials(createPreviewSession({ role: "writer" })), "W");
    assert.equal(adminAccountInitials(null), "AD");
  });

  it("does not navigate to the Netlify Identity route when the widget is unavailable", () => {
    const previousIdentity = globalThis.netlifyIdentity;
    const location = { href: "" };

    globalThis.netlifyIdentity = undefined;

    try {
      assert.equal(openAdminLogin({ location }), false);
      assert.equal(location.href, "");
    } finally {
      globalThis.netlifyIdentity = previousIdentity;
    }
  });

  it("binds Identity login and logout effects and removes the same callbacks during cleanup", async () => {
    const callbacks = new Map();
    const removedCallbacks = [];
    const effects = [];
    const identity = {
      on(event, callback) {
        callbacks.set(event, callback);
      },
      off(event, callback) {
        removedCallbacks.push([event, callback]);
      },
    };
    const stop = bindIdentityCallbacks({
      identity,
      onLogin: async () => effects.push("login"),
      onLogout: () => effects.push("logout"),
    });

    await callbacks.get("login")();
    callbacks.get("logout")();
    stop();

    assert.deepEqual(effects, ["login", "logout"]);
    assert.deepEqual(removedCallbacks, [
      ["login", callbacks.get("login")],
      ["logout", callbacks.get("logout")],
    ]);
  });

  it("returns inert Identity cleanup when the widget callback API is unavailable", () => {
    const stop = bindIdentityCallbacks({ identity: undefined });

    assert.equal(typeof stop, "function");
    assert.doesNotThrow(stop);
  });

  it("makes registered Identity callbacks inert after cleanup when the widget has no off API", async () => {
    const callbacks = new Map();
    const effects = [];
    const identity = {
      on(event, callback) {
        callbacks.set(event, callback);
      },
    };
    const stop = bindIdentityCallbacks({
      identity,
      onLogin: async () => effects.push("login"),
      onLogout: () => effects.push("logout"),
    });

    stop();
    await callbacks.get("login")();
    callbacks.get("logout")();

    assert.deepEqual(effects, []);
  });

  it("ignores a pending profile response invalidated by logout", async () => {
    const pending = deferred();
    const appliedProfiles = [];
    const loader = createAdminProfileLoader({
      getAuthorProfileImpl: async () => pending.promise,
      applyProfile: (profile) => appliedProfiles.push(profile),
    });
    const loading = loader.load({ subject: "old-session" });

    loader.invalidate();
    pending.resolve({ profile: { name: "Stale author" } });
    await loading;

    assert.deepEqual(appliedProfiles, []);
  });

  it("allows only the newest session profile response to update layout state", async () => {
    const oldPending = deferred();
    const newPending = deferred();
    const appliedProfiles = [];
    const loader = createAdminProfileLoader({
      getAuthorProfileImpl: ({ session }) =>
        session.subject === "old-session" ? oldPending.promise : newPending.promise,
      applyProfile: (profile) => appliedProfiles.push(profile),
    });
    const oldLoading = loader.load({ subject: "old-session" });
    const newLoading = loader.load({ subject: "new-session" });

    newPending.resolve({ profile: { name: "Current author" } });
    await newLoading;
    oldPending.resolve({ profile: { name: "Stale author" } });
    await oldLoading;

    assert.deepEqual(appliedProfiles, [{ name: "Current author" }]);
  });

  it("ignores pending profile success and failure after unmount invalidation", async () => {
    for (const settle of ["resolve", "reject"]) {
      const pending = deferred();
      const appliedProfiles = [];
      const loader = createAdminProfileLoader({
        getAuthorProfileImpl: async () => pending.promise,
        applyProfile: (profile) => appliedProfiles.push(profile),
      });
      const loading = loader.load({ subject: `session-${settle}` });

      loader.invalidate();
      pending[settle](settle === "resolve" ? { profile: { name: "Unmounted author" } } : new Error("late failure"));
      await loading;

      assert.deepEqual(appliedProfiles, []);
    }
  });

  it("completes Identity login effects in modal, session, profile, and navigation order", async () => {
    const events = [];
    const session = { subject: "owner-session", roles: ["owner"] };

    assert.deepEqual(
      await completeAdminIdentityLogin({
        identity: { close: () => events.push("close") },
        getSessionImpl: async () => {
          events.push("get-session");
          return session;
        },
        setSession: (nextSession) => events.push(`set-session:${nextSession.subject}`),
        loadProfile: async (nextSession) => events.push(`load-profile:${nextSession.subject}`),
        isLoginRequested: () => true,
        clearLoginRequest: () => events.push("clear-login-request"),
        router: { push: async (path) => events.push(`push:${path}`) },
      }),
      { navigated: true, session }
    );
    assert.deepEqual(events, [
      "close",
      "get-session",
      "set-session:owner-session",
      "load-profile:owner-session",
      "clear-login-request",
      "push:/admin",
    ]);
  });

  it("stops an in-flight Identity login before applying session effects when the layout becomes inactive", async () => {
    const events = [];
    let active = true;

    assert.deepEqual(
      await completeAdminIdentityLogin({
        identity: { close: () => events.push("close") },
        getSessionImpl: async () => {
          events.push("get-session");
          active = false;
          return { subject: "late-session" };
        },
        setSession: () => events.push("set-session"),
        loadProfile: async () => events.push("load-profile"),
        isLoginRequested: () => true,
        clearLoginRequest: () => events.push("clear-login-request"),
        router: { push: async () => events.push("push") },
        isActive: () => active,
      }),
      { navigated: false, session: null }
    );
    assert.deepEqual(events, ["close", "get-session"]);
  });

  it("does not navigate after the login session becomes stale while its profile is loading", async () => {
    const events = [];
    let currentSession = null;
    const session = { subject: "stale-session" };

    assert.deepEqual(
      await completeAdminIdentityLogin({
        identity: { close: () => events.push("close") },
        getSessionImpl: async () => session,
        setSession: (nextSession) => {
          currentSession = nextSession;
          events.push("set-session");
        },
        loadProfile: async () => {
          events.push("load-profile");
          currentSession = null;
        },
        isLoginRequested: () => true,
        clearLoginRequest: () => events.push("clear-login-request"),
        router: { push: async () => events.push("push") },
        isSessionCurrent: (candidate) => currentSession === candidate,
      }),
      { navigated: false, session }
    );
    assert.deepEqual(events, ["close", "set-session", "load-profile"]);
  });

  it("signs out only after confirmation", async () => {
    const calls = [];
    const identity = {
      logout() {
        calls.push("logout");
      },
    };

    assert.equal(await signOutAdmin({ identity, confirmImpl: () => false }), false);
    assert.deepEqual(calls, []);

    assert.equal(await signOutAdmin({ identity, confirmImpl: () => true }), true);
    assert.deepEqual(calls, ["logout"]);
  });

  it("clears local UI state before provider logout work settles", async () => {
    const events = [];
    const lifecycle = {
      logout() {
        events.push("lifecycle-local-clear");
        return Promise.resolve().then(() => events.push("provider-logout"));
      },
    };

    assert.equal(
      await signOutAdmin({
        identity: {},
        lifecycle,
        confirmImpl: () => true,
        onLocalSignOut: () => events.push("ui-clear"),
      }),
      true
    );
    assert.deepEqual(events, ["lifecycle-local-clear", "ui-clear", "provider-logout"]);
  });

  it("returns a signed-out admin route home without adding browser history", async () => {
    const routes = [];

    assert.equal(isAdminSignOutNavigation(), false);
    assert.equal(
      await redirectSignedOutAdmin({
        currentPath: "/admin",
        router: {
          replace: async (path) => {
            assert.equal(isAdminSignOutNavigation(), true);
            routes.push(path);
          },
        },
      }),
      true
    );
    assert.equal(isAdminSignOutNavigation(), false);
    assert.deepEqual(routes, ["/"]);
    assert.equal(await redirectSignedOutAdmin({ currentPath: "/", router: { replace: async (path) => routes.push(path) } }), false);
    assert.deepEqual(routes, ["/"]);
  });
});
