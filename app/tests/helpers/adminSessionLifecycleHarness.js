export const createCookieDocument = () => {
  const cookies = new Map();
  const writes = [];

  return {
    get cookie() {
      return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
    },
    set cookie(serialized) {
      writes.push(serialized);
      const [pair, ...attributes] = String(serialized).split(";").map((part) => part.trim());
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator);
      const value = pair.slice(separator + 1);
      const remove = attributes.some((attribute) => /^max-age=0$/i.test(attribute));

      if (remove) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    },
    writes,
  };
};

export const createMemoryStorage = () => {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    snapshot() {
      return Object.fromEntries(values);
    },
  };
};

export const createFakeClock = (initialNow = 0) => {
  let currentNow = initialNow;
  let nextTimerId = 1;
  const timers = new Map();

  const runDueTimers = async () => {
    while (true) {
      const due = [...timers.entries()]
        .filter(([, timer]) => timer.at <= currentNow)
        .sort((left, right) => left[1].at - right[1].at)[0];
      if (!due) return;

      const [timerId, timer] = due;
      timers.delete(timerId);
      await timer.callback();
    }
  };

  return {
    clearTimeout(timerId) {
      timers.delete(timerId);
    },
    now() {
      return currentNow;
    },
    setTimeout(callback, delay) {
      const timerId = nextTimerId++;
      timers.set(timerId, { at: currentNow + Math.max(0, delay), callback });
      return timerId;
    },
    async advance(milliseconds) {
      currentNow += milliseconds;
      await runDueTimers();
    },
    jump(milliseconds) {
      currentNow += milliseconds;
    },
    pendingTimers() {
      return timers.size;
    },
  };
};

export const createEventTarget = ({ visibilityState = "visible" } = {}) => {
  const listeners = new Map();

  return {
    visibilityState,
    addEventListener(type, callback) {
      const callbacks = listeners.get(type) || new Set();
      callbacks.add(callback);
      listeners.set(type, callbacks);
    },
    dispatch(type, event = {}) {
      for (const callback of listeners.get(type) || []) callback(event);
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
  };
};

export const createChannelHub = () => {
  const channels = new Set();
  const messages = [];

  return {
    messages,
    create() {
      const listeners = new Set();
      const channel = {
        addEventListener(type, callback) {
          if (type === "message") listeners.add(callback);
        },
        close() {
          channels.delete(channel);
          listeners.clear();
        },
        postMessage(data) {
          messages.push(data);
          for (const peer of channels) {
            if (peer === channel) continue;
            peer.deliver(data);
          }
        },
        removeEventListener(type, callback) {
          if (type === "message") listeners.delete(callback);
        },
        deliver(data) {
          for (const callback of listeners) callback({ data });
        },
      };
      channels.add(channel);
      return channel;
    },
  };
};
