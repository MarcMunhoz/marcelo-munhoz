import assert from "node:assert/strict";
import { describe, it } from "node:test";

import * as adminAuth from "../src/utils/adminAuth.js";
import * as sessionLifecycle from "../src/utils/adminSessionLifecycle.js";
import { AdminApiError, adminRequest } from "../src/utils/adminApi.js";
import {
  createChannelHub,
  createCookieDocument,
  createEventTarget,
  createFakeClock,
  createMemoryStorage,
} from "./helpers/adminSessionLifecycleHarness.js";

const providerUser = ({ jwtCalls }) => ({
  id: "owner-1",
  email: "owner@example.test",
  app_metadata: { roles: ["owner"] },
  async jwt() {
    jwtCalls.push("jwt");
    return "provider-token";
  },
});

describe("administrative cross-tab lifecycle", () => {
  const copySessionState = (source, target) => {
    target.setItem("admin.sessionLifecycle", source.snapshot()["admin.sessionLifecycle"]);
  };

  it("propagates activity, warning continuation, and logout without sensitive message data", async () => {
    const clock = createFakeClock(1_000);
    const documentRef = createCookieDocument();
    const firstStorage = createMemoryStorage();
    const secondStorage = createMemoryStorage();
    const channels = createChannelHub();
    const common = {
      documentRef,
      now: clock.now,
      setTimeoutImpl: clock.setTimeout,
      clearTimeoutImpl: clock.clearTimeout,
      channelFactory: () => channels.create(),
    };
    const first = adminAuth.createAdminSessionLifecycle({
      ...common,
      storage: firstStorage,
      randomId: () => "browser-session-1",
    });
    const second = adminAuth.createAdminSessionLifecycle({ ...common, storage: secondStorage });
    const firstWarnings = [];
    const secondWarnings = [];
    const firstExpirations = [];
    const firstProviderLogouts = [];
    const secondProviderLogouts = [];

    first.establishSession();
    copySessionState(firstStorage, secondStorage);
    first.start({
      identity: { logout: async () => firstProviderLogouts.push("logout") },
      onWarning: () => firstWarnings.push("warning"),
      onExpire: (reason) => {
        firstExpirations.push(reason);
        first.stop();
      },
    });
    second.start({
      identity: { logout: async () => secondProviderLogouts.push("logout") },
      onWarning: () => secondWarnings.push("warning"),
    });

    await clock.advance(10 * 60 * 1_000);
    assert.equal(first.recordActivity({ adminSurface: true }), true);
    assert.equal(JSON.parse(secondStorage.snapshot()["admin.sessionLifecycle"]).lastActivityAt, clock.now());

    await clock.advance(14 * 60 * 1_000);
    assert.deepEqual(firstWarnings, ["warning"]);
    assert.deepEqual(secondWarnings, ["warning"]);
    assert.equal(first.continueSession(), true);
    assert.equal(second.snapshot().warning, false);

    await second.logout({ logout: async () => secondProviderLogouts.push("logout") });
    await Promise.resolve();
    assert.equal(first.acceptedSessionId(), null);
    assert.equal(second.acceptedSessionId(), null);
    assert.deepEqual(firstExpirations, ["remote-logout"]);
    assert.deepEqual(firstProviderLogouts, ["logout"]);
    assert.deepEqual(secondProviderLogouts, ["logout"]);

    const serializedMessages = JSON.stringify(channels.messages);
    assert.doesNotMatch(serializedMessages, /provider-token|owner@example|roles|authorization/i);
  });

  it("uses strict storage-event fallback validation when BroadcastChannel is unavailable", async () => {
    const clock = createFakeClock(1_000);
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const storageEvents = createEventTarget();
    const expirations = [];
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      storageEventTarget: storageEvents,
      channelFactory: () => null,
      randomId: () => "browser-session-1",
      now: clock.now,
      setTimeoutImpl: clock.setTimeout,
      clearTimeoutImpl: clock.clearTimeout,
    });
    lifecycle.establishSession();
    lifecycle.start({ onExpire: (reason) => expirations.push(reason) });
    const originalState = storage.snapshot()["admin.sessionLifecycle"];

    storageEvents.dispatch("storage", {
      key: "admin.sessionLifecycleEvent",
      newValue: JSON.stringify({
        version: 1,
        type: "activity",
        sessionId: "browser-session-1",
        at: clock.now(),
        lastActivityAt: clock.now(),
        token: "must-not-be-accepted",
      }),
    });
    assert.equal(storage.snapshot()["admin.sessionLifecycle"], originalState);

    clock.jump(60_000);
    storageEvents.dispatch("storage", {
      key: "admin.sessionLifecycleEvent",
      newValue: JSON.stringify({
        version: 1,
        type: "activity",
        sessionId: "browser-session-1",
        at: clock.now(),
        lastActivityAt: clock.now(),
      }),
    });
    assert.equal(JSON.parse(storage.snapshot()["admin.sessionLifecycle"]).lastActivityAt, clock.now());

    const renewedState = storage.snapshot()["admin.sessionLifecycle"];
    storageEvents.dispatch("storage", {
      key: "admin.sessionLifecycleEvent",
      newValue: JSON.stringify({
        version: 1,
        type: "warning",
        sessionId: "browser-session-1",
        at: clock.now(),
        lastActivityAt: 1_000,
      }),
    });
    assert.equal(storage.snapshot()["admin.sessionLifecycle"], renewedState);

    storageEvents.dispatch("storage", {
      key: "admin.sessionLifecycleEvent",
      newValue: JSON.stringify({
        version: 1,
        type: "logout",
        sessionId: "browser-session-1",
        at: clock.now(),
      }),
    });
    await Promise.resolve();
    assert.deepEqual(expirations, ["remote-logout"]);
    assert.equal(lifecycle.acceptedSessionId(), null);
  });

  it("does not let a runtime BroadcastChannel keep the process alive", () => {
    const transport = {
      addEventListener() {},
      close() {},
      postMessage() {},
      unrefCalls: 0,
      unref() {
        this.unrefCalls += 1;
      },
    };
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef: createCookieDocument(),
      storage: createMemoryStorage(),
      channelFactory: () => transport,
    });
    lifecycle.establishSession();
    lifecycle.start();

    assert.equal(transport.unrefCalls, 1);
    lifecycle.stop();
  });
});

