import { flushPromises } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createRouter, createTestMount } from '../harness/index.js'
import HarnessPage from './fixtures/HarnessPage.vue'

describe('component harness', () => {
  it('mounts with isolated Quasar and memory-router state', async () => {
    const router = createRouter({
      initialPath: '/',
      routes: [
        { path: '/', component: HarnessPage },
        { path: '/next', component: { template: '<p>Next page</p>' } }
      ]
    })
    const mount = createTestMount({ router })
    const wrapper = mount(HarnessPage)

    await router.isReady()
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/next')
    expect(wrapper.text()).toContain('Continue')

    wrapper.unmount()
  })
})
