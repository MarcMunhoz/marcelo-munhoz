import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBrowserState, createRouter, createTestMount, installBrowserPolyfills } from "../harness/index.js";

const controls = vi.hoisted(() => ({
  session: null,
  list: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  archive: vi.fn(),
  unarchive: vi.fn(),
  remove: vi.fn(),
  requestUnpublication: vi.fn(),
}));

vi.mock("../../src/utils/adminAuth.js", () => ({
  getAdminSession: vi.fn(async () => controls.session),
  isOwnerSession: (session) => Boolean(session?.roles?.includes("owner")),
  isWriterSession: (session) => Boolean(session?.roles?.some((role) => role === "writer" || role === "owner")),
}));

vi.mock("../../src/utils/adminApi.js", () => ({
  listAdminArticles: (...args) => controls.list(...args),
  publishArticle: (...args) => controls.publish(...args),
  unpublishArticle: (...args) => controls.unpublish(...args),
  archiveArticle: (...args) => controls.archive(...args),
  unarchiveArticle: (...args) => controls.unarchive(...args),
  deleteArticle: (...args) => controls.remove(...args),
  requestArticleUnpublication: (...args) => controls.requestUnpublication(...args),
  adminUserMessage: (error) => error?.publicMessage || "The admin request could not be completed.",
}));

import Admin from "../../src/pages/Admin.vue";

const writerSession = {
  subject: "writer-1",
  authorEntryId: "author-1",
  name: "Writer One",
  roles: ["writer"],
  preview: true,
};
const ownerSession = { subject: "owner-1", name: "Owner One", roles: ["owner"], preview: true };

const article = ({ id, title, status, author = "Writer One", authorEntryId = "author-1", tags = ["testing"], createAt = "2026-08-20" }) => ({
  id,
  title,
  slug: title.toLowerCase().replace(/\s+/g, "-"),
  description: `${title} description`,
  body: `${title} body`,
  status,
  lifecycleStatus: status === "review" ? "draft" : status === "unpublicationRequested" ? "published" : status,
  author,
  authorName: author,
  authorEntryId,
  writerSubject: authorEntryId === "author-1" ? "writer-1" : "writer-2",
  tags,
  createAt,
  version: 3,
});

const fixtures = [
  article({ id: "draft-1", title: "Testing draft", status: "draft" }),
  article({ id: "published-1", title: "Published Vue", status: "published", tags: ["vue"], createAt: "2026-07-10" }),
  article({ id: "review-1", title: "Review queue", status: "review", author: "Writer Two", authorEntryId: "author-2" }),
  article({ id: "take-down-1", title: "Take down", status: "unpublicationRequested", author: "Writer Two", authorEntryId: "author-2" }),
  article({ id: "archived-1", title: "Archived article", status: "archived", author: "Owner One", authorEntryId: "owner-author" }),
];

const dashboardPayload = (articles = fixtures) => ({ articles, reviewRequests: [], session: {} });
const cleanups = [];