describe("administrative request lifecycle gate", () => {
  it("rejects an expired production session before a protected fetch starts", async () => {
    const clock = createFakeClock(1_000);
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
      now: clock.now,
      setTimeoutImpl: clock.setTimeout,
      clearTimeoutImpl: clock.clearTimeout,
    });
    lifecycle.establishSession();
    const session = { token: "provider-token", lifecycleId: "browser-session-1", preview: false };
    const fetchCalls = [];
    clock.jump(15 * 60 * 1_000);

    await assert.rejects(
      adminRequest({
        path: "/articles",
        session,
        lifecycle,
        fetchImpl: async (...args) => {
          fetchCalls.push(args);
          return { ok: true, status: 200, json: async () => ({}) };
        },
      }),
      (error) => error instanceof AdminApiError && error.status === 401 && /expired/i.test(error.message)
    );
    assert.deepEqual(fetchCalls, []);
  });
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

describe("administrative session warning countdown", () => {
  it("derives exact display values from lifecycle snapshots and stops after continuation", () => {
    assert.equal(typeof sessionLifecycle.createAdminSessionCountdown, "function");

    let currentSnapshot = { warning: true, remainingMs: 60_000 };
    let intervalCallback = null;
    const clearedIntervals = [];
    const ticks = [];
    const dismissals = [];
    const countdown = sessionLifecycle.createAdminSessionCountdown({
      lifecycle: { snapshot: () => currentSnapshot },
      onTick: (value) => ticks.push(value),
      onDismiss: () => dismissals.push("dismiss"),
      setIntervalImpl(callback, delay) {
        assert.equal(delay, 1_000);
        intervalCallback = callback;
        return 42;
      },
      clearIntervalImpl: (intervalId) => clearedIntervals.push(intervalId),
    });

    countdown.start(currentSnapshot);
    assert.deepEqual(ticks, [{ remainingSeconds: 60, label: "01:00" }]);

    currentSnapshot = { warning: true, remainingMs: 58_001 };
    intervalCallback();
    assert.deepEqual(ticks.at(-1), { remainingSeconds: 59, label: "00:59" });

    currentSnapshot = { warning: false, remainingMs: 15 * 60 * 1_000 };
    intervalCallback();
    assert.deepEqual(dismissals, ["dismiss"]);
    assert.deepEqual(clearedIntervals, [42]);
  });
});

