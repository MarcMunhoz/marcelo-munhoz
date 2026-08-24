import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";

import { buildApiUrl } from "../src/utils/apiBase.js";
import {
  articleBylineLabels,
  articleLocaleFromArticle,
  articleNavigationLabels,
  isArticleLanguageTag,
  publicArticleDates,
} from "../src/utils/articleDates.js";
import { blogArticleLocation, blogReturnLocation, blogRouteQuery, normalizeBlogRouteQuery } from "../src/utils/blogArchive.js";
import { articleAuthorProfile } from "../src/utils/authorProfiles.js";
import { articleCardImageUrl, articleHeroImageUrl } from "../src/utils/contentfulImages.js";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

const validArticle = (slug = "article") => ({
  sys: { id: slug, createdAt: "2026-08-20T12:00:00.000Z" },
  fields: {
    title: `Article ${slug}`,
    slug,
    description: "Description",
    author: { fields: { name: "Author" } },
  },
  metadata: { tags: [] },
});

const blogComponent = ({ fetchImpl = async () => ({ ok: true, json: async () => ({}) }), clearTimeoutImpl = clearTimeout } = {}) => {
  const source = read("../src/pages/Blog.vue");
  const script = source
    .match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1]
    .replace(/^import .*;\s*$/gm, "")
    .replace("export default defineComponent(", "globalThis.__component = (");
  const context = {
    BlogArchiveList: {},
    BlogHighlights: {},
    URLSearchParams,
    buildApiUrl,
    blogRouteQuery,
    normalizeBlogRouteQuery,
    clearTimeout: clearTimeoutImpl,
    console: { error() {} },
    fetch: fetchImpl,
    isArticleLanguageTag,
    setTimeout,
  };

  runInNewContext(script, context);
  return context.__component;
};

const archiveComponent = () => {
  const source = read("../src/components/BlogArchiveList.vue");
  const script = source
    .match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1]
    .replace(/^import .*;\s*$/gm, "")
    .replace("export default defineComponent(", "globalThis.__component = (");
  const context = {
    articleCardImageUrl,
    articleLocaleFromArticle,
    blogArticleLocation,
    isArticleLanguageTag,
    publicArticleDates,
  };

  runInNewContext(script, context);
  return context.__component;
};

const articleFixture = (slug, locale = "en-US") => ({
  sys: { id: slug, createdAt: "2026-08-20T12:00:00.000Z" },
  fields: {
    title: `Article ${slug}`,
    slug,
    description: `Description ${slug}`,
    body: `Body ${slug}`,
    locale,
    author: { fields: { name: "Author", slug: "author" } },
  },
  metadata: { tags: [{ sys: { id: "architecture" } }] },
});

const response = (payload, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => payload,
});

const deferred = () => {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

const blogArticleComponent = ({ fetchImpl = async () => response({}), historyState = null } = {}) => {
  const source = read("../src/components/BlogArticle.vue");
  const script = source
    .match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1]
    .replace(/^import .*;\s*$/gm, "")
    .replace("export default defineComponent(", "globalThis.__component = (");
  const renderedText = { innerHTML: "" };
  const headerTitle = { innerHTML: "" };
  const browserWindow = { history: { state: historyState } };
  const markdownState = { instances: 0, pluginCounts: [], singletonUses: 0, parsedBodies: [] };
  class Marked {
    constructor(...plugins) {
      markdownState.instances += 1;
      markdownState.pluginCounts.push(plugins.length);
    }

    parse(body) {
      markdownState.parsedBodies.push(body);
      return `<p>${body}</p>`;
    }
  }
  const context = {
    Marked,
    SEmail: {},
    SFacebook: {},
    SLinkedIn: {},
    STelegram: {},
    STwitter: {},
    SWhatsApp: {},
    articleAuthorProfile,
    articleBylineLabels,
    articleHeroImageUrl,
    articleLocaleFromArticle,
    articleNavigationLabels,
    blogArticleLocation,
    blogReturnLocation,
    buildApiUrl,
    console: { error() {} },
    createMetaMixin: () => ({}),
    document: {
      baseURI: "https://example.test/blog/article",
      querySelector: (selector) => (selector === ".rendered-text" ? renderedText : headerTitle),
      title: "",
    },
    fetch: fetchImpl,
    gfmHeadingId: () => ({}),
    isArticleLanguageTag,
    mangle: () => ({}),
    marked: {
      parse: (body) => {
        markdownState.parsedBodies.push(body);
        return `<p>${body}</p>`;
      },
      use: () => {
        markdownState.singletonUses += 1;
      },
    },
    publicArticleDates,
    window: browserWindow,
  };

  runInNewContext(script, context);
  return { component: context.__component, browserWindow, markdownState, renderedText };
};

