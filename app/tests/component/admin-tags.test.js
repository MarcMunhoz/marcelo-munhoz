import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserState, createRouter, createTestMount, installBrowserPolyfills } from "../harness/index.js";

const controls = vi.hoisted(() => ({ session: null, list: vi.fn(), create: vi.fn(), remove: vi.fn() }));

vi.mock("../../src/utils/adminAuth.js", () => ({
  getAdminSession: vi.fn(async () => controls.session),
  isOwnerSession: (session) => Boolean(session?.roles?.includes("owner")),
}));

vi.mock("../../src/utils/adminApi.js", () => {
  class AdminApiError extends Error {}
  return {
    AdminApiError,
    adminUserMessage: (error) => error?.publicMessage || "The admin request could not be completed.",
    createContentfulTag: (...args) => controls.create(...args),
    deleteContentfulTag: (...args) => controls.remove(...args),
    listManagedContentfulTags: (...args) => controls.list(...args),
  };
});

import AdminTags from "../../src/pages/AdminTags.vue";

const owner = { subject: "owner-1", roles: ["owner"] };
const cleanups = [];
const inputByLabel = (wrapper, label) => wrapper.findAllComponents({ name: "QInput" }).find((input) => input.props("label") === label);
const buttonByText = (root, text) => [...root.querySelectorAll("button")].find((button) => button.textContent.includes(text));

const mountTags = async () => {
  const restoreBrowser = installBrowserPolyfills(createBrowserState());
  const Page = { template: "<main>Route target</main>" };
  const router = createRouter({
    initialPath: "/admin/tags",
    routes: [
      { path: "/", component: Page },
      { path: "/admin", component: Page },
      { path: "/admin/tags", component: AdminTags },
    ],
  });
  await router.isReady();
  const wrapper = createTestMount({ router })({ template: "<router-view />" }, {
    attachTo: document.body,
    global: { stubs: { QPage: { template: "<main><slot /></main>" } } },
  });
  await flushPromises();
  cleanups.push(() => { wrapper.unmount(); restoreBrowser(); });
  return { router, wrapper };
};

beforeEach(() => {
  controls.session = owner;
  controls.list.mockReset().mockResolvedValue({ tags: [
    { id: "quality", label: "Quality", visibility: "public", articleCount: 2 },
    { id: "unused", label: "Unused", visibility: "private", articleCount: 0 },
    { id: "article-lang-pt-br", label: "Portuguese", visibility: "private", articleCount: 0 },
  ] });
  controls.create.mockReset().mockResolvedValue({ tag: { id: "new-tag", name: "New tag" } });
  controls.remove.mockReset().mockResolvedValue({});
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  document.body.querySelectorAll(".q-dialog").forEach((dialog) => dialog.remove());
  vi.clearAllMocks();
});

describe("rendered tag management", () => {
  it("enforces owner-only routing before listing tags", async () => {
    controls.session = null;
    const signedOut = await mountTags();
    expect(signedOut.router.currentRoute.value.path).toBe("/");
    expect(controls.list).not.toHaveBeenCalled();

    controls.session = { subject: "writer-1", roles: ["writer"] };
    const writer = await mountTags();
    expect(writer.router.currentRoute.value.path).toBe("/admin");
    expect(controls.list).not.toHaveBeenCalled();
  });

  it("renders editorial tags, hides reserved languages, and exposes usage constraints", async () => {
    const mounted = await mountTags();
    expect(controls.list).toHaveBeenCalledWith({ session: owner });
    expect(mounted.wrapper.text()).toContain("Quality");
    expect(mounted.wrapper.text()).toContain("Unused");
    expect(mounted.wrapper.text()).not.toContain("Portuguese");
    expect(mounted.wrapper.text()).toContain("Remove this tag from matching articles first");
    expect(mounted.wrapper.get("button[aria-label='Delete Quality']").attributes("disabled")).toBeDefined();
    expect(mounted.wrapper.get("button[aria-label='Delete Unused']").attributes("disabled")).toBeUndefined();
  });

  it("trims, creates, and reloads a new tag", async () => {
    const mounted = await mountTags();
    inputByLabel(mounted.wrapper, "New tag name").vm.$emit("update:modelValue", "  New tag  ");
    await mounted.wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(controls.create).toHaveBeenCalledWith({ name: "New tag", session: owner });
    expect(controls.list).toHaveBeenCalledTimes(2);
    expect(inputByLabel(mounted.wrapper, "New tag name").props("modelValue")).toBe("");
    expect(mounted.wrapper.get(".feedback-success").text()).toBe("Tag created.");
  });

  it("requires confirmation and deletes only an unused tag", async () => {
    const mounted = await mountTags();
    await mounted.wrapper.get("button[aria-label='Delete Unused']").trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain("permanently delete Unused");
    expect(controls.remove).not.toHaveBeenCalled();
    buttonByText(document.body, "Delete permanently").click();
    await flushPromises();
    expect(controls.remove).toHaveBeenCalledWith({ tagId: "unused", session: owner });
    expect(controls.list).toHaveBeenCalledTimes(2);
  });

  it("renders safe feedback when listing, creation, or deletion fails", async () => {
    controls.list.mockRejectedValueOnce({ publicMessage: "Tags are unavailable." });
    const listed = await mountTags();
    expect(listed.wrapper.get(".feedback-error").text()).toBe("Tags are unavailable.");

    controls.list.mockResolvedValue({ tags: [{ id: "unused", label: "Unused", articleCount: 0 }] });
    controls.create.mockRejectedValueOnce({ publicMessage: "Tag creation failed." });
    const created = await mountTags();
    inputByLabel(created.wrapper, "New tag name").vm.$emit("update:modelValue", "New tag");
    await created.wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(created.wrapper.get(".feedback-error").text()).toBe("Tag creation failed.");

    controls.remove.mockRejectedValueOnce({ publicMessage: "Tag deletion failed." });
    await created.wrapper.get("button[aria-label='Delete Unused']").trigger("click");
    await flushPromises();
    buttonByText(document.body, "Delete permanently").click();
    await flushPromises();
    expect(created.wrapper.get(".feedback-error").text()).toBe("Tag deletion failed.");
  });
});
