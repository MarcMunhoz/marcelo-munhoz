import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import Blog from "../../src/pages/Blog.vue";
import { createBrowserState, createClock, createRouter, createTestMount, installBrowserPolyfills } from "../harness/index.js";

const article = ({ id, slug, title, tags = [] }) => ({
  sys: { id, createdAt: "2026-08-20T12:00:00.000Z" },
  fields: {
    title,
    slug,
    description: `${title} description`,
    createAt: "2026-08-20T12:00:00.000Z",
    alt: `${title} cover`,
    author: { fields: { name: "Marcelo Munhoz" } },
  },
  metadata: { tags: tags.map((tag) => ({ sys: { id: tag } })) },
});

const featuredArticle = article({ id: "featured", slug: "featured-article", title: "Featured article" });
const archiveArticle = article({ id: "archive", slug: "archive-article", title: "Archive article", tags: ["testing"] });

const indexPayload = (overrides = {}) => ({
  featured: [featuredArticle],
  items: [archiveArticle],
  total: 14,
  page: 1,
  pageSize: 12,
  totalPages: 2,
  ...overrides,
});

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });

const endpointResponse = (url, archivePayload = indexPayload()) => {
  const path = new URL(String(url), "http://localhost").pathname;
  if (path.endsWith("/blog-years")) return jsonResponse({ years: ["2026", "2025"] });
  if (path.endsWith("/tags")) return jsonResponse({ items: [{ sys: { id: "testing" }, name: "Testing" }] });
  return jsonResponse(archivePayload);
};

const cleanups = [];