const mountAdmin = async ({ media = {}, settle = true } = {}) => {
  const restoreBrowser = installBrowserPolyfills(createBrowserState({ media }));
  const Page = { template: "<main>Page</main>" };
  const router = createRouter({
    initialPath: "/admin",
    routes: [
      { path: "/", component: Page },
      { path: "/admin", component: Admin },
      { path: "/admin/articles/new", component: Page },
      { path: "/admin/articles/:slug/edit", component: Page },
      { path: "/admin/tags", component: Page },
    ],
  });
  await router.isReady();
  const wrapper = createTestMount({ router })(Admin, {
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

const inputBy = (wrapper, prop, value) =>
  wrapper.findAllComponents({ name: "QInput" }).find((input) => input.props(prop) === value);

beforeEach(() => {
  controls.session = writerSession;
  controls.list.mockReset().mockResolvedValue(dashboardPayload());
  for (const action of [controls.publish, controls.unpublish, controls.archive, controls.unarchive, controls.remove, controls.requestUnpublication]) {
    action.mockReset().mockResolvedValue({});
  }
});

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

describe("rendered admin dashboard", () => {
  it("redirects signed-out visitors and renders the blocked administrative surface", async () => {
    controls.session = null;
    const mounted = await mountAdmin();

    expect(mounted.router.currentRoute.value.path).toBe("/");
    expect(mounted.wrapper.get(".admin-blocked").text()).toContain("Writer access required");
    expect(mounted.wrapper.find(".status-grid").exists()).toBe(false);
    expect(controls.list).not.toHaveBeenCalled();
  });

  it("renders writer summaries, filters real rows, and exposes only writer navigation", async () => {
    const mounted = await mountAdmin();
    const table = () => mounted.wrapper.findComponent({ name: "QTable" });

    expect(mounted.wrapper.get(".status-grid").text()).toContain("Published1");
    expect(mounted.wrapper.get(".status-grid").text()).toContain("Drafts2");
    expect(mounted.wrapper.get(".status-grid").text()).toContain("In review1");
    expect(table().props("rows")).toHaveLength(5);
    expect(mounted.wrapper.find(".owner-review-panel").exists()).toBe(false);
    expect(mounted.wrapper.findAllComponents({ name: "QBtn" }).some((button) => button.text() === "Tags")).toBe(false);

    inputBy(mounted.wrapper, "label", "Tag").vm.$emit("update:modelValue", "vue");
    await flushPromises();
    expect(table().props("rows").map((row) => row.title)).toEqual(["Published Vue"]);

    inputBy(mounted.wrapper, "label", "Tag").vm.$emit("update:modelValue", "");
    inputBy(mounted.wrapper, "label", "Author").vm.$emit("update:modelValue", "writer two");
    await flushPromises();
    expect(table().props("rows").map((row) => row.title)).toEqual(["Review queue", "Take down"]);

    await mounted.wrapper.findAll("button").find((button) => button.text().includes("New article")).trigger("click");
    await flushPromises();
    expect(mounted.router.currentRoute.value.path).toBe("/admin/articles/new");
  });

  it("renders owner queues and completes an authorized publication action with feedback", async () => {
    controls.session = ownerSession;
    const mounted = await mountAdmin();

    expect(mounted.wrapper.get('a[href="/admin/tags"]').text()).toContain("Tags");
    expect(mounted.wrapper.get(".owner-review-panel").text()).toContain("3 pending");
    expect(mounted.wrapper.get(".owner-review-panel").text()).toContain("Testing draft");
    expect(mounted.wrapper.get(".owner-review-panel").text()).toContain("Review queue");
    expect(mounted.wrapper.get(".owner-review-panel").text()).toContain("Take down");

    const publish = mounted.wrapper
      .get(".owner-review-panel")
      .findAll("button")
      .find((button) => button.text().includes("Publish"));
    await publish.trigger("click");
    await flushPromises();

    expect(controls.publish).toHaveBeenCalledWith(expect.objectContaining({ articleId: "draft-1", version: 3, session: ownerSession }));
    expect(controls.list).toHaveBeenCalledTimes(2);
    expect(mounted.wrapper.get(".feedback-success").text()).toBe("Article published.");
  });

  it("shows loading, empty, and failure states without stale rows", async () => {
    let resolveDashboard;
    controls.list.mockReturnValueOnce(new Promise((resolve) => {
      resolveDashboard = resolve;
    }));
    const mounted = await mountAdmin({ settle: false });
    await flushPromises();

    expect(mounted.wrapper.findComponent({ name: "QTable" }).props("loading")).toBe(true);
    resolveDashboard(dashboardPayload([]));
    await flushPromises();
    expect(mounted.wrapper.findComponent({ name: "QTable" }).props("rows")).toEqual([]);
    expect(mounted.wrapper.text()).toContain("No articles match the current filters");

    mounted.wrapper.unmount();
    controls.list.mockReset().mockRejectedValueOnce({ publicMessage: "Dashboard unavailable." });
    const failed = await mountAdmin();
    expect(failed.wrapper.get(".dashboard-feedback").text()).toBe("Dashboard unavailable.");
    expect(failed.wrapper.findComponent({ name: "QTable" }).props("rows")).toEqual([]);
  });

  it("switches the article table to rendered cards on compact viewports", async () => {
    const mounted = await mountAdmin({ media: { "(max-width: 720px)": true } });

    expect(mounted.wrapper.findComponent({ name: "QTable" }).props("grid")).toBe(true);
    expect(mounted.wrapper.findAllComponents({ name: "AdminArticleCard" })).toHaveLength(5);
    expect(mounted.wrapper.get(".admin-article-card").text()).toContain("Testing draft");
    expect(mounted.wrapper.get(".admin-article-card__metadata").text()).toContain("Writer One");
    expect(mounted.wrapper.text()).toContain("Edit");
    expect(mounted.wrapper.text()).toContain("Review");
    expect(mounted.wrapper.text()).toContain("Request unpublication");
    expect(mounted.wrapper.text()).not.toContain("Delete permanently");
  });
});