describe("administrative browser-session acceptance", () => {
  it("rejects and logs out a provider-restored user when the browser-session marker is absent", async () => {
    assert.equal(typeof adminAuth.createAdminSessionLifecycle, "function");

    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const jwtCalls = [];
    const logoutCalls = [];
    const user = providerUser({ jwtCalls });
    const identity = {
      currentUser: () => user,
      logout: async () => logoutCalls.push("logout"),
    };
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
    });

    assert.equal(await adminAuth.getAdminSession({ identity, lifecycle }), null);
    assert.deepEqual(jwtCalls, []);
    assert.deepEqual(logoutCalls, ["logout"]);
    assert.deepEqual(storage.snapshot(), {});
  });

  it("fails closed when the browser-session cookie is malformed", async () => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const jwtCalls = [];
    const logoutCalls = [];
    const lifecycle = adminAuth.createAdminSessionLifecycle({ documentRef, storage });
    documentRef.cookie = "admin_browser_session=%E0%A4%A";

    const outcome = await adminAuth.getAdminSession({
      identity: {
        currentUser: () => providerUser({ jwtCalls }),
        logout: async () => logoutCalls.push("logout"),
      },
      lifecycle,
    }).then(
      (value) => ({ value }),
      (error) => ({ error })
    );

    assert.equal(outcome.error, undefined);
    assert.equal(outcome.value, null);
    assert.deepEqual(jwtCalls, []);
    assert.deepEqual(logoutCalls, ["logout"]);
  });

  it("fails closed when browser cookie and storage access are unavailable", async () => {
    const jwtCalls = [];
    const logoutCalls = [];
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef: {
        get cookie() {
          throw new Error("cookies unavailable");
        },
        set cookie(_value) {
          throw new Error("cookies unavailable");
        },
      },
      storage: {
        getItem() {
          throw new Error("storage unavailable");
        },
        removeItem() {
          throw new Error("storage unavailable");
        },
        setItem() {
          throw new Error("storage unavailable");
        },
      },
    });

    const outcome = await adminAuth.getAdminSession({
      identity: {
        currentUser: () => providerUser({ jwtCalls }),
        logout: async () => logoutCalls.push("logout"),
      },
      lifecycle,
    }).then(
      (value) => ({ value }),
      (error) => ({ error })
    );

    assert.equal(outcome.error, undefined);
    assert.equal(outcome.value, null);
    assert.deepEqual(jwtCalls, []);
    assert.deepEqual(logoutCalls, ["logout"]);
  });

  it("clears a provisional marker when login session resolution fails", async () => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
      now: () => 1_000,
    });

    await assert.rejects(
      adminAuth.completeAdminIdentityLogin({
        identity: { close() {} },
        lifecycle,
        getSessionImpl: async () => Promise.reject(new Error("JWT unavailable")),
        isLoginRequested: () => true,
      }),
      /JWT unavailable/
    );

    assert.equal(documentRef.cookie, "");
    assert.deepEqual(storage.snapshot(), {});
  });

  it("rejects a session invalidated while its provider JWT is resolving", async () => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const pendingJwt = deferred();
    const logoutCalls = [];
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
      now: () => 1_000,
    });
    lifecycle.establishSession();

    const sessionResolution = adminAuth.getAdminSession({
      identity: {
        currentUser: () => ({
          id: "owner-1",
          app_metadata: { roles: ["owner"] },
          jwt: () => pendingJwt.promise,
        }),
        logout: async () => logoutCalls.push("logout"),
      },
      lifecycle,
    });
    await Promise.resolve();
    lifecycle.clearLocalSession();
    pendingJwt.resolve("provider-token");

    assert.equal(await sessionResolution, null);
    assert.deepEqual(logoutCalls, ["logout"]);
  });

  it("re-resolves identity when the accepted marker changes during JWT resolution", async () => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const pendingFirstJwt = deferred();
    const sessionIds = ["browser-session-1", "browser-session-2"];
    let currentUser = {
      id: "owner-1",
      app_metadata: { roles: ["owner"] },
      jwt: () => pendingFirstJwt.promise,
    };
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => sessionIds.shift(),
      now: () => 1_000,
    });
    const identity = { currentUser: () => currentUser };
    lifecycle.establishSession();

    const sessionResolution = adminAuth.getAdminSession({ identity, lifecycle });
    await Promise.resolve();
    currentUser = {
      id: "owner-2",
      app_metadata: { roles: ["owner"] },
      jwt: async () => "provider-token-2",
    };
    lifecycle.establishSession();
    pendingFirstJwt.resolve("provider-token-1");

    const session = await sessionResolution;
    assert.equal(session.subject, "owner-2");
    assert.equal(session.token, "provider-token-2");
    assert.equal(session.lifecycleId, "browser-session-2");
  });

  it("preserves a successful login across same-browser reloads and clears it on explicit logout", async () => {
    assert.equal(typeof adminAuth.createAdminSessionLifecycle, "function");

    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const jwtCalls = [];
    const logoutCalls = [];
    const user = providerUser({ jwtCalls });
    const identity = {
      close() {},
      currentUser: () => user,
      logout: async () => logoutCalls.push("logout"),
    };
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
      now: () => 1_000,
    });
    const getSession = () => adminAuth.getAdminSession({ identity, lifecycle });

    const completed = await adminAuth.completeAdminIdentityLogin({
      identity,
      lifecycle,
      getSessionImpl: getSession,
      isLoginRequested: () => true,
    });

    assert.equal(completed.session.subject, "owner-1");
    assert.match(documentRef.cookie, /admin_browser_session=browser-session-1/);
    assert.match(documentRef.writes[0], /Path=\/; SameSite=Strict; Secure/);
    assert.equal((await getSession()).subject, "owner-1");

    assert.equal(await adminAuth.signOutAdmin({ identity, lifecycle, confirmImpl: () => true }), true);
    assert.equal(documentRef.cookie, "");
    assert.deepEqual(storage.snapshot(), {});
    assert.deepEqual(logoutCalls, ["logout"]);
  });

  it("clears local access before provider logout settles and coalesces concurrent logout attempts", async () => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const pendingLogout = deferred();
    const logoutCalls = [];
    const identity = {
      logout() {
        logoutCalls.push("logout");
        return pendingLogout.promise;
      },
    };
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
      now: () => 1_000,
    });
    lifecycle.establishSession();

    const firstLogout = adminAuth.signOutAdmin({ identity, lifecycle, confirmImpl: () => true });
    const secondLogout = adminAuth.signOutAdmin({ identity, lifecycle, confirmImpl: () => true });

    assert.equal(documentRef.cookie, "");
    assert.deepEqual(storage.snapshot(), {});
    await Promise.resolve();
    assert.deepEqual(logoutCalls, ["logout"]);

    pendingLogout.resolve();
    assert.equal(await firstLogout, true);
    assert.equal(await secondLogout, true);
  });

  it("remains locally signed out when provider logout fails offline", async () => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
      now: () => 1_000,
    });
    lifecycle.establishSession();

    assert.equal(
      await adminAuth.signOutAdmin({
        identity: { logout: async () => Promise.reject(new Error("offline")) },
        lifecycle,
        confirmImpl: () => true,
      }),
      true
    );
    assert.equal(documentRef.cookie, "");
    assert.deepEqual(storage.snapshot(), {});
  });

  it("keeps development preview outside production marker controls", async () => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const lifecycle = adminAuth.createAdminSessionLifecycle({ documentRef, storage });

    assert.deepEqual(
      await adminAuth.getAdminSession({
        identity: { currentUser: () => null },
        lifecycle,
        allowPreview: true,
      }),
      {
        subject: "local-preview-owner",
        name: "Owner preview",
        roles: ["owner"],
        preview: true,
      }
    );
    assert.equal(documentRef.cookie, "");
    assert.deepEqual(storage.snapshot(), {});
  });

  it("clears a provisional production marker when login resolves to development preview", async () => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
      now: () => 1_000,
    });

    const result = await adminAuth.completeAdminIdentityLogin({
      identity: { close() {} },
      lifecycle,
      getSessionImpl: async () => ({
        subject: "local-preview-owner",
        roles: ["owner"],
        preview: true,
      }),
      isLoginRequested: () => true,
    });

    assert.equal(result.session.preview, true);
    assert.equal(documentRef.cookie, "");
    assert.deepEqual(storage.snapshot(), {});
  });
});

