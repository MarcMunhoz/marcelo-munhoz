import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouter, createTestMount } from "../harness/index.js";

const controls = vi.hoisted(() => ({
  session: null,
  profile: null,
  login: vi.fn(),
  signOut: vi.fn(),
  lifecycleOptions: null,
}));

vi.mock("../../src/utils/adminApi.js", () => ({
  getAuthorProfile: vi.fn(async () => ({ profile: controls.profile })),
}));

vi.mock("../../src/utils/adminAuth.js", () => ({
  adminAccessPhraseMatches: (phrase) => phrase.trim().toUpperCase() === "AMIGO",
  adminAccountInitials: (session) => session?.name?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2) || "A",
  adminSessionDisplay: (session) => ({
    name: session?.name || "Admin",
    role: session?.role || "writer",
    context: session?.preview ? "Preview" : "Authenticated",
    canSignOut: Boolean(session && !session.preview),
  }),
  bindIdentityCallbacks: () => () => {},
  completeAdminIdentityLogin: vi.fn(),
  createAdminProfileLoader: ({ getAuthorProfileImpl, applyProfile }) => ({
    invalidate: vi.fn(),
    async load(session) {
      if (!session) return;
      const result = await getAuthorProfileImpl();
      applyProfile(result.profile);
    },
  }),
  getAdminSession: vi.fn(async () => controls.session),
  nextAdminAccessClick: (state) => {
    const count = (state?.count || 0) + 1;
    return { state: { count }, unlock: count === 3 };
  },
  openAdminLogin: controls.login.mockReturnValue(true),
  redirectSignedOutAdmin: async ({ router, currentPath }) => {
    if (currentPath.startsWith("/admin")) await router.push("/");
  },
  rejectAdminAccess: async ({ notifyImpl, router, currentPath }) => {
    notifyImpl({ message: "Access denied" });
    if (currentPath !== "/") await router.push("/");
  },
  signOutAdmin: async ({ onLocalSignOut }) => {
    controls.signOut();
    await onLocalSignOut();
  },
}));

vi.mock("../../src/utils/adminSessionLifecycle.js", () => ({
  adminSessionLifecycle: {
    clearLocalSession: vi.fn(),
    continueSession: vi.fn(() => true),
    observeActivity: vi.fn(() => () => {}),
    start: vi.fn((options) => { controls.lifecycleOptions = options; }),
    stop: vi.fn(),
  },
  createAdminSessionCountdown: (options) => ({
    start: vi.fn((snapshot) => options.onTick(snapshot)),
    stop: vi.fn(),
  }),
}));

import MainLayout from "../../src/layouts/MainLayout.vue";

const mountLayout = async (initialPath = "/about") => {
  const Page = { template: "<main>Page</main>" };
  const routes = [
    { path: "/", name: "Home", component: Page },
    { path: "/about", name: "About", component: Page },
    { path: "/blog", name: "Blog", component: Page },
    { path: "/admin", name: "Admin", component: Page, meta: { requiresAdmin: true } },
    { path: "/admin/profile", name: "Profile", component: Page, meta: { requiresAdmin: true } },
  ];
  const router = createRouter({ routes, initialPath });
  const wrapper = createTestMount({ router })(MainLayout, { attachTo: document.body });
  await router.isReady();
  await flushPromises();
  return { router, wrapper };
};

beforeEach(() => {
  controls.session = null;
  controls.profile = null;
  controls.login.mockClear();
  controls.signOut.mockClear();
  controls.lifecycleOptions = null;
});

describe("main layout", () => {
  it("navigates through desktop, mobile, and keyboard-focusable controls", async () => {
    const { router, wrapper } = await mountLayout();
    expect(wrapper.findAll(".desktop-navigation-action").map((item) => item.text())).toEqual([
      expect.stringContaining("About"),
      expect.stringContaining("Blog"),
    ]);
    expect(wrapper.get(".mobile-navigation-menu").attributes("aria-label")).toBe("Navigation menu");
    const name = wrapper.get(".site-name");
    expect(name.attributes()).toMatchObject({ role: "button", tabindex: "0" });
    name.element.focus();
    expect(document.activeElement).toBe(name.element);
    vi.useFakeTimers();
    await name.trigger("keyup.enter");
    vi.advanceTimersByTime(600);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/");
    vi.useRealTimers();

    await wrapper.findAll(".desktop-navigation-action")[0].trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/about");
    await wrapper.get(".mobile-navigation-menu").trigger("click");
    await flushPromises();
    const blog = [...document.body.querySelectorAll(".mobile-navigation-list .q-item")]
      .find((item) => item.textContent.includes("Blog"));
    blog.click();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/blog");
    wrapper.unmount();
  });

  it("opens administrative access after three activations and submits AMIGO", async () => {
    const { wrapper } = await mountLayout();
    const name = wrapper.get(".site-name");
    await name.trigger("click");
    await name.trigger("click");
    await name.trigger("click");
    await flushPromises();
    const input = document.body.querySelector(".admin-access-card input");
    expect(input).not.toBeNull();
    input.value = "AMIGO";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.body.querySelector(".admin-access-card form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(controls.login).toHaveBeenCalledOnce();
    wrapper.unmount();
  });

  it("rejects an invalid administrative phrase and returns to the public home", async () => {
    const { router, wrapper } = await mountLayout();
    const name = wrapper.get(".site-name");
    await name.trigger("click"); await name.trigger("click"); await name.trigger("click");
    await flushPromises();
    const input = document.body.querySelector(".admin-access-card input");
    input.value = "NAO";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.body.querySelector(".admin-access-card form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();
    expect(document.body.textContent).toContain("Access denied");
    expect(router.currentRoute.value.path).toBe("/");
    wrapper.unmount();
  });

  it("renders the account fallback and session warning, then signs out safely", async () => {
    controls.session = { name: "Ada Lovelace", role: "owner", preview: false };
    const { router, wrapper } = await mountLayout("/admin");
    expect(wrapper.get(".admin-account-menu").text()).toContain("Ada Lovelace");
    await wrapper.get(".admin-account-menu").trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("AL");
    expect(document.body.textContent).toContain("Author profile");

    controls.lifecycleOptions.onWarning({ label: "00:42" });
    await flushPromises();
    expect(document.body.textContent).toContain("Session expires in");
    expect(document.body.textContent).toContain("00:42");
    const warning = document.body.querySelector(".admin-session-warning-card");
    const signOut = [...warning.querySelectorAll("button")].find((button) => button.textContent.includes("Sign out"));
    signOut.click();
    await flushPromises();
    expect(controls.signOut).toHaveBeenCalledOnce();
    expect(router.currentRoute.value.path).toBe("/");
    wrapper.unmount();
  });
});
