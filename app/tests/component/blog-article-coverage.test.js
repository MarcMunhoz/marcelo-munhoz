import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import BlogArticle from "../../src/components/BlogArticle.vue";
import { createBrowserState, createRouter, createTestMount, installBrowserPolyfills } from "../harness/index.js";

const response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const payload = (slug) => ({
  sys: { id: slug, createdAt: "2026-08-20T12:00:00.000Z" },
  metadata: { tags: [{ sys: { id: "article-lang-en-us" } }, { sys: { id: "testing" } }] },
  fields: {
    title: `Article ${slug}`,
    slug,
    description: `Description ${slug}`,
    body: `Body ${slug}`,
    createAt: "2026-08-20T12:00:00.000Z",
    author: { fields: { name: "Ada Lovelace", slug: "ada-lovelace" } },
  },
});

const cleanups = [];

const mountArticle = async ({ initialPath = "/blog/first", fetchImpl }) => {
  const restoreBrowser = installBrowserPolyfills(createBrowserState({ fetch: fetchImpl }));
  const router = createRouter({
    initialPath,
    routes: [
      { path: "/blog", name: "Meus Artigos", component: { template: "<main>Archive</main>" } },
      { path: "/blog/:slug", name: "Artigo", component: BlogArticle },
      { path: "/blog/authors/:slug", name: "Author", component: { template: "<main>Author</main>" } },
    ],
  });
  await router.isReady();
  const wrapper = createTestMount({ router })(BlogArticle, {
    attachTo: document.body,
    global: { stubs: { QPage: { template: "<main><slot /></main>" } } },
  });
  await flushPromises();
  cleanups.push(() => {
    wrapper.unmount();
    restoreBrowser();
  });
  return { router, wrapper };
};

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

describe("blog article recovery paths", () => {
  it("catches omission of article refresh when the route slug changes", async () => {
    const mounted = await mountArticle({
      fetchImpl: (url) => Promise.resolve(String(url).includes("article-navigation") ? response({ previous: null, next: null }) : response(payload(String(url).split("/").pop()))),
    });

    expect(mounted.wrapper.text()).toContain("Description first");
    await mounted.router.push("/blog/second");
    await flushPromises();
    expect(mounted.wrapper.text()).toContain("Description second");
  });

  it("catches a failed article request leaving stale content visible", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const mounted = await mountArticle({ initialPath: "/blog/missing", fetchImpl: () => Promise.resolve(response({ error: "missing" }, 404)) });

    expect(mounted.wrapper.find(".article-content").classes()).toContain("hidden");
    expect(mounted.wrapper.find(".article-navigation").exists()).toBe(false);
    expect(error).toHaveBeenCalledOnce();
  });

  it("catches retained neighbor links when the navigation endpoint fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const mounted = await mountArticle({
      fetchImpl: (url) => Promise.resolve(String(url).includes("article-navigation") ? response({ error: "unavailable" }, 503) : response(payload("first"))),
    });

    expect(mounted.wrapper.text()).toContain("Description first");
    expect(mounted.wrapper.find(".article-navigation").exists()).toBe(false);
    expect(error).toHaveBeenCalledOnce();
  });

  it("catches removal of rendered article relationships, metadata, and sharing controls", async () => {
    const decorated = payload("first");
    decorated.fields.updatedAt = "2026-08-21T12:00:00.000Z";
    decorated.fields.alt = "Accessible cover";
    decorated.fields.thumbnail = { secure_url: "https://images.example.test/cover.jpg" };
    const mounted = await mountArticle({
      fetchImpl: (url) => Promise.resolve(
        String(url).includes("article-navigation")
          ? response({ previous: { title: "Earlier", slug: "earlier" }, next: { title: "Later", slug: "later" } })
          : response(decorated)
      ),
    });

    expect(mounted.wrapper.get(".article-content img").attributes()).toMatchObject({
      src: "https://images.example.test/cover.jpg",
      alt: "Accessible cover",
    });
    expect(mounted.wrapper.get(".author-link").attributes("href")).toBe("/blog/authors/ada-lovelace");
    expect(mounted.wrapper.text()).toContain("Atualizado em 21 de agosto de 2026");
    expect(mounted.wrapper.findAll(".article-neighbor")).toHaveLength(2);
    expect(mounted.wrapper.text()).toContain("Earlier");
    expect(mounted.wrapper.text()).toContain("Later");
    await mounted.wrapper.get(".q-btn").trigger("click");
    await flushPromises();
    expect(document.body.querySelector(".social-share")).not.toBeNull();
  });

  it("keeps the newest article and navigation when older requests resolve late", async () => {
    let resolveFirstArticle;
    let resolveFirstNavigation;
    const firstArticle = new Promise((resolve) => { resolveFirstArticle = resolve; });
    const firstNavigation = new Promise((resolve) => { resolveFirstNavigation = resolve; });
    const mounted = await mountArticle({
      fetchImpl: (url) => {
        const endpoint = String(url);
        if (endpoint.includes("article-navigation/first")) return firstNavigation;
        if (endpoint.includes("article-navigation/second")) return Promise.resolve(response({ previous: null, next: { title: "Newest", slug: "newest" } }));
        if (endpoint.endsWith("/first")) return firstArticle;
        return Promise.resolve(response(payload("second")));
      },
    });

    await mounted.router.push("/blog/second");
    await flushPromises();
    resolveFirstArticle(response(payload("first")));
    await flushPromises();
    resolveFirstNavigation(response({ previous: { title: "Old", slug: "old" }, next: null }));
    await flushPromises();

    expect(mounted.wrapper.text()).toContain("Description second");
    expect(mounted.wrapper.text()).toContain("Newest");
    expect(mounted.wrapper.text()).not.toContain("Old");
  });
});
