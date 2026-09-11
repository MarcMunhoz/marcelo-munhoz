const clone = (value) => structuredClone(value)

const createStorage = () => {
  const values = new Map()

  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(String(key)) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(String(key)),
    setItem: (key, value) => values.set(String(key), String(value))
  }
}

class TestFile extends Blob {
  constructor(bits, name, options = {}) {
    super(bits, options)
    this.lastModified = options.lastModified ?? 0
    this.name = name
  }
}

export const createBrowserState = ({
  url = new URL('/', globalThis.location?.origin ?? 'http://localhost/').href,
  fetch = async () => new Response(null, { status: 200 }),
  media = {},
  files = [new TestFile([''], 'fixture.txt', { type: 'text/plain' })],
  dialogs = {}
} = {}) => {
  const mediaQueries = new Map()
  const observers = new Set()
  const channels = new Map()

  const matchMedia = (query) => {
    if (!mediaQueries.has(query)) {
      const listeners = new Set()
      mediaQueries.set(query, {
        listeners,
        matches: Boolean(media[query]),
        media: query,
        addEventListener: (type, listener) => type === 'change' && listeners.add(listener),
        removeEventListener: (type, listener) => type === 'change' && listeners.delete(listener),
        addListener: (listener) => listeners.add(listener),
        removeListener: (listener) => listeners.delete(listener),
        dispatchEvent: () => true
      })
    }
    return mediaQueries.get(query)
  }

  class TestObserver {
    constructor(callback) {
      this.callback = callback
      this.targets = new Set()
      observers.add(this)
    }

    disconnect() {
      this.targets.clear()
      observers.delete(this)
    }

    observe(target) {
      this.targets.add(target)
    }

    unobserve(target) {
      this.targets.delete(target)
    }
  }

  class TestBroadcastChannel {
    constructor(name) {
      this.name = name
      this.listeners = new Set()
      this.onmessage = null
      this.closed = false
      if (!channels.has(name)) channels.set(name, new Set())
      channels.get(name).add(this)
    }

    addEventListener(type, listener) {
      if (type === 'message') this.listeners.add(listener)
    }

    close() {
      this.closed = true
      channels.get(this.name)?.delete(this)
    }

    postMessage(data) {
      for (const channel of channels.get(this.name) ?? []) {
        if (channel === this || channel.closed) continue
        const event = { data: clone(data), target: channel, type: 'message' }
        channel.onmessage?.(event)
        channel.listeners.forEach((listener) => listener(event))
      }
    }

    removeEventListener(type, listener) {
      if (type === 'message') this.listeners.delete(listener)
    }
  }

  return {
    BroadcastChannel: TestBroadcastChannel,
    File: TestFile,
    IntersectionObserver: TestObserver,
    ResizeObserver: TestObserver,
    dialogs: {
      alert: dialogs.alert ?? (() => {}),
      confirm: dialogs.confirm ?? (() => true),
      prompt: dialogs.prompt ?? (() => null)
    },
    fetch,
    files,
    localStorage: createStorage(),
    matchMedia,
    sessionStorage: createStorage(),
    emitIntersection(target, isIntersecting) {
      for (const observer of observers) {
        if (observer.targets.has(target)) observer.callback([{ isIntersecting, target }], observer)
      }
    },
    emitResize(target, contentRect = {}) {
      for (const observer of observers) {
        if (observer.targets.has(target)) observer.callback([{ contentRect, target }], observer)
      }
    },
    setMedia(query, matches) {
      const mediaQuery = matchMedia(query)
      mediaQuery.matches = Boolean(matches)
      const event = { matches: mediaQuery.matches, media: query, type: 'change' }
      mediaQuery.listeners.forEach((listener) => listener(event))
    },
    showOpenFilePicker: async () => files.map((file) => ({ getFile: async () => new TestFile([await file.arrayBuffer()], file.name, {
      lastModified: file.lastModified,
      type: file.type
    }) })),
    url
  }
}

const replaceGlobal = (target, key, value, restorations) => {
  restorations.push([key, Object.getOwnPropertyDescriptor(target, key)])
  Object.defineProperty(target, key, { configurable: true, value, writable: true })
}

export const installBrowserPolyfills = (state = createBrowserState(), target = globalThis) => {
  const restorations = []
  const originalCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie')
  const cookies = new Map()
  const fileReader = class {
    readAsText(file) {
      file.text().then((result) => {
        this.result = result
        this.onload?.({ target: this })
      })
    }
  }

  replaceGlobal(target, 'fetch', state.fetch, restorations)
  replaceGlobal(target, 'localStorage', state.localStorage, restorations)
  replaceGlobal(target, 'sessionStorage', state.sessionStorage, restorations)
  replaceGlobal(target, 'matchMedia', state.matchMedia, restorations)
  replaceGlobal(target, 'ResizeObserver', state.ResizeObserver, restorations)
  replaceGlobal(target, 'IntersectionObserver', state.IntersectionObserver, restorations)
  replaceGlobal(target, 'BroadcastChannel', state.BroadcastChannel, restorations)
  replaceGlobal(target, 'alert', state.dialogs.alert, restorations)
  replaceGlobal(target, 'confirm', state.dialogs.confirm, restorations)
  replaceGlobal(target, 'prompt', state.dialogs.prompt, restorations)
  replaceGlobal(target, 'File', state.File, restorations)
  replaceGlobal(target, 'FileReader', fileReader, restorations)
  replaceGlobal(target, 'showOpenFilePicker', state.showOpenFilePicker, restorations)
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get: () => [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
    set: (value) => {
      const [pair, ...attributes] = String(value).split(';').map((part) => part.trim())
      const [name, cookieValue = ''] = pair.split('=', 2)
      if (attributes.some((attribute) => /^max-age=0$/i.test(attribute) || /^expires=/i.test(attribute))) cookies.delete(name)
      else cookies.set(name, cookieValue)
    }
  })
  history.replaceState({}, '', state.url)

  return () => {
    state.localStorage.clear()
    state.sessionStorage.clear()
    if (originalCookieDescriptor) Object.defineProperty(document, 'cookie', originalCookieDescriptor)
    else delete document.cookie
    history.replaceState({}, '', state.url)
    restorations.reverse().forEach(([key, descriptor]) => {
      if (descriptor) Object.defineProperty(target, key, descriptor)
      else delete target[key]
    })
  }
}