const mountBlog = async ({ fetchImpl, initialPath = "/blog", media = {} } = {}) => {
  const browser = createBrowserState({ fetch: fetchImpl ?? ((url) => Promise.resolve(endpointResponse(url))), media });
  const restoreBrowser = installBrowserPolyfills(browser);
  const router = createRouter({
    initialPath,
    routes: [
      { path: "/blog", name: "Meus Artigos", component: Blog },
      { path: "/blog/:slug", name: "Artigo", component: { template: "<main>Article</main>" } },
    ],
  });
  await router.isReady();
  const wrapper = createTestMount({ router })(Blog, {
    global: { stubs: { QPage: { template: "<main><slot /></main>" } } },
  });
  await flushPromises();

  const mounted = {
    browser,
    router,
    wrapper,
    cleanup() {
      wrapper.unmount();
      restoreBrowser();
    },
  };
  cleanups.push(mounted.cleanup);
  return mounted;
};

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Blog archive", () => {
  it("renders featured and archive articles with metadata and preserves the archive URL in links", async () => {
    const mounted = await mountBlog({
      initialPath: "/blog?page=2&tag=testing",
      fetchImpl: (url) => Promise.resolve(endpointResponse(url, indexPayload({ page: 2 }))),
    });

    expect(mounted.wrapper.get(".blog-highlights").text()).toContain("Featured article");
    expect(mounted.wrapper.get(".blog-archive-list").text()).toContain("Archive article");
    expect(mounted.wrapper.get(".blog-archive-list").text()).toContain("Marcelo Munhoz");
    expect(mounted.wrapper.get(".blog-archive-list").text()).toContain("#testing");
    expect(mounted.wrapper.get(".blog-highlight__image").attributes("alt")).toBe("Featured article cover");
    expect(mounted.wrapper.get(".blog-archive-row__image").attributes()).toMatchObject({
      alt: "Archive article cover",
      loading: "lazy",
      decoding: "async",
    });
    const links = mounted.wrapper.findAllComponents({ name: "RouterLink" });
    expect(links[0].props("to")).toEqual({
      name: "Artigo",
      params: { slug: "featured-article" },
      state: { blogReturnTo: "/blog?page=2&tag=testing" },
    });
    expect(links[1].props("to")).toEqual({
      name: "Artigo",
      params: { slug: "archive-article" },
      state: { blogReturnTo: "/blog?page=2&tag=testing" },
    });
  });

  it("canonicalizes URL state and reloads from search, year, tag, and pagination controls", async () => {
    const clock = createClock();
    clock.install();
    const requested = [];
    const mounted = await mountBlog({
      initialPath: "/blog?page=999999999999999999999&q=%20vue%20%20tests%20&year=1800&tag=bad%20tag",
      fetchImpl: async (url) => {
        requested.push(String(url));
        const requestedPage = Number(new URL(String(url), "http://localhost").searchParams.get("page") || 1);
        return endpointResponse(url, indexPayload({ page: requestedPage }));
      },
    });

    expect(mounted.router.currentRoute.value.fullPath).toBe("/blog?q=vue+tests");

    const controls = mounted.wrapper.get(".blog-controls");
    controls.findComponent({ name: "QInput" }).vm.$emit("update:modelValue", "coverage");
    clock.advanceBy(299);
    expect(mounted.router.currentRoute.value.query.q).toBe("vue tests");
    clock.advanceBy(1);
    await flushPromises();
    expect(mounted.router.currentRoute.value.fullPath).toBe("/blog?q=coverage");

    const selects = controls.findAllComponents({ name: "QSelect" });
    selects[0].vm.$emit("update:modelValue", "2026");
    await flushPromises();
    selects[1].vm.$emit("update:modelValue", "testing");
    await flushPromises();
    expect(mounted.router.currentRoute.value.fullPath).toBe("/blog?q=coverage&year=2026&tag=testing");

    await mounted.wrapper.findComponent({ name: "QPagination" }).setValue(2);
    await flushPromises();
    expect(mounted.router.currentRoute.value.fullPath).toBe("/blog?page=2&q=coverage&year=2026&tag=testing");
    expect(requested.some((url) => url.includes("blog-index?page=2&q=coverage&year=2026&tag=testing"))).toBe(true);

    clock.restore();
  });

  it("announces loading and then renders the empty archive state", async () => {
    let resolveArchive;
    const archiveResponse = new Promise((resolve) => {
      resolveArchive = resolve;
    });
    const mounted = await mountBlog({
      fetchImpl: (url) =>
        String(url).includes("blog-index") ? archiveResponse : Promise.resolve(endpointResponse(url)),
    });

    expect(mounted.wrapper.get(".blog-state[role='status']").text()).toContain("Loading articles");

    resolveArchive(jsonResponse(indexPayload({ featured: [], items: [], total: 0, totalPages: 1 })));
    await flushPromises();
    expect(mounted.wrapper.get(".blog-state").text()).toBe("No articles match these filters.");
    expect(mounted.wrapper.find(".blog-highlights").exists()).toBe(false);
    expect(mounted.wrapper.find(".blog-pagination").exists()).toBe(false);

  });

  it("shows a failure alert and retries the archive request", async () => {
    let archiveAttempts = 0;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const mounted = await mountBlog({
      fetchImpl: async (url) => {
        if (!String(url).includes("blog-index")) return endpointResponse(url);
        archiveAttempts += 1;
        return archiveAttempts === 1 ? jsonResponse({ error: "unavailable" }, 503) : jsonResponse(indexPayload());
      },
    });

    expect(mounted.wrapper.get("[role='alert']").text()).toContain("We could not load the article archive.");
    const retry = mounted.wrapper.findAllComponents({ name: "QBtn" }).find((button) => button.text().includes("Try again"));
    await retry.trigger("click");
    await flushPromises();

    expect(archiveAttempts).toBe(2);
    expect(mounted.wrapper.find("[role='alert']").exists()).toBe(false);
    expect(mounted.wrapper.get(".blog-archive-list").text()).toContain("Archive article");
    expect(error).toHaveBeenCalledTimes(1);

  });

  it("switches to bounded previous, input, and next controls on compact viewports", async () => {
    const mounted = await mountBlog({
      initialPath: "/blog?page=2",
      media: { "(max-width: 599px)": true },
      fetchImpl: (url) => {
        const requestedPage = Number(new URL(String(url), "http://localhost").searchParams.get("page") || 1);
        return Promise.resolve(endpointResponse(url, indexPayload({ page: requestedPage, total: 36, totalPages: 3 })));
      },
    });

    expect(mounted.wrapper.findComponent({ name: "QPagination" }).exists()).toBe(false);
    expect(mounted.wrapper.get(".blog-pagination__status").text()).toBe("Page 2 of 3");
    const previous = mounted.wrapper.findAllComponents({ name: "QBtn" }).find((button) => button.attributes("aria-label") === "Previous page");
    const next = mounted.wrapper.findAllComponents({ name: "QBtn" }).find((button) => button.attributes("aria-label") === "Next page");
    expect(previous.attributes("disabled")).toBeUndefined();
    expect(next.attributes("disabled")).toBeUndefined();

    const pageInput = mounted.wrapper.findAllComponents({ name: "QInput" }).find((input) => input.props("label") === "Page");
    pageInput.vm.$emit("change", { target: { value: "99" } });
    await flushPromises();
    expect(mounted.router.currentRoute.value.fullPath).toBe("/blog?page=3");

  });
});
