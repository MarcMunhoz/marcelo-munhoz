import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserState, createRouter, createTestMount, installBrowserPolyfills } from "../harness/index.js";

const controls = vi.hoisted(() => ({
  session: null,
  signingOut: false,
  listTags: vi.fn(),
  profile: vi.fn(),
  listArticles: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  createTag: vi.fn(),
  listMedia: vi.fn(),
  upload: vi.fn(),
  review: vi.fn(),
  requestUnpublication: vi.fn(),
  unpublish: vi.fn(),
  editorConfig: vi.fn(),
  openEditor: vi.fn(),
}));

vi.mock("../../src/utils/adminAuth.js", () => ({
  getAdminSession: vi.fn(async () => controls.session),
  isAdminSignOutNavigation: () => controls.signingOut,
  isWriterSession: (session) => Boolean(session?.roles?.some((role) => role === "writer" || role === "owner")),
}));

vi.mock("../../src/utils/adminApi.js", () => {
  class AdminApiError extends Error {}
  return {
    AdminApiError,
    adminUserMessage: (error, options = {}) => error?.publicMessage || (options.media ? "Media request failed." : "The admin request could not be completed."),
    createArticleDraft: (...args) => controls.create(...args),
    createContentfulTag: (...args) => controls.createTag(...args),
    getMediaEditorConfig: (...args) => controls.editorConfig(...args),
    getAuthorProfile: (...args) => controls.profile(...args),
    listContentfulTags: (...args) => controls.listTags(...args),
    listAdminArticles: (...args) => controls.listArticles(...args),
    listMediaAssets: (...args) => controls.listMedia(...args),
    requestArticleUnpublication: (...args) => controls.requestUnpublication(...args),
    submitArticleForReview: (...args) => controls.review(...args),
    unpublishArticle: (...args) => controls.unpublish(...args),
    updateArticleDraft: (...args) => controls.update(...args),
    uploadMediaAsset: (...args) => controls.upload(...args),
  };
});

vi.mock("../../src/utils/cloudinaryMediaEditor.js", () => {
  class CloudinaryMediaEditorUnavailableError extends Error {}
  return {
    CloudinaryMediaEditorUnavailableError,
    openCloudinaryMediaEditor: (...args) => controls.openEditor(...args),
  };
});

import AdminArticleEditor from "../../src/pages/AdminArticleEditor.vue";

const writer = { subject: "writer-1", authorEntryId: "author-1", name: "Writer One", roles: ["writer"], preview: true };
const owner = { subject: "owner-1", authorEntryId: "author-owner", name: "Owner One", roles: ["owner"], preview: true };
const editableArticle = (overrides = {}) => ({
  id: "article-1",
  title: "Existing article",
  slug: "existing-article",
  description: "Existing description",
  body: "**Existing body**",
  locale: "en-US",
  createAt: "2026-08-20",
  status: "draft",
  lifecycleStatus: "draft",
  author: "Writer One",
  authorName: "Writer One",
  authorEntryId: "author-1",
  writerSubject: "writer-1",
  tags: ["testing"],
  thumbnail: { public_id: "articles/existing", secure_url: "https://res.cloudinary.com/demo/existing.jpg" },
  alt: "Existing cover",
  version: 7,
  ...overrides,
});

const cleanups = [];
const inputByLabel = (wrapper, label) => wrapper.findAllComponents({ name: "QInput" }).find((input) => input.props("label") === label);
const buttonByText = (wrapper, text) => wrapper.findAll("button").find((button) => button.text().includes(text));

const mountEditor = async ({ initialPath = "/admin/articles/new", settle = true } = {}) => {
  const restoreBrowser = installBrowserPolyfills(createBrowserState());
  const Page = { template: "<main>Dashboard</main>" };
  const router = createRouter({
    initialPath,
    routes: [
      { path: "/", name: "Home", component: Page },
      { path: "/admin", name: "Admin", component: Page },
      { path: "/admin/articles/new", name: "Admin Article New", component: AdminArticleEditor },
      { path: "/admin/articles/:entryId/edit", name: "Admin Article Edit", component: AdminArticleEditor },
    ],
  });
  await router.isReady();
  const wrapper = createTestMount({ router })({ template: "<router-view />" }, {
    attachTo: document.body,
    global: { stubs: { QPage: { template: "<main><slot /></main>" } } },
  });
  if (settle) await flushPromises();
  const cleanup = () => {
    wrapper.unmount();
    restoreBrowser();
  };
  cleanups.push(cleanup);
  return { router, wrapper };
};

