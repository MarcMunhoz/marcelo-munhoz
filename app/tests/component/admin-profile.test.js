import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserState, createRouter, createTestMount, installBrowserPolyfills } from "../harness/index.js";

const controls = vi.hoisted(() => ({ session: null, login: vi.fn(), getProfile: vi.fn(), updateProfile: vi.fn() }));

vi.mock("../../src/utils/adminAuth.js", async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminSession: vi.fn(async () => controls.session),
  isWriterSession: (session) => Boolean(session?.roles?.some((role) => role === "writer" || role === "owner")),
  openAdminLogin: (...args) => controls.login(...args),
}));

vi.mock("../../src/utils/adminApi.js", () => ({
  adminUserMessage: (error) => error?.publicMessage || "The admin request could not be completed.",
  getAuthorProfile: (...args) => controls.getProfile(...args),
  updateAuthorProfile: (...args) => controls.updateProfile(...args),
}));

import AdminProfile from "../../src/pages/AdminProfile.vue";

const writer = { subject: "writer-1", name: "Writer One", roles: ["writer"] };
const hash = "a".repeat(64);
const profile = (overrides = {}) => ({
  id: "author-1",
  name: "Writer One",
  slug: "writer-one",
  biography: "Writes about **quality**.",
  version: 4,
  photo: {
    gravatar_profile: "writer-one",
    gravatar_hash: hash,
    fallback_url: "https://res.cloudinary.com/demo/fallback.jpg",
    secure_url: "https://images.ctfassets.net/demo/legacy.jpg",
  },
  ...overrides,
});

const cleanups = [];
const inputByLabel = (wrapper, label) => wrapper.findAllComponents({ name: "QInput" }).find((input) => input.props("label") === label);
const buttonByText = (wrapper, text) => wrapper.findAll("button").find((button) => button.text().includes(text));

const mountProfile = async (settle = true) => {
  const restoreBrowser = installBrowserPolyfills(createBrowserState());
  const Page = { template: "<main>Route target</main>" };
  const router = createRouter({
    initialPath: "/admin/profile",
    routes: [
      { path: "/", component: Page },
      { path: "/admin", component: Page },
      { path: "/admin/profile", component: AdminProfile },
    ],
  });
  await router.isReady();
  const wrapper = createTestMount({ router })({ template: "<router-view />" }, {
    global: { stubs: { QPage: { template: "<main><slot /></main>" } } },
  });
  if (settle) await flushPromises();
  cleanups.push(() => { wrapper.unmount(); restoreBrowser(); });
  return { router, wrapper };
};

beforeEach(() => {
  controls.session = writer;
  controls.login.mockReset().mockReturnValue(true);
  controls.getProfile.mockReset().mockResolvedValue({ profile: profile(), session: { authorEntryId: "author-1" } });
  controls.updateProfile.mockReset().mockResolvedValue({ sys: { version: 5 } });
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  vi.clearAllMocks();
});

describe("rendered author profile management", () => {
  it("enforces signed-out and writer roles, including the blocked sign-in action", async () => {
    controls.session = null;
    const signedOut = await mountProfile();
    expect(signedOut.router.currentRoute.value.path).toBe("/");
    expect(controls.getProfile).not.toHaveBeenCalled();

    controls.session = { subject: "reader-1", roles: ["reader"] };
    const blocked = await mountProfile();
    expect(blocked.wrapper.get(".profile-blocked").text()).toContain("Writer access required");
    expect(controls.getProfile).not.toHaveBeenCalled();
    await buttonByText(blocked.wrapper, "Sign in").trigger("click");
    expect(controls.login).toHaveBeenCalledOnce();
  });

  it("loads the editable profile and switches biography preview", async () => {
    const mounted = await mountProfile();
    expect(controls.getProfile).toHaveBeenCalledWith({ session: writer });
    expect(inputByLabel(mounted.wrapper, "Name").props("modelValue")).toBe("Writer One");
    expect(mounted.wrapper.get(".profile-photo-source").text()).toContain("Gravatar");
    expect(mounted.wrapper.get(".profile-photo-preview img").attributes("referrerpolicy")).toBe("no-referrer");

    mounted.wrapper.findComponent({ name: "QBtnToggle" }).vm.$emit("update:modelValue", "preview");
    await flushPromises();
    expect(mounted.wrapper.get(".markdown-editor-preview").text()).toBe("Writes about **quality**.");
  });

  it("renders validation errors and prevents invalid profile updates", async () => {
    const mounted = await mountProfile();
    inputByLabel(mounted.wrapper, "Name").vm.$emit("update:modelValue", "");
    inputByLabel(mounted.wrapper, "Gravatar profile").vm.$emit("update:modelValue", "writer@example.com");
    inputByLabel(mounted.wrapper, "Fallback photo URL").vm.$emit("update:modelValue", "http://untrusted.example/photo.jpg");
    await mounted.wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(mounted.wrapper.text()).toContain("Name is required");
    expect(mounted.wrapper.text()).toContain("Use a public Gravatar profile slug or URL");
    expect(mounted.wrapper.text()).toContain("Use an approved HTTPS image URL");
    expect(mounted.wrapper.get(".feedback-error").text()).toBe("Fix the highlighted fields before saving.");
    expect(controls.updateProfile).not.toHaveBeenCalled();
  });

  it("falls back to initials after image failures and persists the photo reset", async () => {
    const fallbackPhoto = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
    const legacyPhoto = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Ctitle%3ELegacy%3C/title%3E%3C/svg%3E";
    controls.getProfile.mockResolvedValue({
      profile: profile({ photo: { fallback_url: fallbackPhoto, secure_url: legacyPhoto } }),
      session: {},
    });
    const mounted = await mountProfile();
    for (let candidate = 0; candidate < 2 && mounted.wrapper.find(".profile-photo-preview img").exists(); candidate += 1) {
      await mounted.wrapper.get(".profile-photo-preview img").trigger("error");
    }
    expect(mounted.wrapper.find(".profile-photo-preview img").exists()).toBe(false);
    expect(mounted.wrapper.get(".profile-photo-source").text()).toContain("Initials");

    await buttonByText(mounted.wrapper, "clear photo settings").trigger("click");
    await mounted.wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(controls.updateProfile).toHaveBeenCalledWith({
      profile: expect.objectContaining({ gravatarProfile: "", fallbackPhotoUrl: "", name: "Writer One", version: 4 }),
      session: writer,
    });
  });

  it("saves changes, reloads the profile, and reports API failures safely", async () => {
    const mounted = await mountProfile();
    inputByLabel(mounted.wrapper, "Name").vm.$emit("update:modelValue", "Updated Writer");
    await mounted.wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(controls.updateProfile).toHaveBeenCalledWith({
      profile: expect.objectContaining({ name: "Updated Writer", slug: "writer-one", biography: "Writes about **quality**.", version: 4 }),
      session: expect.objectContaining({ authorEntryId: "author-1" }),
    });
    expect(controls.getProfile).toHaveBeenCalledTimes(2);
    expect(mounted.wrapper.get(".feedback-success").text()).toBe("Author profile saved.");

    controls.updateProfile.mockRejectedValueOnce({ publicMessage: "Profile update was rejected." });
    await mounted.wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(mounted.wrapper.get(".feedback-error").text()).toBe("Profile update was rejected.");
  });
});
