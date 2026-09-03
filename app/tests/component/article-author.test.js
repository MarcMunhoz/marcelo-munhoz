import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import BlogArticle from "../../src/components/BlogArticle.vue";
import AuthorProfile from "../../src/pages/AuthorProfile.vue";
import { createBrowserState, createRouter, createTestMount, installBrowserPolyfills } from "../harness/index.js";

const author = {
  sys: { id: "author-1" },
  fields: {
    name: "Marcelo Munhoz",
    slug: "marcelo-munhoz",
    biography: "I write about software testing.",
  },
};

const article = (overrides = {}) => ({
  sys: { id: "article-1", createdAt: "2026-08-20T12:00:00.000Z" },
  metadata: {
    tags: [
      { sys: { id: "article-lang-en-us" } },
      { sys: { id: "testing" } },
    ],
  },
  fields: {
    title: "Testing the boundaries",
    slug: "testing-the-boundaries",
    description: "A practical article about reliable software.",
    body: "## A heading\n\n<script>alert('unsafe')</script>\n\n![diagram](https://images.example.test/diagram.png)",
    locale: "en-US",
    createAt: "2026-08-20T12:00:00.000Z",
    updatedAt: "2026-08-22T12:00:00.000Z",
    alt: "Testing diagram",
    thumbnail: { secure_url: "http://images.example.test/article.jpg" },
    author,
    ...overrides,
  },
});

const authorArticle = (index) => ({
  sys: { id: `author-article-${index}` },
  fields: {
    title: `Author article ${index}`,
    slug: `author-article-${index}`,
    description: `Description ${index}`,
    body: "one two three four five",
  },
});

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });

const cleanups = [];
const pageOptions = {
  attachTo: document.body,
  global: { stubs: { QPage: { template: "<main><slot /></main>" } } },
};

const mountWithBrowser = async ({ component, fetchImpl, initialPath, routes, historyState = {} }) => {
  const restoreBrowser = installBrowserPolyfills(createBrowserState({ fetch: fetchImpl }));
  history.replaceState(historyState, "", initialPath);
  const router = createRouter({ initialPath, routes });
  await router.isReady();
  const wrapper = createTestMount({ router })(component, pageOptions);
  await flushPromises();

  const cleanup = () => {
    wrapper.unmount();
    restoreBrowser();
  };
  cleanups.push(cleanup);
  return { router, wrapper };
};

const mountArticle = ({ articlePayload = article(), navigation = { previous: null, next: null }, historyState } = {}) =>
  mountWithBrowser({
    component: BlogArticle,
    initialPath: `/blog/${articlePayload.fields.slug}`,
    historyState,
    routes: [
      { path: "/blog", name: "Meus Artigos", component: { template: "<main>Archive</main>" } },
      { path: "/blog/:slug", name: "Artigo", component: BlogArticle },
      { path: "/blog/authors/:slug", name: "Author", component: AuthorProfile },
    ],
    fetchImpl: (url) =>
      Promise.resolve(String(url).includes("article-navigation") ? jsonResponse(navigation) : jsonResponse(articlePayload)),
  });

afterEach(() => {
  cleanups.splice(0).reverse().forEach((cleanup) => cleanup());
  vi.restoreAllMocks();
});

describe("rendered blog article", () => {
  it("localizes the article and preserves Markdown as inert text at the rendering boundary", async () => {
    const mounted = await mountArticle();

    expect(mounted.wrapper.get(".article-return").text()).toBe("All articles");
    expect(mounted.wrapper.get("cite").text()).toContain("By Marcelo Munhoz");
    expect(mounted.wrapper.get("cite").text()).toContain("on August 20, 2026");
    expect(mounted.wrapper.get("cite").text()).toContain("Updated on August 22, 2026");
    expect(mounted.wrapper.get(".rendered-text").text()).toContain("## A heading");
    expect(mounted.wrapper.get(".rendered-text").text()).toContain("<script>alert('unsafe')</script>");
    expect(mounted.wrapper.find(".rendered-text script").exists()).toBe(false);
    expect(mounted.wrapper.find(".rendered-text img").exists()).toBe(false);
    expect(mounted.wrapper.get(".article-tags").text()).toBe("#testing");
    expect(mounted.wrapper.get(".article-tags a").attributes("href")).toBe("/blog?tag=testing");
    expect(mounted.wrapper.get("article > img").attributes()).toMatchObject({
      src: "https://images.example.test/article.jpg",
      alt: "Testing diagram",
    });
    expect(mounted.wrapper.get(".author-link").attributes("href")).toBe("/blog/authors/marcelo-munhoz");
  });

  it("returns to the validated archive and carries it through chronological neighbors", async () => {
    const returnTo = "/blog?page=4&tag=testing";
    const mounted = await mountArticle({
      historyState: { blogReturnTo: returnTo },
      navigation: {
        previous: { title: "Older article", slug: "older-article" },
        next: { title: "Newer article", slug: "newer-article" },
      },
    });

    expect(mounted.wrapper.findComponent(".article-return").props("to")).toBe(returnTo);
    expect(mounted.wrapper.get(".article-navigation").attributes("aria-label")).toBe("Previous article / Next article");
    const neighbors = mounted.wrapper.findAllComponents({ name: "RouterLink" }).filter((link) => link.classes().includes("article-neighbor"));
    expect(neighbors.map((link) => link.text())).toEqual(["Previous articleOlder article", "Next articleNewer article"]);
    expect(neighbors.map((link) => link.props("to"))).toEqual([
      { name: "Artigo", params: { slug: "older-article" }, state: { blogReturnTo: returnTo } },
      { name: "Artigo", params: { slug: "newer-article" }, state: { blogReturnTo: returnTo } },
    ]);
  });

  it("uses Portuguese defaults and hides optional image and navigation fallbacks", async () => {
    const portuguese = article({
      title: "Testes de software",
      slug: "testes-de-software",
      description: "Um artigo prático sobre testes confiáveis.",
      body: "Um artigo sobre testes de software.",
      locale: undefined,
      updatedAt: undefined,
      thumbnail: undefined,
      alt: undefined,
      author: { fields: { name: "Autor Sem Slug" } },
    });
    portuguese.metadata.tags = [{ sys: { id: "article-lang-pt-br" } }];
    const mounted = await mountArticle({ articlePayload: portuguese, historyState: { blogReturnTo: "https://invalid.example.test" } });

    expect(mounted.wrapper.get(".article-return").text()).toBe("Todos os artigos");
    expect(mounted.wrapper.findComponent(".article-return").props("to")).toBe("/blog");
    expect(mounted.wrapper.get("cite").text()).toContain("Por Autor Sem Slug");
    expect(mounted.wrapper.get(".author-link").attributes("href")).toBe("/blog/authors/autor-sem-slug");
    expect(mounted.wrapper.find("article > img").exists()).toBe(false);
    expect(mounted.wrapper.find(".article-navigation").exists()).toBe(false);
    expect(mounted.wrapper.get(".article-tags").text()).toBe("");
  });
});

