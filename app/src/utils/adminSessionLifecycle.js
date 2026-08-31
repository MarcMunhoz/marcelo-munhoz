const ADMIN_SESSION_COOKIE = "admin_browser_session";
const ADMIN_SESSION_STATE_KEY = "admin.sessionLifecycle";
const ADMIN_SESSION_EVENT_KEY = "admin.sessionLifecycleEvent";
const ADMIN_SESSION_CHANNEL = "admin-session-lifecycle";
const ADMIN_INACTIVITY_MS = 15 * 60 * 1_000;
const ADMIN_WARNING_MS = 60 * 1_000;
const ADMIN_WARNING_AT_MS = ADMIN_INACTIVITY_MS - ADMIN_WARNING_MS;
const ADMIN_ACTIVITY_THROTTLE_MS = 30 * 1_000;
const ALLOWED_EVENT_TYPES = new Set(["activity", "continue", "warning", "logout", "expire"]);

const defaultChannelFactory = () =>
  typeof globalThis.BroadcastChannel === "function" ? new globalThis.BroadcastChannel(ADMIN_SESSION_CHANNEL) : null;

const defaultRandomId = () => {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }

    if (typeof globalThis.crypto?.getRandomValues !== "function") return "";
    const values = new Uint32Array(4);
    globalThis.crypto.getRandomValues(values);
    return [...values].map((value) => value.toString(16).padStart(8, "0")).join("");
  } catch {
    return "";
  }
};

const readCookie = (documentRef, name) => {
  try {
    const prefix = `${name}=`;
    const match = String(documentRef?.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));

    return match ? decodeURIComponent(match.slice(prefix.length)) : "";
  } catch {
    return "";
  }
};

