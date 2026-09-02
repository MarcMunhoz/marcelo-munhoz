import { flushPromises } from "@vue/test-utils";
import { defineComponent, onMounted } from "vue";
import { describe, expect, it, vi } from "vitest";
import { createRouter, createTestMount } from "../harness/index.js";
import App from "../../src/App.vue";

describe("application shell", () => {
  it("preserves the rendered page across query changes and updates public metadata", async () => {
    let mounts = 0;
    const Page = defineComponent({
      setup() { onMounted(() => { mounts += 1; }); },
      template: "<main>About page</main>",
    });
    const router = createRouter({
      initialPath: "/about?from=home",
      routes: [{ path: "/about", name: "About", component: Page, meta: { title: "About" } }],
    });
    await router.isReady();
    const wrapper = createTestMount({ router })(App, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.text()).toContain("About page");
    expect(document.title).toBe("Marcelo Munhoz - About");
    await vi.waitFor(() => {
      expect(document.head.querySelector('meta[name="description"]')?.content).toContain("development experience");
      expect(document.head.querySelector('meta[name="robots"]')?.content).toBe("index,follow");
    });
    await router.push("/about?from=blog");
    await flushPromises();
    expect(mounts).toBe(1);
    wrapper.unmount();
  });

  it("shows and dismisses the cookie notice on a public route", async () => {
    const Page = { template: "<main>Page</main>" };
    const router = createRouter({
      routes: [
        { path: "/", component: Page, meta: { title: "Home" } },
      ],
    });
    await router.isReady();
    const wrapper = createTestMount({ router })(App, { attachTo: document.body });
    await flushPromises();

    expect(document.body.textContent).toContain("Google Analytics");
    wrapper.getComponent({ name: "QDialog" }).vm.$emit("update:modelValue", false);
    await flushPromises();
    expect(document.body.textContent).not.toContain("Google Analytics");

    wrapper.unmount();
  });

  it("suppresses pending cookie consent and indexing on a fresh administrative route", async () => {
    const router = createRouter({
      initialPath: "/admin",
      routes: [{ path: "/admin", component: { template: "<main>Admin</main>" }, meta: { title: "Admin", requiresAdmin: true } }],
    });
    await router.isReady();
    const wrapper = createTestMount({ router })(App, { attachTo: document.body });
    await flushPromises();

    expect(document.body.textContent).not.toContain("Google Analytics");
    await vi.waitFor(() => expect(document.head.querySelector('meta[name="robots"]')?.content).toBe("noindex,nofollow"));
    wrapper.unmount();
  });
});