describe("rendered author profile", () => {
  const mountAuthor = ({ payload, status = 200 } = {}) =>
    mountWithBrowser({
      component: AuthorProfile,
      initialPath: "/blog/authors/marcelo-munhoz",
      routes: [
        { path: "/blog/:slug", name: "Artigo", component: BlogArticle },
        { path: "/blog/authors/:slug", name: "Author", component: AuthorProfile },
      ],
      fetchImpl: () => Promise.resolve(jsonResponse(payload, status)),
    });

  it("renders profile details and paginates articles with stable article links", async () => {
    const mounted = await mountAuthor({ payload: { author, articles: Array.from({ length: 10 }, (_, index) => authorArticle(index + 1)) } });

    expect(mounted.wrapper.get("h1").text()).toBe("Marcelo Munhoz");
    expect(mounted.wrapper.get(".author-header").text()).toContain("I write about software testing.");
    expect(mounted.wrapper.findAll(".article-row")).toHaveLength(8);
    expect(mounted.wrapper.get(".article-row a").attributes("href")).toBe("/blog/author-article-1");
    expect(mounted.wrapper.get(".article-row").text()).toContain("1 min read");

    const buttons = () => mounted.wrapper.findAllComponents({ name: "QBtn" });
    await buttons().find((button) => button.text() === "Load more").trigger("click");
    expect(mounted.wrapper.findAll(".article-row")).toHaveLength(10);
    expect(buttons().some((button) => button.text() === "Load more")).toBe(false);
    await buttons().find((button) => button.text() === "Show less").trigger("click");
    expect(mounted.wrapper.findAll(".article-row")).toHaveLength(8);
  });

  it("advances through author photo candidates and falls back to initials", async () => {
    const hash = "a".repeat(64);
    const photoAuthor = {
      ...author,
      fields: {
        ...author.fields,
        photo: {
          gravatar_hash: hash,
          fallback_url: "https://res.cloudinary.com/demo/image/upload/fallback.jpg",
          secure_url: "https://images.ctfassets.net/demo/legacy.jpg",
        },
      },
    };
    const mounted = await mountAuthor({ payload: { author: photoAuthor, articles: [] } });

    expect(mounted.wrapper.get(".author-photo img").attributes("src")).toContain(`gravatar.com/avatar/${hash}`);
    await mounted.wrapper.get(".author-photo img").trigger("error");
    expect(mounted.wrapper.get(".author-photo img").attributes("src")).toBe("https://res.cloudinary.com/demo/image/upload/fallback.jpg");
    await mounted.wrapper.get(".author-photo img").trigger("error");
    expect(mounted.wrapper.get(".author-photo img").attributes("src")).toBe("https://images.ctfassets.net/demo/legacy.jpg");
    await mounted.wrapper.get(".author-photo img").trigger("error");
    expect(mounted.wrapper.find(".author-photo img").exists()).toBe(false);
    expect(mounted.wrapper.get(".author-photo").text()).toBe("MM");
  });

  it("renders safe empty fallbacks when the author request fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const mounted = await mountAuthor({ payload: { error: "unavailable" }, status: 503 });

    expect(mounted.wrapper.get("h1").text()).toBe("");
    expect(mounted.wrapper.get(".author-photo").text()).toBe("A");
    expect(mounted.wrapper.get(".empty-state").text()).toBe("No published articles found for this author.");
    expect(error).toHaveBeenCalledTimes(1);
  });
});
