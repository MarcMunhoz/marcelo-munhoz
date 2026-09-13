import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createBrowserState,
  createClock,
  createFixture,
  createProviderClient,
  installBrowserPolyfills
} from '../harness/index.js'

const cleanups = []

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup())
})

describe('browser harness', () => {
  it('restores browser globals and clears state after a test', async () => {
    const originalFetch = globalThis.fetch
    const state = createBrowserState({
      url: new URL('/blog?page=2', location.origin).href,
      fetch: async () => new Response('{"ok":true}', { status: 200 })
    })
    cleanups.push(installBrowserPolyfills(state))

    localStorage.setItem('session', 'test-only')
    document.cookie = 'notice=dismissed'
    history.pushState({}, '', '/about')
    const response = await fetch('/api/posts')

    expect(response.status).toBe(200)
    expect(localStorage.getItem('session')).toBe('test-only')
    expect(document.cookie).toContain('notice=dismissed')
    expect(location.pathname).toBe('/about')

    cleanups.pop()()

    expect(globalThis.fetch).toBe(originalFetch)
    expect(localStorage.getItem('session')).toBeNull()
    expect(document.cookie).not.toContain('notice=dismissed')
    expect(location.pathname).toBe('/blog')
    expect(location.search).toBe('?page=2')
  })

  it('supplies deterministic media, observer, channel, dialog, and file APIs', async () => {
    const state = createBrowserState({ media: { '(max-width: 600px)': true } })
    cleanups.push(installBrowserPolyfills(state))
    const changes = []
    const media = matchMedia('(max-width: 600px)')
    media.addEventListener('change', (event) => changes.push(event.matches))
    const entries = []
    const observer = new IntersectionObserver((nextEntries) => entries.push(...nextEntries))
    const received = []
    const first = new BroadcastChannel('session')
    const second = new BroadcastChannel('session')
    second.addEventListener('message', (event) => received.push(event.data))

    observer.observe(document.body)
    state.setMedia('(max-width: 600px)', false)
    state.emitIntersection(document.body, true)
    first.postMessage({ type: 'renewed' })
    const [handle] = await showOpenFilePicker()

    expect(media.matches).toBe(false)
    expect(changes).toEqual([false])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ isIntersecting: true, target: document.body })
    expect(received).toEqual([{ type: 'renewed' }])
    expect(confirm('continue?')).toBe(true)
    expect(await handle.getFile()).toBeInstanceOf(File)

    first.close()
    second.close()
  })

  it('creates independent fixtures, provider clients, and fake clocks', async () => {
    const source = { article: { title: 'Original' } }
    const fixture = createFixture(source)
    const client = createProviderClient({ getArticle: fixture })
    const clock = createClock(new Date('2026-01-02T03:04:05.000Z'))

    fixture.article.title = 'Changed'
    const article = await client.getArticle()
    const timeout = vi.fn()
    clock.install()
    setTimeout(timeout, 1_000)
    clock.advanceBy(1_000)

    expect(source.article.title).toBe('Original')
    expect(article).toEqual({ article: { title: 'Changed' } })
    expect(timeout).toHaveBeenCalledOnce()
    expect(clock.now()).toEqual(new Date('2026-01-02T03:04:06.000Z'))

    clock.restore()
  })

  it('allows the shared setup to clean fake timers after a test', () => {
    vi.useFakeTimers()

    expect(vi.isFakeTimers()).toBe(true)
  })

  it('starts the next test with real timers', () => {
    expect(vi.isFakeTimers()).toBe(false)
  })
})