const readState = (storage) => {
  try {
    const parsed = JSON.parse(storage?.getItem?.(ADMIN_SESSION_STATE_KEY) || "null");
    if (parsed?.version !== 1 || typeof parsed.sessionId !== "string" || !parsed.sessionId || parsed.sessionId.length > 128) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeState = (storage, state) => {
  try {
    storage?.setItem?.(ADMIN_SESSION_STATE_KEY, JSON.stringify(state));
    return Boolean(storage?.setItem);
  } catch {
    return false;
  }
};

const countdownValue = (remainingMs) => {
  const remainingSeconds = Number.isFinite(remainingMs) ? Math.max(0, Math.ceil(remainingMs / 1_000)) : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return {
    remainingSeconds,
    label: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  };
};

export const createAdminSessionCountdown = ({
  lifecycle,
  onTick,
  onDismiss,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
} = {}) => {
  let intervalId = null;

  const stop = () => {
    if (intervalId !== null) clearIntervalImpl?.(intervalId);
    intervalId = null;
  };

  const sync = (providedSnapshot) => {
    const snapshot = providedSnapshot || lifecycle?.snapshot?.() || {};
    if (!snapshot.warning) {
      stop();
      onDismiss?.();
      return false;
    }

    onTick?.(countdownValue(snapshot.remainingMs));
    return true;
  };

  const start = (initialSnapshot) => {
    stop();
    if (!sync(initialSnapshot)) return stop;
    intervalId = setIntervalImpl?.(() => sync(), 1_000) ?? null;
    return stop;
  };

  return { start, stop, sync };
};

export const createAdminSessionLifecycle = ({
  documentRef = globalThis.document,
  storage = globalThis.localStorage,
  randomId = defaultRandomId,
  now = Date.now,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  channelFactory = defaultChannelFactory,
  storageEventTarget = globalThis.window,
} = {}) => {
  let logoutPromise = null;
  let timerId = null;
  let activityTimerId = null;
  let pendingActivityAt = null;
  let warning = false;
  let expired = false;
  let active = false;
  let activeIdentity = null;
  let onWarning = null;
  let onExpire = null;
  let currentSessionId = null;
  let channel = null;
  let storageListener = null;

  const clearTimer = () => {
    if (timerId !== null) clearTimeoutImpl?.(timerId);
    timerId = null;
  };

  const clearPendingActivity = () => {
    if (activityTimerId !== null) clearTimeoutImpl?.(activityTimerId);
    activityTimerId = null;
    pendingActivityAt = null;
  };

  const clearLocalSession = () => {
    clearTimer();
    clearPendingActivity();
    warning = false;
    try {
      if (documentRef) {
        documentRef.cookie = `${ADMIN_SESSION_COOKIE}=; Max-Age=0; Path=/; SameSite=Strict; Secure`;
      }
    } catch {
      // Access remains denied because acceptance also fails closed when cookies are unavailable.
    }
    for (const key of [ADMIN_SESSION_STATE_KEY, ADMIN_SESSION_EVENT_KEY]) {
      try {
        storage?.removeItem?.(key);
      } catch {
        // Access remains denied because acceptance also fails closed when storage is unavailable.
      }
    }
    currentSessionId = null;
  };

  const establishSession = () => {
    if (!documentRef || !storage) return "";

    const sessionId = String(randomId?.() || "");
    const establishedAt = now();
    if (!sessionId || sessionId.length > 128 || !Number.isFinite(establishedAt)) return "";

    try {
      documentRef.cookie = `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; SameSite=Strict; Secure`;
    } catch {
      clearLocalSession();
      return "";
    }
    expired = false;
    warning = false;
    const persisted = writeState(storage, {
      version: 1,
      sessionId,
      lastActivityAt: establishedAt,
      event: "login",
    });
    if (!persisted) {
      clearLocalSession();
      return "";
    }
    currentSessionId = sessionId;
    return sessionId;
  };

  const acceptedSessionId = () => {
    if (!documentRef) return null;

    const cookieSessionId = readCookie(documentRef, ADMIN_SESSION_COOKIE);
    const state = readState(storage);
    const elapsed = now() - state?.lastActivityAt;
    const accepted = cookieSessionId &&
      state?.sessionId === cookieSessionId &&
      Number.isFinite(state.lastActivityAt) &&
      Number.isFinite(elapsed) &&
      elapsed >= 0 &&
      elapsed < ADMIN_INACTIVITY_MS
      ? cookieSessionId
      : null;
    if (accepted) currentSessionId = accepted;
    return accepted;
  };

  const isEnforced = () => Boolean(documentRef && storage);

  const canUseSession = (sessionId) => !isEnforced() || (typeof sessionId === "string" && acceptedSessionId() === sessionId);

  const providerLogout = async (identity) => {
    if (logoutPromise) return logoutPromise;
    if (typeof identity?.logout !== "function") return true;

    logoutPromise = Promise.resolve()
      .then(() => identity.logout())
      .catch(() => false)
      .finally(() => {
        logoutPromise = null;
      });
    return logoutPromise;
  };

  const publish = (type, { sessionId = currentSessionId, lastActivityAt } = {}) => {
    if (!sessionId || !ALLOWED_EVENT_TYPES.has(type)) return;

    const message = {
      version: 1,
      type,
      sessionId,
      at: now(),
      ...(["activity", "continue", "warning"].includes(type) ? { lastActivityAt } : {}),
    };
    try {
      channel?.postMessage?.(message);
    } catch {
      // The storage event fallback remains available when the channel is unavailable.
    }
    try {
      storage?.setItem?.(ADMIN_SESSION_EVENT_KEY, JSON.stringify(message));
      storage?.removeItem?.(ADMIN_SESSION_EVENT_KEY);
    } catch {
      // Local clearing and expiry do not depend on cross-tab transport availability.
    }
  };

  const logout = async (identity, { broadcast = true, type = "logout" } = {}) => {
    const sessionId = currentSessionId || readState(storage)?.sessionId || readCookie(documentRef, ADMIN_SESSION_COOKIE);
    clearLocalSession();
    if (broadcast && sessionId) publish(type, { sessionId });
    return providerLogout(identity);
  };

  const snapshot = () => {
    const state = readState(storage);
    const remainingMs = state && Number.isFinite(state.lastActivityAt) ? Math.max(0, ADMIN_INACTIVITY_MS - (now() - state.lastActivityAt)) : 0;
    return {
      sessionId: state?.sessionId || null,
      lastActivityAt: Number.isFinite(state?.lastActivityAt) ? state.lastActivityAt : null,
      warning,
      remainingMs,
    };
  };

  const expire = async (reason = "inactivity") => {
    if (expired) return false;
    expired = true;
    const identity = activeIdentity;
    const sessionId = currentSessionId || readState(storage)?.sessionId;
    clearLocalSession();
    if (sessionId) publish("expire", { sessionId });
    onExpire?.(reason);
    await providerLogout(identity);
    return true;
  };

  const scheduleEvaluation = (delay) => {
    clearTimer();
    if (!active || !Number.isFinite(delay)) return;
    timerId = setTimeoutImpl?.(() => evaluate(), Math.max(0, delay)) ?? null;
  };

  const evaluate = async () => {
    const cookieSessionId = readCookie(documentRef, ADMIN_SESSION_COOKIE);
    const state = readState(storage);

    if (!cookieSessionId || state?.sessionId !== cookieSessionId) {
      return expire("session-invalidated");
    }

    const elapsed = now() - state.lastActivityAt;
    if (!Number.isFinite(state.lastActivityAt) || !Number.isFinite(elapsed) || elapsed < 0) {
      return expire("invalid-clock");
    }
    if (elapsed >= ADMIN_INACTIVITY_MS) {
      return expire("inactivity");
    }

    if (elapsed >= ADMIN_WARNING_AT_MS) {
      if (!warning) {
        warning = true;
        onWarning?.(snapshot());
        publish("warning", { sessionId: state.sessionId, lastActivityAt: state.lastActivityAt });
      }
      scheduleEvaluation(ADMIN_INACTIVITY_MS - elapsed);
      return true;
    }

    warning = false;
    scheduleEvaluation(ADMIN_WARNING_AT_MS - elapsed);
    return true;
  };

  const start = ({ identity, onWarning: warningCallback, onExpire: expireCallback } = {}) => {
    active = true;
    activeIdentity = identity || null;
    onWarning = warningCallback || null;
    onExpire = expireCallback || null;
    expired = false;
    setupTransport();
    void evaluate();
    return stop;
  };

  const stop = () => {
    active = false;
    activeIdentity = null;
    onWarning = null;
    onExpire = null;
    clearTimer();
    clearPendingActivity();
    teardownTransport();
  };

  const persistActivity = (state, activityAt, event) => {
    warning = false;
    if (!writeState(storage, {
      version: 1,
      sessionId: state.sessionId,
      lastActivityAt: activityAt,
      event,
    })) return false;
    publish(event, {
      sessionId: state.sessionId,
      lastActivityAt: activityAt,
    });
    void evaluate();
    return true;
  };

  const flushPendingActivity = () => {
    activityTimerId = null;
    const activityAt = pendingActivityAt;
    pendingActivityAt = null;
    if (!Number.isFinite(activityAt) || !acceptedSessionId()) return false;

    const state = readState(storage);
    if (!state || activityAt <= state.lastActivityAt) return false;
    return persistActivity(state, activityAt, "activity");
  };

  const recordActivity = ({ adminSurface = false, intentional = false } = {}) => {
    if ((!adminSurface && !intentional) || !acceptedSessionId()) return false;
    if (warning && !intentional) return false;

    const state = readState(storage);
    const currentTime = now();
    if (!Number.isFinite(currentTime)) return false;

    if (intentional) {
      clearPendingActivity();
      return persistActivity(state, currentTime, "continue");
    }

    const elapsedSinceWrite = currentTime - state.lastActivityAt;
    if (elapsedSinceWrite < ADMIN_ACTIVITY_THROTTLE_MS) {
      pendingActivityAt = Math.max(pendingActivityAt || 0, currentTime);
      if (activityTimerId === null) {
        activityTimerId = setTimeoutImpl?.(
          flushPendingActivity,
          Math.max(0, ADMIN_ACTIVITY_THROTTLE_MS - elapsedSinceWrite)
        ) ?? null;
      }
      return true;
    }

    clearPendingActivity();
    return persistActivity(state, currentTime, "activity");
  };

  const continueSession = () => recordActivity({ adminSurface: true, intentional: true });

  const isValidMessage = (message) => {
    if (!message || typeof message !== "object" || Array.isArray(message)) return false;
    if (message.version !== 1 || !ALLOWED_EVENT_TYPES.has(message.type)) return false;
    if (typeof message.sessionId !== "string" || !message.sessionId || message.sessionId.length > 128 || message.sessionId !== currentSessionId) return false;
    if (!Number.isFinite(message.at) || message.at < 0 || message.at > now() + 5_000) return false;

    const carriesActivity = ["activity", "continue", "warning"].includes(message.type);
    const allowedKeys = new Set([
      "version",
      "type",
      "sessionId",
      "at",
      ...(carriesActivity ? ["lastActivityAt"] : []),
    ]);
    if (Object.keys(message).some((key) => !allowedKeys.has(key))) return false;
    if (!carriesActivity) return true;
    return Number.isFinite(message.lastActivityAt) && message.lastActivityAt >= 0 && message.lastActivityAt <= message.at;
  };

  const handleRemoteMessage = (message) => {
    if (!isValidMessage(message)) return false;

    if (message.type === "logout" || message.type === "expire") {
      if (expired) return true;
      expired = true;
      const identity = activeIdentity;
      clearLocalSession();
      onExpire?.(message.type === "expire" ? "inactivity" : "remote-logout");
      void providerLogout(identity);
      return true;
    }

    const currentState = readState(storage);
    if (currentState?.sessionId === message.sessionId && message.lastActivityAt < currentState.lastActivityAt) {
      return false;
    }
    if (pendingActivityAt !== null && message.lastActivityAt >= pendingActivityAt) clearPendingActivity();

    writeState(storage, {
      version: 1,
      sessionId: message.sessionId,
      lastActivityAt: message.lastActivityAt,
      event: message.type,
    });
    currentSessionId = message.sessionId;

    if (message.type === "warning") {
      if (!warning) {
        warning = true;
        onWarning?.(snapshot());
      }
      scheduleEvaluation(Math.max(0, ADMIN_INACTIVITY_MS - (now() - message.lastActivityAt)));
      return true;
    }

    warning = false;
    void evaluate();
    return true;
  };

  const setupTransport = () => {
    teardownTransport();
    acceptedSessionId();
    channel = channelFactory?.() || null;
    channel?.unref?.();
    const channelListener = (event) => handleRemoteMessage(event?.data);
    channel?.addEventListener?.("message", channelListener);

    storageListener = (event) => {
      if (event?.key !== ADMIN_SESSION_EVENT_KEY || !event.newValue) return;
      try {
        handleRemoteMessage(JSON.parse(event.newValue));
      } catch {
        // Ignore malformed cross-tab lifecycle messages.
      }
    };
    storageEventTarget?.addEventListener?.("storage", storageListener);
  };

  const teardownTransport = () => {
    channel?.close?.();
    channel = null;
    if (storageListener) storageEventTarget?.removeEventListener?.("storage", storageListener);
    storageListener = null;
  };

  const observeActivity = ({
    eventTarget = globalThis.window,
    visibilityTarget = documentRef,
    isAdminSurface = () => false,
  } = {}) => {
    const activity = () => recordActivity({ adminSurface: Boolean(isAdminSurface()) });
    const recheck = () => void evaluate();
    const visibilityChange = () => {
      if (visibilityTarget?.visibilityState === "visible") recheck();
    };

    for (const event of ["keydown", "pointerdown", "touchstart"]) {
      eventTarget?.addEventListener?.(event, activity);
    }
    eventTarget?.addEventListener?.("focus", recheck);
    visibilityTarget?.addEventListener?.("visibilitychange", visibilityChange);

    return () => {
      for (const event of ["keydown", "pointerdown", "touchstart"]) {
        eventTarget?.removeEventListener?.(event, activity);
      }
      eventTarget?.removeEventListener?.("focus", recheck);
      visibilityTarget?.removeEventListener?.("visibilitychange", visibilityChange);
    };
  };

  return {
    acceptedSessionId,
    canUseSession,
    clearLocalSession,
    continueSession,
    establishSession,
    evaluate,
    logout,
    observeActivity,
    recordActivity,
    snapshot,
    start,
    stop,
  };
};

export const adminSessionLifecycle = createAdminSessionLifecycle();
