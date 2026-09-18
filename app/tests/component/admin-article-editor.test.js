import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserState, createRouter, createTestMount, installBrowserPolyfills } from "../harness/index.js";
import markdownFixture from "../fixtures/article-markdown-regression.json";

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
  loadPicker: vi.fn(),
}));

vi.mock("../../src/utils/emojiPicker.js", () => ({ createEmojiPicker: (...args) => controls.loadPicker(...args) }));

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
  controls.loadPicker.mockReset().mockImplementation(async (host) => {
    const picker = document.createElement("div");
    picker.dataset.testPicker = "true";
    picker.attachShadow({ mode: "open" }).appendChild(document.createElement("input"));
    host.appendChild(picker);
    return picker;
  });
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

describe("rendered article editor", () => {
  it.each([[3, 3], [3, 11]])("inserts emoji at saved selection %s:%s, restores focus and guards dirty navigation", async (start, end) => {
    const mounted = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    const textarea = mounted.wrapper.get("textarea[aria-label='Body']");
    const original = textarea.element.value;
    textarea.element.focus();
    textarea.element.setSelectionRange(start, end);
    const trigger = mounted.wrapper.get("button[aria-label='Insert emoji']");
    await trigger.trigger("click");
    await flushPromises();
    const picker = mounted.wrapper.get("[data-test-picker]");
    expect(picker.element.shadowRoot.activeElement).toBe(picker.element.shadowRoot.querySelector("input"));
    textarea.element.setSelectionRange(0, 0);
    picker.element.dispatchEvent(new CustomEvent("emoji-click", { detail: { unicode: "👩🏽‍💻" } }));
    await flushPromises();
    expect(textarea.element.value).toBe(original.slice(0, start) + "👩🏽‍💻" + original.slice(end));
    expect(document.activeElement).toBe(textarea.element);
    expect(textarea.element.selectionStart).toBe(start + 7);
    expect(textarea.element.selectionEnd).toBe(start + 7);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    await mounted.router.push("/admin");
    expect(confirm).toHaveBeenCalled();
  });

  it("inserts at a selection moved while the floating picker remains open", async () => {
    const { wrapper } = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    const textarea = wrapper.get("textarea[aria-label='Body']");
    const original = textarea.element.value;
    textarea.element.setSelectionRange(2, 2);
    await wrapper.get("button[aria-label='Insert emoji']").trigger("click");
    await flushPromises();

    const movedCaret = original.length - 2;
    textarea.element.focus();
    textarea.element.setSelectionRange(movedCaret, movedCaret);
    await textarea.trigger("select");
    wrapper.get("[data-test-picker]").element.dispatchEvent(new CustomEvent("emoji-click", { detail: { unicode: "🌻" } }));
    await flushPromises();

    expect(textarea.element.value).toBe(`${original.slice(0, movedCaret)}🌻${original.slice(movedCaret)}`);
    expect(textarea.element.selectionStart).toBe(movedCaret + 2);
  });

  it("moves the floating picker by its handle and keeps it inside the body editor", async () => {
    window.happyDOM.setWindowSize({ width: 1280, height: 800 });
    const { wrapper } = await mountEditor();
    await wrapper.get("button[aria-label='Insert emoji']").trigger("click");
    await flushPromises();
    const editor = wrapper.get(".markdown-editor");
    const panel = wrapper.get(".emoji-picker-panel");
    editor.element.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    panel.element.getBoundingClientRect = () => ({ left: 432, top: 80, right: 792, bottom: 480, width: 360, height: 400 });

    await wrapper.get("button[aria-label='Move emoji picker']").trigger("pointerdown", { clientX: 450, clientY: 100, pointerId: 1 });
    window.dispatchEvent(Object.assign(new Event("pointermove"), { clientX: 1000, clientY: 900, pointerId: 1 }));
    window.dispatchEvent(Object.assign(new Event("pointerup"), { pointerId: 1 }));
    await flushPromises();

    expect(panel.attributes("style")).toContain("left: 432px");
    expect(panel.attributes("style")).toContain("top: 192px");
  });

  it("moves the floating picker from its focused handle with arrow keys", async () => {
    window.happyDOM.setWindowSize({ width: 1280, height: 800 });
    const { wrapper } = await mountEditor();
    await wrapper.get("button[aria-label='Insert emoji']").trigger("click");
    await flushPromises();
    const editor = wrapper.get(".markdown-editor");
    const panel = wrapper.get(".emoji-picker-panel");
    editor.element.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    panel.element.getBoundingClientRect = () => ({ left: 400, top: 80, right: 760, bottom: 480, width: 360, height: 400 });

    const handle = wrapper.get("button[aria-label='Move emoji picker']");
    await handle.trigger("keydown", { key: "ArrowLeft" });
    await handle.trigger("keydown", { key: "ArrowDown" });

    expect(panel.attributes("style")).toContain("left: 384px");
    expect(panel.attributes("style")).toContain("top: 96px");
  });

  it("resets a dragged position and disables movement when the viewport becomes compact", async () => {
    window.happyDOM.setWindowSize({ width: 1280, height: 800 });
    const { wrapper } = await mountEditor();
    await wrapper.get("button[aria-label='Insert emoji']").trigger("click");
    await flushPromises();
    const editor = wrapper.get(".markdown-editor");
    const panel = wrapper.get(".emoji-picker-panel");
    editor.element.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 });
    panel.element.getBoundingClientRect = () => ({ left: 432, top: 80, right: 792, bottom: 480, width: 360, height: 400 });
    const handle = wrapper.get("button[aria-label='Move emoji picker']");
    await handle.trigger("keydown", { key: "ArrowLeft" });
    expect(panel.attributes("style")).toContain("left: 416px");

    window.happyDOM.setWindowSize({ width: 600, height: 800 });
    window.dispatchEvent(new Event("resize"));
    await flushPromises();

    expect(panel.attributes("style")).toBeUndefined();
    expect(handle.attributes("disabled")).toBeDefined();
  });

  it("dismisses by Escape or close without changing source and disables emoji in preview", async () => {
    const { wrapper, router } = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    const trigger = wrapper.get("button[aria-label='Insert emoji']");
    await trigger.trigger("click");
    await flushPromises();
    await wrapper.get(".emoji-picker-panel").trigger("keydown", { key: "Escape" });
    expect(document.activeElement).toBe(trigger.element);
    await trigger.trigger("click");
    await flushPromises();
    await wrapper.get("button[aria-label='Close emoji picker']").trigger("click");
    expect(wrapper.find(".emoji-picker-panel").exists()).toBe(false);
    wrapper.findComponent({ name: "QBtnToggle" }).vm.$emit("update:modelValue", "preview");
    await flushPromises();
    expect(trigger.attributes("disabled")).toBeDefined();
    const confirm = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    await router.push("/admin");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("keeps typing available after picker failure and ignores a load completed after dismissal", async () => {
    controls.loadPicker.mockRejectedValueOnce(new Error("Unavailable"));
    const { wrapper } = await mountEditor();
    const trigger = wrapper.get("button[aria-label='Insert emoji']");
    await trigger.trigger("click");
    await flushPromises();
    expect(wrapper.get(".emoji-picker-panel [role='alert']").text()).toContain("unavailable");
    await wrapper.get("button[aria-label='Close emoji picker']").trigger("click");
    let resolve;
    controls.loadPicker.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    await trigger.trigger("click");
    const close = wrapper.get("button[aria-label='Close emoji picker']");
    expect(document.activeElement).toBe(close.element);
    await close.trigger("keydown", { key: "Escape" });
    resolve(document.createElement("div"));
    await flushPromises();
    expect(wrapper.find(".emoji-picker-panel").exists()).toBe(false);
    await wrapper.get("textarea[aria-label='Body']").setValue("Still editable 🌻");
    expect(wrapper.get("textarea[aria-label='Body']").element.value).toBe("Still editable 🌻");
  });

  it("does not steal focus when delayed initialization finishes while the author types", async () => {
    let complete;
    controls.loadPicker.mockImplementationOnce((host) => new Promise((resolve) => {
      complete = () => {
        const picker = document.createElement("div");
        picker.attachShadow({ mode: "open" }).appendChild(document.createElement("input"));
        host.appendChild(picker);
        resolve(picker);
      };
    }));
    const { wrapper } = await mountEditor();
    await wrapper.get("button[aria-label='Insert emoji']").trigger("click");
    const textarea = wrapper.get("textarea[aria-label='Body']");
    textarea.element.focus();
    complete();
    await flushPromises();
    expect(document.activeElement).toBe(textarea.element);
  });
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
    expect(mounted.wrapper.get(".markdown-editor-preview h2").text()).toBe("Preview heading");
  });

  it("previews the public presentation safely and preserves source selection across mode changes", async () => {
    const mounted = await mountEditor();
    const textarea = mounted.wrapper.get("textarea[aria-label='Body']");
    await textarea.setValue(markdownFixture.markdown);
    textarea.element.focus();
    textarea.element.setSelectionRange(5, 20);

    expect(mounted.wrapper.find(".markdown-editor-preview").exists()).toBe(false);
    expect(mounted.wrapper.find(".article-video iframe").exists()).toBe(false);

    mounted.wrapper.findComponent({ name: "QBtnToggle" }).vm.$emit("update:modelValue", "preview");
    await flushPromises();
    const preview = mounted.wrapper.get(".markdown-editor-preview");
    const player = preview.get(".article-video iframe");

    expect(preview.get("h2").text()).toBe("Safe formatting");
    expect(preview.get("em").text()).toBe("boring");
    expect(preview.text()).toContain(markdownFixture.existingEmoji);
    expect(preview.find("script").exists()).toBe(false);
    expect(preview.find("[onerror]").exists()).toBe(false);
    expect(preview.find("a[href^='javascript:']").exists()).toBe(false);
    expect(player.attributes("src")).toBe(markdownFixture.expectedVideoUrl);
    expect(preview.classes()).toContain("article-markdown-preview");

    mounted.wrapper.findComponent({ name: "QBtnToggle" }).vm.$emit("update:modelValue", "editor");
    await flushPromises();
    expect(mounted.wrapper.find(".markdown-editor-preview").exists()).toBe(false);
    expect(mounted.wrapper.find(".article-video iframe").exists()).toBe(false);
    expect(textarea.element.value).toBe(markdownFixture.markdown);
    expect(textarea.element.selectionStart).toBe(5);
    expect(textarea.element.selectionEnd).toBe(20);
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

  it("handles media and tag edge cases without persisting incomplete editor state", async () => {
    const mounted = await mountEditor();
    const tags = mounted.wrapper.findComponent({ name: "QSelect" });
    const existingDone = vi.fn();
    const emptyDone = vi.fn();

    tags.vm.$emit("newValue", "Testing", existingDone);
    tags.vm.$emit("newValue", "   ", emptyDone);
    await flushPromises();
    expect(existingDone).toHaveBeenCalledWith("testing", "add-unique");
    expect(emptyDone).toHaveBeenCalledWith();
    expect(controls.createTag).not.toHaveBeenCalled();

    expect(buttonByText(mounted.wrapper, "Edit image").attributes("disabled")).toBeDefined();
    expect(controls.editorConfig).not.toHaveBeenCalled();

    controls.listMedia.mockRejectedValueOnce({ publicMessage: "Media library is unavailable." });
    await buttonByText(mounted.wrapper, "Select image").trigger("click");
    await flushPromises();
    expect(mounted.wrapper.get(".feedback-error").text()).toBe("Media library is unavailable.");
  });

  it("keeps the editor usable when its loading requests return no usable data", async () => {
    controls.listTags.mockRejectedValueOnce({ publicMessage: "Tags failed." });
    const tagFailure = await mountEditor();
    expect(tagFailure.wrapper.get(".editor-feedback").text()).toBe("Tags failed.");

    controls.profile.mockRejectedValueOnce({ publicMessage: "Author profile failed." });
    const profileFailure = await mountEditor();
    expect(profileFailure.wrapper.get(".editor-feedback").text()).toBe("Author profile failed.");
    expect(inputByLabel(profileFailure.wrapper, "Author").props("modelValue")).toBe("Writer One");

    controls.listArticles.mockResolvedValueOnce({ articles: [], session: {} });
    const missing = await mountEditor({ initialPath: "/admin/articles/missing/edit" });
    expect(missing.wrapper.get(".editor-feedback").text()).toContain("Article not found");

    controls.listArticles.mockRejectedValueOnce({ publicMessage: "Article list failed." });
    const failed = await mountEditor({ initialPath: "/admin/articles/article-1/edit" });
    expect(failed.wrapper.get(".editor-feedback").text()).toBe("Article list failed.");
  });

  it("uploads a selected file through its injected reader and reports a rejected upload", async () => {
    const mounted = await mountEditor();
    const page = mounted.wrapper.findComponent(AdminArticleEditor).vm;
    const file = { name: "cover.png" };
    page.readFileAsDataUrl = vi.fn().mockResolvedValue("data:image/png;base64,Y292ZXI=");

    await page.handleMediaFile(file);
    await flushPromises();
    expect(controls.upload).toHaveBeenCalledWith({ file: "data:image/png;base64,Y292ZXI=", filename: "cover.png", session: writer });
    expect(mounted.wrapper.get(".thumbnail-preview img").attributes("src")).toBe("https://res.cloudinary.com/demo/upload.jpg");

    controls.upload.mockRejectedValueOnce({ publicMessage: "Upload rejected." });
    await page.handleMediaFile(file);
    await flushPromises();
    expect(mounted.wrapper.get(".feedback-error").text()).toBe("Upload rejected.");
  });

});