describe("administrative inactivity lifecycle", () => {
  const createTimedLifecycle = ({ initialNow = 1_000 } = {}) => {
    const documentRef = createCookieDocument();
    const storage = createMemoryStorage();
    const clock = createFakeClock(initialNow);
    const lifecycle = adminAuth.createAdminSessionLifecycle({
      documentRef,
      storage,
      randomId: () => "browser-session-1",
      now: clock.now,
      setTimeoutImpl: clock.setTimeout,
      clearTimeoutImpl: clock.clearTimeout,
    });
    return { clock, documentRef, lifecycle, storage };
  };

  it("warns after 14 inactive minutes and signs out after 15 without silent warning renewal", async () => {
    const { clock, documentRef, lifecycle } = createTimedLifecycle();
    const warnings = [];
    const expirations = [];
    const logoutCalls = [];
    lifecycle.establishSession();

    assert.equal(typeof lifecycle.start, "function");
    lifecycle.start({
      identity: { logout: async () => logoutCalls.push("logout") },
      onWarning: (snapshot) => warnings.push(snapshot),
      onExpire: (reason) => {
        expirations.push(reason);
        lifecycle.stop();
      },
    });

    await clock.advance(14 * 60 * 1_000);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].remainingMs, 60_000);
    assert.equal(lifecycle.recordActivity({ adminSurface: true }), false);

    await clock.advance(60_000);
    assert.deepEqual(expirations, ["inactivity"]);
    assert.deepEqual(logoutCalls, ["logout"]);
    assert.equal(documentRef.cookie, "");
  });

  it("renews before warning only for admin activity and requires explicit continuation once warned", async () => {
    const { clock, lifecycle } = createTimedLifecycle();
    const warnings = [];
    lifecycle.establishSession();
    assert.equal(typeof lifecycle.start, "function");
    lifecycle.start({ onWarning: (snapshot) => warnings.push(snapshot) });

    await clock.advance(10 * 60 * 1_000);
    assert.equal(lifecycle.recordActivity({ adminSurface: false }), false);
    assert.equal(lifecycle.recordActivity({ adminSurface: true }), true);

    await clock.advance(13 * 60 * 1_000);
    assert.equal(warnings.length, 0);
    await clock.advance(60_000);
    assert.equal(warnings.length, 1);

    assert.equal(lifecycle.recordActivity({ adminSurface: true }), false);
    assert.equal(lifecycle.continueSession(), true);
    assert.equal(lifecycle.snapshot().warning, false);

    await clock.advance(14 * 60 * 1_000);
    assert.equal(warnings.length, 2);
  });

  it("coalesces throttled activity without discarding its inactivity timestamp", async () => {
    const { clock, lifecycle, storage } = createTimedLifecycle();
    lifecycle.establishSession();
    assert.equal(typeof lifecycle.start, "function");
    lifecycle.start();
    const initialState = storage.snapshot()["admin.sessionLifecycle"];

    await clock.advance(10_000);
    assert.equal(lifecycle.recordActivity({ adminSurface: true }), true);
    assert.equal(storage.snapshot()["admin.sessionLifecycle"], initialState);

    await clock.advance(19_999);
    assert.equal(storage.snapshot()["admin.sessionLifecycle"], initialState);
    await clock.advance(1);
    assert.equal(JSON.parse(storage.snapshot()["admin.sessionLifecycle"]).lastActivityAt, 11_000);
  });

  it("recalculates elapsed time on focus and visibility after delayed timers", async () => {
    const first = createTimedLifecycle();
    const firstWindow = createEventTarget();
    const firstVisibility = createEventTarget();
    const firstExpirations = [];
    first.lifecycle.establishSession();
    assert.equal(typeof first.lifecycle.start, "function");
    first.lifecycle.start({ onExpire: (reason) => firstExpirations.push(reason) });
    const stopFirst = first.lifecycle.observeActivity({
      eventTarget: firstWindow,
      visibilityTarget: firstVisibility,
      isAdminSurface: () => true,
    });

    first.clock.jump(15 * 60 * 1_000);
    firstWindow.dispatch("focus");
    await Promise.resolve();
    assert.deepEqual(firstExpirations, ["inactivity"]);
    stopFirst();

    const second = createTimedLifecycle();
    const secondVisibility = createEventTarget({ visibilityState: "hidden" });
    const secondWarnings = [];
    second.lifecycle.establishSession();
    second.lifecycle.start({ onWarning: (snapshot) => secondWarnings.push(snapshot) });
    const stopSecond = second.lifecycle.observeActivity({
      eventTarget: createEventTarget(),
      visibilityTarget: secondVisibility,
      isAdminSurface: () => true,
    });

    second.clock.jump(14 * 60 * 1_000);
    secondVisibility.visibilityState = "visible";
    secondVisibility.dispatch("visibilitychange");
    assert.equal(secondWarnings.length, 1);
    stopSecond();
  });

  it("expires the loaded administrative UI when accepted lifecycle state disappears", async () => {
    const { documentRef, lifecycle } = createTimedLifecycle();
    const expirations = [];
    const logoutCalls = [];
    lifecycle.establishSession();
    lifecycle.start({
      identity: { logout: async () => logoutCalls.push("logout") },
      onExpire: (reason) => expirations.push(reason),
    });

    documentRef.cookie = "admin_browser_session=; Max-Age=0; Path=/; SameSite=Strict; Secure";
    await lifecycle.evaluate();

    assert.deepEqual(expirations, ["session-invalidated"]);
    assert.deepEqual(logoutCalls, ["logout"]);
    assert.equal(lifecycle.acceptedSessionId(), null);
  });

  it("expires fail closed when the persisted activity timestamp moves into the future", async () => {
    const { clock, lifecycle, storage } = createTimedLifecycle();
    const expirations = [];
    lifecycle.establishSession();
    storage.setItem(
      "admin.sessionLifecycle",
      JSON.stringify({
        version: 1,
        sessionId: "browser-session-1",
        lastActivityAt: clock.now() + 60_000,
        event: "activity",
      })
    );
    assert.equal(typeof lifecycle.start, "function");
    lifecycle.start({ onExpire: (reason) => expirations.push(reason) });

    await lifecycle.evaluate();
    assert.deepEqual(expirations, ["invalid-clock"]);
    assert.equal(lifecycle.acceptedSessionId(), null);
  });
});
