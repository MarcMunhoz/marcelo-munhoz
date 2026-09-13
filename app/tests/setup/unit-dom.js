import { afterEach, beforeEach, vi } from 'vitest'
import { createBrowserState, installBrowserPolyfills } from '../harness/index.js'

let cleanup = () => {}

beforeEach(() => {
  cleanup = installBrowserPolyfills(createBrowserState())
})

afterEach(() => {
  cleanup()
  cleanup = () => {}
  vi.useRealTimers()
})