const articleInstance = (component, slug) => {
  const instance = {
    ...component.data(),
    $route: { params: { slug } },
  };

  for (const [name, method] of Object.entries(component.methods)) {
    instance[name] = method.bind(instance);
  }

  return instance;
};

describe("public blog frontend", () => {
  it("localizes article navigation labels from the loaded article locale", () => {
    assert.equal(typeof articleNavigationLabels, "function");
    assert.deepEqual(articleNavigationLabels("pt-BR"), {
      all: "Todos os artigos",
      previous: "Artigo anterior",
      next: "Próximo artigo",
    });
    assert.deepEqual(articleNavigationLabels("en-US"), {
      all: "All articles",
      previous: "Previous article",
      next: "Next article",
    });
  });

  it("renders accessible archive and chronological actions with clean named routes", () => {
    const article = read("../src/components/BlogArticle.vue");

    assert.match(article, /class="article-return/);
    assert.match(article, /<q-icon[^>]+name="fa-solid fa-arrow-left"/);
    assert.match(article, /navigationLabels\.all/);
    assert.match(article, /v-if="articleNavigation\.previous"/);
    assert.match(article, /v-if="articleNavigation\.next"/);
    assert.match(article, /navigationLabels\.previous/);
    assert.match(article, /navigationLabels\.next/);
    assert.match(article, /articleNavigation\.previous\.title/);
    assert.match(article, /articleNavigation\.next\.title/);
    assert.match(article, /blogArticleLocation\(neighbor,\s*this\.archiveLocation\)/);
    assert.match(article, /name:\s*'Meus Artigos'|name:\s*"Meus Artigos"/);
    assert.match(article, /query:\s*\{\s*tag\s*\}/);
    assert.doesNotMatch(article, /name:\s*'Artigos Tags'|name:\s*"Artigos Tags"/);
  });

  it("keeps article navigation visible for keyboards, long titles, and compact viewports", () => {
    const article = read("../src/components/BlogArticle.vue");

    assert.match(article, /\.article-return:focus-visible/);
    assert.match(article, /\.article-neighbor:focus-visible/);
    assert.match(article, /overflow-wrap:\s*anywhere/);
    assert.match(article, /@media \(max-width:\s*700px\)/);
    assert.match(article, /flex-direction:\s*column/);
  });

  it("contains rendered Markdown and article tags inside compact viewports", () => {
    const article = read("../src/components/BlogArticle.vue");

    assert.match(article, /class="article-tags"/);
    assert.match(article, /overflow-wrap:\s*anywhere/);
    assert.match(article, /overflow-x:\s*auto/);
    assert.match(article, /max-width:\s*100%/);
  });

  it("uses validated browser history state for the archive return action", () => {
    const stored = blogArticleComponent({ historyState: { blogReturnTo: "/blog?page=4&tag=architecture" } });
    const unsafe = blogArticleComponent({ historyState: { blogReturnTo: "https://untrusted.example.test" } });

    assert.equal(typeof stored.component.computed.archiveLocation, "function");
    assert.equal(stored.component.computed.archiveLocation.call({}), "/blog?page=4&tag=architecture");
    assert.equal(unsafe.component.computed.archiveLocation.call({}), "/blog");
  });

  it("preserves the validated archive return across chronological article links", () => {
    const archiveUrl = "/blog?page=4&tag=architecture";
    const currentLocation = blogArticleLocation({ slug: "current" }, archiveUrl);
    const current = blogArticleComponent({ historyState: currentLocation.state });
    const currentArchiveLocation = current.component.computed.archiveLocation.call({});

    const neighborLocation = current.component.methods.articleNeighborLocation.call(
      { archiveLocation: currentArchiveLocation },
      { title: "Previous article", slug: "previous" }
    );

    assert.deepEqual(JSON.parse(JSON.stringify(neighborLocation)), {
      name: "Artigo",
      params: { slug: "previous" },
      state: { blogReturnTo: archiveUrl },
    });
    assert.equal("query" in neighborLocation, false);

    const neighbor = blogArticleComponent({ historyState: neighborLocation.state });
    assert.equal(neighbor.component.computed.archiveLocation.call({}), archiveUrl);
  });

  it("keeps a loaded article readable when its independent navigation request fails", async () => {
    const calls = [];
    const { component } = blogArticleComponent({
      fetchImpl: async (url) => {
        calls.push(url);
        return calls.length === 1 ? response(articleFixture("failure-boundary")) : response({}, { ok: false, status: 503 });
      },
    });
    const instance = articleInstance(component, "failure-boundary");

    await instance.loadArticle("failure-boundary");

    assert.deepEqual(calls, [
      "/api/contentful/article/failure-boundary",
      "/api/contentful/article-navigation/failure-boundary",
    ]);
    assert.equal(instance.article.title, "Article failure-boundary");
    assert.equal(instance.progress, false);
    assert.deepEqual(JSON.parse(JSON.stringify(instance.articleNavigation)), { previous: null, next: null });
  });

  it("does not request article navigation until the article request succeeds", async () => {
    const calls = [];
    const { component } = blogArticleComponent({
      fetchImpl: async (url) => {
        calls.push(url);
        return response({}, { ok: false, status: 404 });
      },
    });
    const instance = articleInstance(component, "missing");

    await instance.loadArticle("missing");

    assert.deepEqual(calls, ["/api/contentful/article/missing"]);
  });

  it("rejects malformed successful article payloads before changing rendered state or loading navigation", async () => {
    const complete = articleFixture("malformed-article");
    const malformedPayloads = [
      null,
      {},
      { ...complete, sys: {} },
      { ...complete, fields: null },
      { ...complete, fields: { ...complete.fields, title: "" } },
      { ...complete, fields: { ...complete.fields, slug: "" } },
      { ...complete, fields: { ...complete.fields, description: null } },
      { ...complete, fields: { ...complete.fields, body: "" } },
      { ...complete, metadata: { tags: null } },
      { ...complete, metadata: { tags: [null] } },
      { ...complete, metadata: { tags: [{ sys: { id: "" } }] } },
    ];

    for (const payload of malformedPayloads) {
      const calls = [];
      const { component, renderedText } = blogArticleComponent({
        fetchImpl: async (url) => {
          calls.push(url);
          return response(payload);
        },
      });
      const instance = articleInstance(component, "malformed-article");
      instance.article = { title: "Existing article", slug: "existing" };
      instance.articleLocale = "en-US";

      await instance.loadArticle("malformed-article");

      assert.deepEqual(calls, ["/api/contentful/article/malformed-article"], `payload should fail before navigation: ${JSON.stringify(payload)}`);
      assert.deepEqual(JSON.parse(JSON.stringify(instance.article)), { title: "Existing article", slug: "existing" });
      assert.equal(instance.articleLocale, "en-US");
      assert.equal(instance.progress, true);
      assert.equal(renderedText.innerHTML, "");
    }
  });

  it("configures one isolated Markdown parser without accumulating plugins across reused slugs", async () => {
    const { component, markdownState } = blogArticleComponent({
      fetchImpl: async (url) => {
        if (url.includes("article-navigation")) return response({ previous: null, next: null });
        const slug = url.split("/").at(-1);
        return response(articleFixture(slug));
      },
    });
    const instance = articleInstance(component, "first");

    await instance.loadArticle("first");
    instance.$route.params.slug = "second";
    await instance.loadArticle("second");

    assert.equal(markdownState.instances, 1);
    assert.deepEqual(markdownState.pluginCounts, [2]);
    assert.equal(markdownState.singletonUses, 0);
    assert.deepEqual(markdownState.parsedBodies, ["Body first", "Body second"]);
  });

  it("uses a stable locale fallback when a reused slug has no conclusive locale", async () => {
    const neutralArticle = articleFixture("neutral");
    delete neutralArticle.fields.locale;
    neutralArticle.fields.title = "Neutral";
    neutralArticle.fields.description = "Neutral";
    neutralArticle.fields.body = "Código";
    const { component } = blogArticleComponent({
      fetchImpl: async (url) => {
        if (url.includes("article-navigation")) return response({ previous: null, next: null });
        return response(url.endsWith("/english") ? articleFixture("english", "en-US") : neutralArticle);
      },
    });
    const instance = articleInstance(component, "english");

    await instance.loadArticle("english");
    assert.equal(instance.articleLocale, "en-US");

    instance.$route.params.slug = "neutral";
    await instance.loadArticle("neutral");

    assert.equal(instance.articleLocale, "pt-BR");
  });

  it("fails closed when a successful article navigation payload is malformed", async () => {
    const { component } = blogArticleComponent({
      fetchImpl: async (url) =>
        url.includes("article-navigation")
          ? response({ previous: { title: "", slug: "broken" }, next: { title: "Next", slug: "" } })
          : response(articleFixture("malformed-navigation")),
    });
    const instance = articleInstance(component, "malformed-navigation");

    await instance.loadArticle("malformed-navigation");

    assert.equal(instance.article.title, "Article malformed-navigation");
    assert.deepEqual(JSON.parse(JSON.stringify(instance.articleNavigation)), { previous: null, next: null });
  });

  it("reloads a reused article component when the route slug changes", () => {
    const { component } = blogArticleComponent();
    const loadedSlugs = [];

    assert.equal(typeof component.watch?.["$route.params.slug"], "function");
    component.watch["$route.params.slug"].call({ loadArticle: (slug) => loadedSlugs.push(slug) }, "new-slug", "old-slug");

    assert.deepEqual(loadedSlugs, ["new-slug"]);
  });

  it("prevents stale article responses from overwriting the current route", async () => {
    const oldArticle = deferred();
    const calls = [];
    const { component } = blogArticleComponent({
      fetchImpl: async (url) => {
        calls.push(url);
        if (url === "/api/contentful/article/old") return oldArticle.promise;
        if (url === "/api/contentful/article/new") return response(articleFixture("new"));
        if (url === "/api/contentful/article-navigation/new") {
          return response({ previous: { title: "New previous", slug: "new-previous" }, next: null });
        }
        return response({ previous: { title: "Old previous", slug: "old-previous" }, next: null });
      },
    });
    const instance = articleInstance(component, "old");

    const staleLoad = instance.loadArticle("old");
    instance.$route.params.slug = "new";
    await instance.loadArticle("new");
    oldArticle.resolve(response(articleFixture("old")));
    await staleLoad;

    assert.equal(instance.article.slug, "new");
    assert.equal(instance.articleNavigation.previous.slug, "new-previous");
    assert.equal(calls.includes("/api/contentful/article-navigation/old"), false);
  });

  it("prevents stale navigation responses from replacing the current neighbors", async () => {
    const oldNavigation = deferred();
    const calls = [];
    const { component } = blogArticleComponent({
      fetchImpl: async (url) => {
        calls.push(url);
        if (url === "/api/contentful/article/old") return response(articleFixture("old"));
        if (url === "/api/contentful/article-navigation/old") return oldNavigation.promise;
        if (url === "/api/contentful/article/new") return response(articleFixture("new"));
        return response({ previous: null, next: { title: "New next", slug: "new-next" } });
      },
    });
    const instance = articleInstance(component, "old");

    const staleLoad = instance.loadArticle("old");
    await new Promise((resolvePromise) => setImmediate(resolvePromise));
    assert.equal(calls.includes("/api/contentful/article-navigation/old"), true);

    instance.$route.params.slug = "new";
    await instance.loadArticle("new");
    oldNavigation.resolve(response({ previous: { title: "Old previous", slug: "old-previous" }, next: null }));
    await staleLoad;

    assert.equal(instance.article.slug, "new");
    assert.equal(instance.articleNavigation.next.slug, "new-next");
    assert.equal(component.computed.navigationLabels.call(instance).next, "Next article");
  });

  it("renders one primary and at most two secondary highlights from real article data", () => {
    const highlights = read("../src/components/BlogHighlights.vue");

    assert.match(highlights, /v-if="articles\.length"/);
    assert.match(highlights, /primaryArticle/);
    assert.match(highlights, /articles\.slice\(1,\s*3\)/);
    assert.match(highlights, /articleCardImageUrl\(article\.fields\)/);
    assert.match(highlights, /articleDates\(article\)\.created/);
    assert.match(highlights, /article\.fields\.title/);
    assert.match(highlights, /article\.fields\.description/);
    assert.match(highlights, /articleAuthor\(article\)/);
    assert.match(highlights, /blogArticleLocation\(article,\s*returnTo\)/);
    assert.doesNotMatch(highlights, /params:\s*\{\s*slug/);
  });

  it("renders compact unframed archive rows with complete article metadata", () => {
    const archive = read("../src/components/BlogArchiveList.vue");

    assert.match(archive, /v-for="article in articles"/);
    assert.match(archive, /class="blog-archive-row/);
    assert.match(archive, /articleCardImageUrl\(article\.fields\)/);
    assert.match(archive, /article\.fields\.title/);
    assert.match(archive, /article\.fields\.description/);
    assert.match(archive, /articleAuthor\(article\)/);
    assert.match(archive, /articleDates\(article\)\.created/);
    assert.match(archive, /articleTags\(article\)/);
    assert.match(archive, /blogArticleLocation\(article,\s*returnTo\)/);
    assert.doesNotMatch(archive, /<q-card/);
    assert.doesNotMatch(archive, /params:\s*\{\s*slug/);
  });

  it("provides stable responsive images, wrapping text, and visible keyboard focus", () => {
    for (const componentPath of ["../src/components/BlogHighlights.vue", "../src/components/BlogArchiveList.vue"]) {
      const component = read(componentPath);

      assert.match(component, /aspect-ratio:/);
      assert.match(component, /overflow-wrap:\s*anywhere/);
      assert.match(component, /:focus-visible/);
      assert.match(component, /@media \(max-width:\s*700px\)/);
    }

    assert.match(read("../src/components/BlogHighlights.vue"), /grid-template-columns:\s*minmax\(0,\s*2fr\)\s+minmax\(0,\s*1fr\)/);
    assert.match(read("../src/components/BlogArchiveList.vue"), /grid-template-columns:\s*minmax\(140px,\s*220px\)\s+minmax\(0,\s*1fr\)/);
  });

  it("keeps the highlight focus indicator inside the clipped rounded surface", () => {
    const highlights = read("../src/components/BlogHighlights.vue");
    const focusRule = highlights.match(/\.blog-highlight__link:focus-visible\s*\{([\s\S]*?)\}/)?.[1] || "";

    assert.match(focusRule, /box-shadow:\s*inset\s+0\s+0\s+0\s+3px/);
    assert.doesNotMatch(focusRule, /outline-offset:\s*[1-9]/);
  });

  it("keeps labelled controls stable while loading all public archive resources", () => {
    const page = read("../src/pages/Blog.vue");

    assert.match(page, /label="Search articles"/);
    assert.match(page, /label="Year"/);
    assert.match(page, /label="Tag"/);
    assert.match(page, /normalizeBlogRouteQuery\(this\.\$route\.query\)/);
    assert.match(page, /buildApiUrl\(`\/api\/contentful\/blog-index\$\{queryString \? `\?\$\{queryString\}` : ""\}`\)/);
    assert.match(page, /buildApiUrl\("\/api\/contentful\/tags"\)/);
    assert.match(page, /pageSize:\s*12/);
    assert.match(page, /data\.totalPages/);
    assert.match(page, /data\.page/);
    assert.match(page, /<BlogHighlights\s+v-if="featured\.length"/);
    assert.match(page, /<BlogArchiveList/);
    assert.match(page, /v-if="loading"/);
    assert.match(page, /v-else-if="error"/);
    assert.match(page, /@click="loadArchive"/);
    assert.match(page, /v-else-if="articles\.length === 0"/);
  });

  it("synchronizes committed filters and pagination through router history", () => {
    const page = read("../src/pages/Blog.vue");

    assert.match(page, /searchInput:\s*archiveState\.q/);
    assert.match(page, /setTimeout\([\s\S]*replaceArchiveState[\s\S]*300/);
    assert.match(page, /page:\s*1/);
    assert.match(page, /this\.\$router\.replace/);
    assert.match(page, /this\.\$router\.push/);
    assert.match(page, /blogRouteQuery\(/);
    assert.match(page, /"\$route\.query"/);
    assert.match(page, /applyRouteQuery/);
    assert.match(page, /returnedPage !== this\.archiveState\.page/);
    assert.match(page, /aria-label="Article archive pagination"/);
  });

  it("switches mobile pagination out of the expansive numbered-button combination", () => {
    const component = blogComponent();
    const paginationDisplay = component.computed.paginationDisplay;

    assert.equal(typeof paginationDisplay, "function");
    assert.deepEqual(JSON.parse(JSON.stringify(paginationDisplay.call({ $q: { screen: { lt: { sm: true } } } }))), {
      input: true,
      boundaryLinks: false,
      boundaryNumbers: false,
      ellipses: false,
      maxPages: 1,
    });
    assert.deepEqual(JSON.parse(JSON.stringify(paginationDisplay.call({ $q: { screen: { lt: { sm: false } } } }))), {
      input: false,
      boundaryLinks: false,
      boundaryNumbers: true,
      ellipses: true,
      maxPages: 9,
    });

    const page = read("../src/pages/Blog.vue");
    const pagination = page.match(/<q-pagination[\s\S]*?\/>/)?.[0] || "";
    assert.match(pagination, /v-bind="paginationDisplay"/);
    assert.match(pagination, /direction-links/);
    assert.match(page, /Page \{\{ archiveState\.page \}\} of \{\{ totalPages \}\}/);
    assert.match(page, /\.blog-pagination[\s\S]*:deep\(\.q-field\)[\s\S]*max-width:\s*8rem/);
  });

  it("gives the compact page input a real programmatic name without changing desktop pagination", () => {
    const page = read("../src/pages/Blog.vue");
    const compactControls = page.match(/<div\s+v-if="compactPagination"[\s\S]*?<\/div>/)?.[0] || "";
    const desktopPagination = page.match(/<q-pagination\s+v-else[\s\S]*?\/>/)?.[0] || "";

    assert.match(compactControls, /<q-input/);
    assert.match(compactControls, /label="Page"/);
    assert.match(compactControls, /type="number"/);
    assert.match(compactControls, /aria-label="Previous page"/);
    assert.match(compactControls, /aria-label="Next page"/);
    assert.match(desktopPagination, /v-bind="paginationDisplay"/);
  });

  it("commits pending search text with a filter in one route replacement", () => {
    const clearedTimers = [];
    const component = blogComponent({ clearTimeoutImpl: (timer) => clearedTimers.push(timer) });
    const replacements = [];
    const context = {
      archiveState: { page: 4, q: "committed", year: "", tag: "existing" },
      searchInput: "  pending   search  ",
      searchTimer: 42,
      $router: { replace: (location) => replacements.push(location) },
    };
    context.replaceArchiveState = component.methods.replaceArchiveState.bind(context);

    component.methods.onFilterChange.call(context, "year", "2025");

    assert.deepEqual(clearedTimers, [42]);
    assert.equal(replacements.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(replacements[0])), {
      query: { q: "pending search", year: "2025", tag: "existing" },
    });
  });

  it("rejects semantically malformed successful archive payloads into the retry state", async () => {
    const malformedPayloads = [
      { featured: [], items: [{}], total: 1, page: 1, pageSize: 12, totalPages: 1 },
      { featured: [null], items: [], total: 1, page: 1, pageSize: 12, totalPages: 1 },
      { featured: [], items: [{ ...validArticle("null-tags"), metadata: { tags: null } }], total: 1, page: 1, pageSize: 12, totalPages: 1 },
      { featured: [], items: [{ ...validArticle("object-tags"), metadata: { tags: {} } }], total: 1, page: 1, pageSize: 12, totalPages: 1 },
      { featured: [], items: [{ ...validArticle("null-tag"), metadata: { tags: [null] } }], total: 1, page: 1, pageSize: 12, totalPages: 1 },
      { featured: [], items: [], total: 0, page: 1, pageSize: 12, totalPages: 1.5 },
      { featured: [], items: [], total: -1, page: 1, pageSize: 12, totalPages: 1 },
    ];

    for (const payload of malformedPayloads) {
      const component = blogComponent({
        fetchImpl: async () => ({ ok: true, json: async () => payload }),
      });
      const context = {
        archiveRequestId: 0,
        archiveState: { page: 1, q: "", year: "", tag: "" },
        loading: false,
        error: "",
        featured: [validArticle("old-featured")],
        articles: [validArticle("old-article")],
        total: 1,
        totalPages: 1,
        pageSize: 12,
        $router: { replace() {} },
      };

      await component.methods.loadArchive.call(context);

      assert.equal(context.error, "archive-load-failed", `payload should be rejected: ${JSON.stringify(payload)}`);
      assert.deepEqual(JSON.parse(JSON.stringify(context.featured)), []);
      assert.deepEqual(JSON.parse(JSON.stringify(context.articles)), []);
      assert.equal(context.loading, false);
    }
  });

  it("defensively ignores malformed tags when the archive list is used directly", () => {
    const component = archiveComponent();

    for (const tags of [null, {}, [null]]) {
      let result;
      assert.doesNotThrow(() => {
        result = component.methods.articleTags({ metadata: { tags } });
      });
      assert.deepEqual(JSON.parse(JSON.stringify(result)), []);
    }

    assert.deepEqual(
      JSON.parse(
        JSON.stringify(
          component.methods.articleTags({
            metadata: { tags: [{ sys: { id: "architecture" } }, { sys: { id: "article-lang-en-us" } }] },
          })
        )
      ),
      ["architecture"]
    );
  });

  it("accepts a complete archive payload before rendering article fields", async () => {
    const payload = {
      featured: [validArticle("featured")],
      items: [validArticle("archive")],
      total: 1,
      page: 1,
      pageSize: 12,
      totalPages: 1,
    };
    const component = blogComponent({
      fetchImpl: async () => ({ ok: true, json: async () => payload }),
    });
    const context = {
      archiveRequestId: 0,
      archiveState: { page: 1, q: "", year: "", tag: "" },
      loading: false,
      error: "",
      featured: [],
      articles: [],
      total: 0,
      totalPages: 1,
      pageSize: 12,
      $router: { replace() {} },
    };

    await component.methods.loadArchive.call(context);

    assert.equal(context.error, "");
    assert.equal(context.featured[0].fields.slug, "featured");
    assert.equal(context.articles[0].fields.slug, "archive");
    assert.equal(context.totalPages, 1);
  });

  it("keeps the tags response on its independent API contract", async () => {
    const component = blogComponent({
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          items: [
            { name: "Architecture", sys: { id: "architecture" } },
            { name: "Article language: Portuguese", sys: { id: "article-lang-pt-br" } },
          ],
        }),
      }),
    });
    const context = { tagsLoading: false, tagOptions: [] };

    await component.methods.loadTags.call(context);

    assert.deepEqual(JSON.parse(JSON.stringify(context.tagOptions)), [{ label: "Architecture", value: "architecture" }]);
    assert.equal(context.tagsLoading, false);
  });

  it("loads the available published years independently from the archive index", async () => {
    const calls = [];
    const component = blogComponent({
      fetchImpl: async (url) => {
        calls.push(url);
        return response({ years: ["2026", "2024"] });
      },
    });
    const context = { yearsLoading: false, yearOptions: [] };

    await component.methods.loadYears.call(context);

    assert.deepEqual(calls, ["/api/contentful/blog-years"]);
    assert.deepEqual(JSON.parse(JSON.stringify(context.yearOptions)), [
      { label: "2026", value: "2026" },
      { label: "2024", value: "2024" },
    ]);
    assert.equal(context.yearsLoading, false);
  });

  it("starts the independent published-year request when the archive page is created", () => {
    const component = blogComponent();
    const calls = [];
    const context = {
      $route: { query: {} },
      archiveState: { page: 1, q: "", year: "", tag: "" },
      ensureCanonicalRoute() {},
      loadYears() {
        calls.push("years");
      },
      loadTags() {
        calls.push("tags");
      },
      loadArchive() {
        calls.push("archive");
      },
    };

    component.created.call(context);

    assert.deepEqual(calls, ["years", "tags", "archive"]);
  });

  it("rejects malformed published-year payloads without disturbing archive state", async () => {
    const component = blogComponent({
      fetchImpl: async () => response({ years: ["2026", "2026"] }),
    });
    const articles = [validArticle("still-visible")];
    const context = {
      yearsLoading: false,
      yearOptions: [{ label: "2025", value: "2025" }],
      articles,
      error: "",
    };

    await component.methods.loadYears.call(context);

    assert.deepEqual(JSON.parse(JSON.stringify(context.yearOptions)), []);
    assert.equal(context.articles, articles);
    assert.equal(context.error, "");
    assert.equal(context.yearsLoading, false);
  });

  it("cancels stale search commits and stale highlights when route state reloads", () => {
    const page = read("../src/pages/Blog.vue");

    assert.match(page, /applyRouteQuery\(query\)\s*\{\s*clearTimeout\(this\.searchTimer\)/);
    assert.match(page, /async loadArchive\(\)\s*\{[\s\S]*this\.featured = \[\];[\s\S]*await fetch/);
  });
});