beforeEach(() => {
  controls.session = writer;
  controls.signingOut = false;
  controls.listTags.mockReset().mockResolvedValue({ tags: [{ id: "testing", name: "Testing" }, { id: "vue", name: "Vue" }] });
  controls.profile.mockReset().mockResolvedValue({ profile: { id: "author-1", name: "Writer One" }, session: {} });
  controls.listArticles.mockReset().mockResolvedValue({ articles: [editableArticle()], session: {} });
  controls.create.mockReset().mockResolvedValue({ sys: { id: "created-1", version: 1 } });
  controls.update.mockReset().mockResolvedValue({ sys: { id: "article-1", version: 8 } });
  controls.createTag.mockReset().mockResolvedValue({ tag: { id: "quality", name: "Quality" } });
  controls.listMedia.mockReset().mockResolvedValue({
    assets: [{ public_id: "articles/new", secure_url: "https://res.cloudinary.com/demo/new.jpg", display_name: "New cover", width: 1200, height: 630 }],
  });
  controls.upload.mockReset().mockResolvedValue({ asset: { publicId: "articles/upload", thumbnailUrl: "https://res.cloudinary.com/demo/upload.jpg", alt: "Uploaded cover" } });
  controls.review.mockReset().mockResolvedValue({});
  controls.requestUnpublication.mockReset().mockResolvedValue({});
  controls.unpublish.mockReset().mockResolvedValue({});
  controls.editorConfig.mockReset().mockResolvedValue({ mediaEditor: { cloudName: "demo" } });
  controls.openEditor.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

describe("rendered article editor", () => {
  it("initializes create mode, derives the slug until touched, and switches locale and Markdown preview", async () => {
    const mounted = await mountEditor();

    expect(mounted.wrapper.get("h1").text()).toBe("Create article");
    expect(mounted.wrapper.get(".editor-status").text()).toBe("New draft");
    expect(inputByLabel(mounted.wrapper, "Author").props("modelValue")).toBe("Writer One");
    expect(mounted.wrapper.get("button[aria-pressed='true']").text()).toBe("PT");

    inputByLabel(mounted.wrapper, "Title").vm.$emit("update:modelValue", "Reliable Vue Tests");
    await flushPromises();
    expect(inputByLabel(mounted.wrapper, "Slug").props("modelValue")).toBe("reliable-vue-tests");
    inputByLabel(mounted.wrapper, "Slug").vm.$emit("update:modelValue", "custom-slug");
    inputByLabel(mounted.wrapper, "Title").vm.$emit("update:modelValue", "Changed title");
    await flushPromises();
    expect(inputByLabel(mounted.wrapper, "Slug").props("modelValue")).toBe("custom-slug");

    await mounted.wrapper.findAll(".article-language-switch__option")[1].trigger("click");
    expect(mounted.wrapper.findAll(".article-language-switch__option")[1].attributes("aria-pressed")).toBe("true");
    await mounted.wrapper.get("textarea[aria-label='Body']").setValue("## Preview heading");
    mounted.wrapper.findComponent({ name: "QBtnToggle" }).vm.$emit("update:modelValue", "preview");
    await flushPromises();
    expect(mounted.wrapper.get(".markdown-editor-preview").text()).toBe("## Preview heading");
  });

  it("loads edit mode with locale, tags, image, and ownership restrictions", async () => {
    const mounted = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });

    expect(mounted.wrapper.get("h1").text()).toBe("Edit article");
    expect(mounted.wrapper.get(".editor-status").text()).toBe("Loaded");
    expect(inputByLabel(mounted.wrapper, "Title").props("modelValue")).toBe("Existing article");
    expect(inputByLabel(mounted.wrapper, "Slug").props("modelValue")).toBe("existing-article");
    expect(mounted.wrapper.findAll(".article-language-switch__option")[1].attributes("aria-pressed")).toBe("true");
    expect(mounted.wrapper.findComponent({ name: "QSelect" }).props("modelValue")).toEqual(["testing"]);
    expect(mounted.wrapper.get(".thumbnail-preview img").attributes()).toMatchObject({
      src: "https://res.cloudinary.com/demo/existing.jpg",
      alt: "Existing cover",
    });

    controls.listArticles.mockReset().mockResolvedValue({ articles: [editableArticle({ authorEntryId: "author-2", writerSubject: "writer-2" })], session: {} });
    const denied = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    expect(denied.wrapper.get(".editor-feedback").text()).toContain("belongs to another author");
    expect(denied.wrapper.find(".editor-form-page").exists()).toBe(true);
    expect(denied.wrapper.find("button[type='submit']").exists()).toBe(false);
  });

  it("renders validation errors and does not save an invalid draft", async () => {
    const mounted = await mountEditor();
    await mounted.wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(mounted.wrapper.text()).toContain("Title is required");
    expect(mounted.wrapper.text()).toContain("Use letters and hyphens only");
    expect(mounted.wrapper.text()).toContain("Description is required");
    expect(mounted.wrapper.text()).toContain("Body is required");
    expect(mounted.wrapper.get(".feedback-error").text()).toBe("Fix the highlighted fields before saving.");
    expect(controls.create).not.toHaveBeenCalled();
    expect(controls.update).not.toHaveBeenCalled();
  });

  it("selects and clears media, synchronizes tags, and creates a missing tag", async () => {
    const mounted = await mountEditor();
    await buttonByText(mounted.wrapper, "Select image").trigger("click");
    await flushPromises();
    const mediaAsset = document.body.querySelector(".media-asset");
    expect(mediaAsset.textContent).toContain("New cover");
    mediaAsset.click();
    await flushPromises();
    expect(mounted.wrapper.get(".thumbnail-preview img").attributes("src")).toBe("https://res.cloudinary.com/demo/new.jpg");
    expect(inputByLabel(mounted.wrapper, "Alt text").props("modelValue")).toBe("New cover");

    controls.openEditor.mockImplementationOnce(async ({ onExport }) => onExport({ secureUrl: "https://res.cloudinary.com/demo/edited.jpg" }));
    await buttonByText(mounted.wrapper, "Edit image").trigger("click");
    await flushPromises();
    expect(controls.openEditor).toHaveBeenCalledWith(expect.objectContaining({ cloudName: "demo", publicId: "articles/new" }));
    expect(mounted.wrapper.get(".thumbnail-preview img").attributes("src")).toBe("https://res.cloudinary.com/demo/edited.jpg");

    const tags = mounted.wrapper.findComponent({ name: "QSelect" });
    tags.vm.$emit("update:modelValue", ["testing", "vue"]);
    await flushPromises();
    const done = vi.fn();
    tags.vm.$emit("newValue", "Quality", done);
    await flushPromises();
    expect(controls.createTag).toHaveBeenCalledWith({ name: "Quality", session: writer });
    expect(done).toHaveBeenCalledWith("quality", "add-unique");

    await buttonByText(mounted.wrapper, "Clear image").trigger("click");
    expect(mounted.wrapper.text()).toContain("No thumbnail selected");
    expect(inputByLabel(mounted.wrapper, "Alt text").props("modelValue")).toBe("New cover");
  });

  it("creates and updates complete drafts, then returns to the dashboard", async () => {
    const created = await mountEditor();
    inputByLabel(created.wrapper, "Title").vm.$emit("update:modelValue", "New article");
    inputByLabel(created.wrapper, "Description").vm.$emit("update:modelValue", "New description");
    await created.wrapper.get("textarea[aria-label='Body']").setValue("New **Markdown** body");
    created.wrapper.findComponent({ name: "QSelect" }).vm.$emit("update:modelValue", ["testing"]);
    await flushPromises();
    await created.wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(controls.create).toHaveBeenCalledWith(expect.objectContaining({
      article: expect.objectContaining({ title: "New article", slug: "new-article", locale: "pt-BR", body: "New **Markdown** body", author: "author-1", tags: ["testing"] }),
      session: writer,
    }));
    expect(created.router.currentRoute.value.path).toBe("/admin");

    const edited = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    inputByLabel(edited.wrapper, "Description").vm.$emit("update:modelValue", "Updated description");
    await edited.wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(controls.update).toHaveBeenCalledWith(expect.objectContaining({ articleId: "article-1", article: expect.objectContaining({ version: 7 }) }));
    expect(edited.router.currentRoute.value.path).toBe("/admin");
  });

  it("guards unsaved navigation and exposes role-specific terminal actions", async () => {
    const mounted = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    inputByLabel(mounted.wrapper, "Description").vm.$emit("update:modelValue", "Unsaved description");
    await flushPromises();
    await mounted.router.push("/admin");
    expect(confirm).toHaveBeenCalledWith("Leave the article editor and discard unsaved changes?");
    expect(mounted.router.currentRoute.value.path).toBe("/admin/articles/article-1/edit");
    expect(buttonByText(mounted.wrapper, "Submit for review")).toBeDefined();
    controls.signingOut = true;
    await mounted.router.push("/admin");
    expect(mounted.router.currentRoute.value.path).toBe("/admin");
    expect(confirm).toHaveBeenCalledTimes(1);

    controls.signingOut = false;
    const review = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    await buttonByText(review.wrapper, "Submit for review").trigger("click");
    await flushPromises();
    expect(controls.review).toHaveBeenCalledWith(expect.objectContaining({ articleId: "article-1", version: 7, session: writer }));

    controls.listArticles.mockReset().mockResolvedValue({ articles: [editableArticle({ status: "published", lifecycleStatus: "published" })], session: {} });
    const published = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    await buttonByText(published.wrapper, "Request unpublication").trigger("click");
    await flushPromises();
    expect(controls.requestUnpublication).toHaveBeenCalledWith(expect.objectContaining({ articleId: "article-1", version: 7, session: writer }));

    controls.session = owner;
    controls.listArticles.mockReset().mockResolvedValue({
      articles: [editableArticle({ author: "Owner One", authorName: "Owner One", authorEntryId: "author-owner", writerSubject: "owner-1", status: "published", lifecycleStatus: "published" })],
      session: {},
    });
    const owned = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    await buttonByText(owned.wrapper, "Unpublish").trigger("click");
    await flushPromises();
    expect(controls.unpublish).toHaveBeenCalledWith(expect.objectContaining({ articleId: "article-1", version: 7, session: owner }));
  });
});
