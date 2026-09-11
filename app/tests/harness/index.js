import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar/dist/quasar.client.js'
import { createMemoryHistory, createRouter as createVueRouter } from 'vue-router'
import { vi } from 'vitest'

export { createBrowserState, installBrowserPolyfills } from './browser.js'

const clone = (value) => structuredClone(value)

export const createFixture = (fixture) => clone(fixture)

export const createProviderClient = (handlers = {}) => Object.fromEntries(
  Object.entries(handlers).map(([name, handler]) => [name, async (...args) => clone(await (typeof handler === 'function' ? handler(...args) : handler))])
)

export const createClock = (now = new Date('2026-01-01T00:00:00.000Z')) => {
  let installed = false
  return {
    advanceBy(milliseconds) {
      vi.advanceTimersByTime(milliseconds)
    },
    install() {
      vi.useFakeTimers()
      vi.setSystemTime(now)
      installed = true
    },
    now: () => new Date(Date.now()),
    restore() {
      if (installed) vi.useRealTimers()
      installed = false
    }
  }
}

export const createRouter = ({ routes = [], initialPath = '/' } = {}) => {
  const router = createVueRouter({ history: createMemoryHistory(), routes })
  router.push(initialPath)
  return router
}

export const createTestMount = ({ router = createRouter(), quasar = {}, global = {} } = {}) => (component, options = {}) => mount(component, {
  ...options,
  global: {
    ...global,
    ...options.global,
    plugins: [[Quasar, quasar], router, ...(global.plugins ?? []), ...(options.global?.plugins ?? [])],
    config: {
      globalProperties: {},
      ...(global.config ?? {}),
      ...(options.global?.config ?? {})
    }
  }
})
