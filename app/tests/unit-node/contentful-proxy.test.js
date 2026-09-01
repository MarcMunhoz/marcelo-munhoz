import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { createContentfulHandler } from "../../netlify/functions/contentfulProxyCore.js";

function createClient(overrides = {}) {
  return {
    async getEntries(query) {
      return { items: [], total: 0, query };
    },
    async getTags() {
      return { items: [] };
    },
    ...overrides,
  };
}

const blogArticle = (id) => ({ sys: { id }, fields: { title: `Article ${id}`, slug: id } });

const navigationArticle = ({ title, slug, createAt, createdAt }) => ({
  sys: {
    id: slug,
    createdAt,
    privateDiagnostic: "upstream-only",
  },
  fields: {
    title,
    slug,
    ...(createAt ? { createAt } : {}),
    body: "private article body",
    author: {
      fields: {
        email: "private@example.test",
        identityProviderId: "private-identity",
      },
    },
  },
});

describe("contentful proxy handler", () => {
  it("normalizes allowlisted blog-index query values before calling Contentful", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({
      path: "/blog-index",
      query: { page: "0", q: "  system   design  ", year: "2025", tag: "AI", injected: "ignored" },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      featured: [],
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
      totalPages: 1,
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 0,
        query: "system design",
        "fields.createAt[gte]": "2025-01-01T00:00:00.000Z",
        "fields.createAt[lt]": "2026-01-01T00:00:00.000Z",
        "metadata.tags.sys.id[all]": "AI",
      },
    ]);
  });

  it("bounds page values on legacy article routes", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/entries", query: { page: "9999999999999999" } });

    assert.equal(response.statusCode, 200);
    assert.equal(calls[0].skip, 0);
  });

  it("caps blog-index search and omits invalid allowlisted values", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: 1_000 };
        },
      }),
    });

    const response = await handler({
      path: "/blog-index",
      query: {
        page: "66",
        q: "x".repeat(120),
        year: "1800",
        tag: "bad tag!",
        "fields.title[match]": "injected",
      },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      featured: [],
      items: [],
      total: 1_000,
      page: 66,
      pageSize: 12,
      totalPages: 84,
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 780,
        query: "x".repeat(100),
      },
    ]);
  });

  it("returns newest highlights and excludes them from the first unfiltered archive page", async () => {
    const calls = [];
    const featured = [blogArticle("featured-1"), blogArticle("featured-2"), blogArticle("featured-3")];
    const archive = [featured[1], blogArticle("archive-1")];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return query.limit === 3 ? { items: featured, total: 21 } : { items: archive, total: 21 };
        },
      }),
    });

    const response = await handler({ path: "/blog-index", query: {} });
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.deepEqual(payload.featured, featured);
    assert.deepEqual(payload.items, [blogArticle("archive-1")]);
    assert.equal(payload.total, 18);
    assert.equal(payload.page, 1);
    assert.equal(payload.pageSize, 12);
    assert.equal(payload.totalPages, 2);
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 3,
        skip: 0,
      },
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 3,
      },
    ]);
    assert.equal(payload.items.some((article) => payload.featured.some((highlight) => highlight.sys.id === article.sys.id)), false);
  });

  it("offsets every later unfiltered archive page without loading highlights", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [blogArticle("archive-13")], total: 30 };
        },
      }),
    });

    const response = await handler({ path: "/blog-index", query: { page: "2" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      featured: [],
      items: [blogArticle("archive-13")],
      total: 27,
      page: 2,
      pageSize: 12,
      totalPages: 3,
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 15,
      },
    ]);
  });

  it("loads highlights after an out-of-range unfiltered request is corrected to the first page", async () => {
    const calls = [];
    const featured = [blogArticle("featured-1"), blogArticle("featured-2"), blogArticle("featured-3")];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return query.limit === 3 ? { items: featured, total: 3 } : { items: [], total: 3 };
        },
      }),
    });

    const response = await handler({ path: "/blog-index", query: { page: "9" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      featured,
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
      totalPages: 1,
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 99,
      },
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 3,
        skip: 0,
      },
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 3,
      },
    ]);
  });

  it("normalizes unsafe and oversized blog-index page values before Contentful calls", async () => {
    for (const page of ["9007199254740992", "9".repeat(400)]) {
      const calls = [];
      const handler = createContentfulHandler({
        client: createClient({
          async getEntries(query) {
            calls.push(query);
            return query.limit === 3 ? { items: [blogArticle("featured")], total: 1 } : { items: [], total: 1 };
          },
        }),
      });

      const response = await handler({ path: "/blog-index", query: { page } });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(JSON.parse(response.body), {
        featured: [blogArticle("featured")],
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
        totalPages: 1,
      });
      assert.deepEqual(calls, [
        {
          content_type: "article",
          order: "-fields.createAt,-sys.createdAt",
          limit: 3,
          skip: 0,
        },
        {
          content_type: "article",
          order: "-fields.createAt,-sys.createdAt",
          limit: 12,
          skip: 3,
        },
      ]);
      assert.equal(calls.every((query) => Number.isSafeInteger(query.skip)), true);
    }
  });

  it("forwards a safe archive skip for the largest supported blog-index page", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: Number.MAX_SAFE_INTEGER };
        },
      }),
    });

    const response = await handler({ path: "/blog-index", query: { page: "750599937895083" } });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).page, 750599937895083);
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 9007199254740987,
      },
    ]);
    assert.equal(Number.isSafeInteger(calls[0].skip), true);
  });

  it("normalizes the page after the safe archive-skip boundary before Contentful calls", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return query.limit === 3 ? { items: [blogArticle("featured")], total: 1 } : { items: [], total: 1 };
        },
      }),
    });

    const response = await handler({ path: "/blog-index", query: { page: "750599937895084" } });

    assert.equal(response.statusCode, 200);
    assert.equal(JSON.parse(response.body).page, 1);
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 3,
        skip: 0,
      },
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 3,
      },
    ]);
    assert.equal(calls.every((query) => Number.isSafeInteger(query.skip)), true);
  });

  it("uses only the supported filtered blog-index Contentful query", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [blogArticle("architecture")], total: 13 };
        },
      }),
    });

    const response = await handler({
      path: "/blog-index",
      query: { q: "architecture", year: "2025", tag: "AI", arbitrary: "ignored" },
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      featured: [],
      items: [blogArticle("architecture")],
      total: 13,
      page: 1,
      pageSize: 12,
      totalPages: 2,
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 0,
        query: "architecture",
        "fields.createAt[gte]": "2025-01-01T00:00:00.000Z",
        "fields.createAt[lt]": "2026-01-01T00:00:00.000Z",
        "metadata.tags.sys.id[all]": "AI",
      },
    ]);
  });

  it("corrects an out-of-range filtered blog-index page with one archive reread", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: query.skip === 12 ? [blogArticle("last-page")] : [], total: 17 };
        },
      }),
    });

    const response = await handler({ path: "/blog-index", query: { page: "99", q: "architecture" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      featured: [],
      items: [blogArticle("last-page")],
      total: 17,
      page: 2,
      pageSize: 12,
      totalPages: 2,
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 1176,
        query: "architecture",
      },
      {
        content_type: "article",
        order: "-fields.createAt,-sys.createdAt",
        limit: 12,
        skip: 12,
        query: "architecture",
      },
    ]);
  });

  it("returns the canonical first page for an empty blog-index collection", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/blog-index", query: { page: "9", q: "architecture" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      featured: [],
      items: [],
      total: 0,
      page: 1,
      pageSize: 12,
      totalPages: 1,
    });
    assert.deepEqual(calls.map((query) => query.skip), [96, 0]);
  });

  it("sanitizes upstream blog-index errors", async () => {
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries() {
          throw new Error("Contentful detail: private-token");
        },
      }),
      logger: { error() {} },
    });

    const response = await handler({ path: "/blog-index", query: {} });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), { error: "Failed to fetch blog index" });
    assert.doesNotMatch(response.body, /Contentful|private-token|detail/i);
  });

  it("fetches paginated article entries with the existing query shape", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [{ sys: { id: "article-1" } }], total: 7 };
        },
      }),
    });

    const response = await handler({ path: "/entries", query: { page: "3", accessToken: "browser-token" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { items: [{ sys: { id: "article-1" } }], total: 7 });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        order: "-sys.createdAt,-fields.createAt",
        limit: 3,
        skip: 6,
      },
    ]);
  });

  it("fetches tags through the Contentful client", async () => {
    const handler = createContentfulHandler({
      client: createClient({
        async getTags() {
          return { items: [{ sys: { id: "javascript" } }] };
        },
      }),
    });

    const response = await handler({ path: "/tags", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { items: [{ sys: { id: "javascript" } }] });
  });

  it("returns only distinct published years from one bounded date-only query", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return {
            items: [
              { fields: { createAt: "2026-08-20T12:00:00.000Z" } },
              { fields: { createAt: "2026-01-02T12:00:00.000Z" } },
              { fields: { createAt: "2024-12-31T23:59:59.000Z" } },
            ],
            total: 3,
          };
        },
      }),
    });

    const response = await handler({ path: "/blog-years", query: { limit: "999999", select: "fields.body" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { years: ["2026", "2024"] });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        "fields.createAt[exists]": true,
        select: "fields.createAt",
        order: "-fields.createAt",
        limit: 1_000,
        skip: 0,
      },
    ]);
  });

  it("fails closed instead of returning an incomplete published-year list", async () => {
    const messages = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries() {
          return { items: [{ fields: { createAt: "2026-08-20T12:00:00.000Z" } }], total: 1_001 };
        },
      }),
      logger: { error: (...args) => messages.push(args.join(" ")) },
    });

    const response = await handler({ path: "/blog-years", query: {} });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), { error: "Failed to fetch blog years" });
    assert.doesNotMatch(response.body, /2026|1001|Contentful/i);
    assert.equal(messages.length, 1);
  });

  for (const [name, upstreamPayload] of [
    ["malformed collection", { items: "not-an-array", total: 1 }],
    ["incomplete collection", { items: [], total: 1 }],
    ["invalid publication date", { items: [{ fields: { createAt: "not-a-date" } }], total: 1 }],
  ]) {
    it(`sanitizes ${name} responses from the published-year lookup`, async () => {
      const handler = createContentfulHandler({
        client: createClient({
          async getEntries() {
            return upstreamPayload;
          },
        }),
        logger: { error() {} },
      });

      const response = await handler({ path: "/blog-years", query: {} });

      assert.equal(response.statusCode, 500);
      assert.deepEqual(JSON.parse(response.body), { error: "Failed to fetch blog years" });
      assert.doesNotMatch(response.body, /not-a-date|not-an-array|stack/i);
    });
  }

  it("fetches tagged articles with the requested tag and pagination", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: 4 };
        },
      }),
    });

    const response = await handler({ path: "/tagged", query: { tag: "vue", page: "2", space: "browser-space" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { items: [], total: 4 });
    assert.deepEqual(calls, [
      {
        "metadata.tags.sys.id[all]": "vue",
        content_type: "article",
        order: "-fields.createAt",
        limit: 3,
        skip: 3,
      },
    ]);
  });

  it("returns a single article by slug", async () => {
    const article = { sys: { id: "article-1" }, fields: { slug: "hello" } };
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries() {
          return { items: [article], total: 1 };
        },
      }),
    });

    const response = await handler({ path: "/article/hello", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), article);
  });

  it("returns immediate older and newer article navigation with a minimal public payload", async () => {
    const editorialDate = "2025-06-10T00:00:00.000Z";
    const current = navigationArticle({
      title: "Current article",
      slug: "current-article",
      createAt: editorialDate,
      createdAt: "2025-06-10T12:00:00.000Z",
    });
    const older = navigationArticle({
      title: "Older article",
      slug: "older-article",
      createAt: "2025-06-09T00:00:00.000Z",
      createdAt: "2025-06-09T12:00:00.000Z",
    });
    const newer = navigationArticle({
      title: "Newer article",
      slug: "newer-article",
      createAt: "2025-06-11T00:00:00.000Z",
      createdAt: "2025-06-11T12:00:00.000Z",
    });
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[lt]"]) return { items: [older], total: 1 };
          if (query["fields.createAt[gt]"]) return { items: [newer], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/current-article", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Older article", slug: "older-article" },
      next: { title: "Newer article", slug: "newer-article" },
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        "fields.slug": "current-article",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt": editorialDate,
        "sys.createdAt[lt]": "2025-06-10T12:00:00.000Z",
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[lt]": editorialDate,
        order: "-fields.createAt,-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt[lt]": editorialDate,
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt": editorialDate,
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt": editorialDate,
        "sys.createdAt[gt]": "2025-06-10T12:00:00.000Z",
        order: "sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[gt]": editorialDate,
        order: "fields.createAt,sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt[gt]": editorialDate,
        order: "sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt": editorialDate,
        order: "sys.createdAt",
        limit: 1,
      },
    ]);
    assert.doesNotMatch(response.body, /body|private@example|identityProvider|privateDiagnostic|upstream-only/i);
  });

  it("returns null previous article navigation at the oldest boundary", async () => {
    const editorialDate = "2025-06-10T00:00:00.000Z";
    const current = navigationArticle({
      title: "Oldest article",
      slug: "oldest-article",
      createAt: editorialDate,
      createdAt: "2025-06-10T12:00:00.000Z",
    });
    const newer = navigationArticle({
      title: "Newer article",
      slug: "newer-article",
      createAt: "2025-06-11T00:00:00.000Z",
      createdAt: "2025-06-11T12:00:00.000Z",
    });
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[gt]"]) return { items: [newer], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/oldest-article", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: null,
      next: { title: "Newer article", slug: "newer-article" },
    });
  });

  it("returns null next article navigation at the newest boundary", async () => {
    const editorialDate = "2025-06-10T00:00:00.000Z";
    const current = navigationArticle({
      title: "Newest article",
      slug: "newest-article",
      createAt: editorialDate,
      createdAt: "2025-06-10T12:00:00.000Z",
    });
    const older = navigationArticle({
      title: "Older article",
      slug: "older-article",
      createAt: "2025-06-09T00:00:00.000Z",
      createdAt: "2025-06-09T12:00:00.000Z",
    });
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[lt]"]) return { items: [older], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/newest-article", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Older article", slug: "older-article" },
      next: null,
    });
  });

  it("returns 404 when the article navigation slug is missing", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/missing", query: {} });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Article not found" });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        "fields.slug": "missing",
        limit: 1,
      },
    ]);
  });

  it("rejects an empty article navigation slug before querying Contentful", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/", query: {} });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Article not found" });
    assert.deepEqual(calls, []);
  });

  it("prefers chronological neighbors with the same editorial date", async () => {
    const editorialDate = "2025-06-10T00:00:00.000Z";
    const current = navigationArticle({
      title: "Current article",
      slug: "current-article",
      createAt: editorialDate,
      createdAt: "2025-06-10T12:00:00.000Z",
    });
    const older = navigationArticle({
      title: "Same-date older article",
      slug: "same-date-older",
      createAt: editorialDate,
      createdAt: "2025-06-10T11:00:00.000Z",
    });
    const newer = navigationArticle({
      title: "Same-date newer article",
      slug: "same-date-newer",
      createAt: editorialDate,
      createdAt: "2025-06-10T13:00:00.000Z",
    });
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[exists]"] === false) return { items: [], total: 0 };
          if (query["sys.createdAt[lt]"]) return { items: [older], total: 1 };
          if (query["sys.createdAt[gt]"]) return { items: [newer], total: 1 };
          throw new Error("editorial-date fallback must not run");
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/current-article", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Same-date older article", slug: "same-date-older" },
      next: { title: "Same-date newer article", slug: "same-date-newer" },
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        "fields.slug": "current-article",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt": editorialDate,
        "sys.createdAt[lt]": "2025-06-10T12:00:00.000Z",
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt[lt]": editorialDate,
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt": editorialDate,
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt": editorialDate,
        "sys.createdAt[gt]": "2025-06-10T12:00:00.000Z",
        order: "sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt[gt]": editorialDate,
        order: "sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt": editorialDate,
        order: "sys.createdAt",
        limit: 1,
      },
    ]);
  });

  it("uses sys.createdAt chronological neighbors when the editorial date is missing", async () => {
    const current = navigationArticle({
      title: "Current article",
      slug: "current-article",
      createdAt: "2025-06-10T12:00:00.000Z",
    });
    const older = navigationArticle({
      title: "Older article",
      slug: "older-article",
      createdAt: "2025-06-10T11:00:00.000Z",
    });
    const newer = navigationArticle({
      title: "Newer article",
      slug: "newer-article",
      createdAt: "2025-06-10T13:00:00.000Z",
    });
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[exists]"] === false && query["sys.createdAt[lt]"]) return { items: [older], total: 1 };
          if (query["fields.createAt[exists]"] === false && query["sys.createdAt[gt]"]) return { items: [newer], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/current-article", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Older article", slug: "older-article" },
      next: { title: "Newer article", slug: "newer-article" },
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        "fields.slug": "current-article",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt": "2025-06-10T12:00:00.000Z",
        "sys.createdAt[lt]": "2025-06-10T12:00:00.000Z",
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[lt]": "2025-06-10T12:00:00.000Z",
        order: "-fields.createAt,-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt[lt]": "2025-06-10T12:00:00.000Z",
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt": "2025-06-10T12:00:00.000Z",
        "sys.createdAt[gt]": "2025-06-10T12:00:00.000Z",
        order: "sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[gt]": "2025-06-10T12:00:00.000Z",
        order: "fields.createAt,sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt[gt]": "2025-06-10T12:00:00.000Z",
        order: "sys.createdAt",
        limit: 1,
      },
    ]);
  });

  it("selects closer undated article navigation candidates around a dated article", async () => {
    const currentEffectiveDate = "2025-06-10T00:00:00.000Z";
    const current = navigationArticle({
      title: "Current dated article",
      slug: "current-dated",
      createAt: currentEffectiveDate,
      createdAt: "2025-06-20T00:00:00.000Z",
    });
    const datedOlder = navigationArticle({
      title: "Dated older article",
      slug: "dated-older",
      createAt: "2025-06-08T00:00:00.000Z",
      createdAt: "2025-06-30T00:00:00.000Z",
    });
    const undatedOlder = navigationArticle({
      title: "Undated older article",
      slug: "undated-older",
      createdAt: "2025-06-09T00:00:00.000Z",
    });
    const undatedNewer = navigationArticle({
      title: "Undated newer article",
      slug: "undated-newer",
      createdAt: "2025-06-11T00:00:00.000Z",
    });
    const datedNewer = navigationArticle({
      title: "Dated newer article",
      slug: "dated-newer",
      createAt: "2025-06-12T00:00:00.000Z",
      createdAt: "2025-06-01T00:00:00.000Z",
    });
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[exists]"] === false && query["sys.createdAt[lt]"]) return { items: [undatedOlder], total: 1 };
          if (query["fields.createAt[exists]"] === false && query["sys.createdAt[gt]"]) return { items: [undatedNewer], total: 1 };
          if (query["fields.createAt[exists]"] === false && query["sys.createdAt[gte]"]) return { items: [undatedOlder], total: 1 };
          if (query["fields.createAt[exists]"] === false && query["sys.createdAt[lte]"]) return { items: [undatedNewer], total: 1 };
          if (query["fields.createAt[lt]"]) return { items: [datedOlder], total: 1 };
          if (query["fields.createAt[gt]"]) return { items: [datedNewer], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/current-dated", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Undated older article", slug: "undated-older" },
      next: { title: "Undated newer article", slug: "undated-newer" },
    });
    assert.deepEqual(
      calls.filter((query) => query["fields.createAt[exists]"] === false),
      [
        {
          content_type: "article",
          "fields.createAt[exists]": false,
          "sys.createdAt[lt]": currentEffectiveDate,
          order: "-sys.createdAt",
          limit: 1,
        },
        {
          content_type: "article",
          "fields.createAt[exists]": false,
          "sys.createdAt": currentEffectiveDate,
          order: "-sys.createdAt",
          limit: 1,
        },
        {
          content_type: "article",
          "fields.createAt[exists]": false,
          "sys.createdAt[gt]": currentEffectiveDate,
          order: "sys.createdAt",
          limit: 1,
        },
        {
          content_type: "article",
          "fields.createAt[exists]": false,
          "sys.createdAt": currentEffectiveDate,
          order: "sys.createdAt",
          limit: 1,
        },
      ]
    );
    assert.equal(calls.slice(1).every((query) => query.limit === 1), true);
  });

  it("selects closer dated article navigation candidates around an undated article", async () => {
    const currentEffectiveDate = "2025-06-10T00:00:00.000Z";
    const current = navigationArticle({
      title: "Current undated article",
      slug: "current-undated",
      createdAt: currentEffectiveDate,
    });
    const datedOlder = navigationArticle({
      title: "Dated older article",
      slug: "dated-older",
      createAt: "2025-06-09T00:00:00.000Z",
      createdAt: "2025-06-30T00:00:00.000Z",
    });
    const undatedOlder = navigationArticle({
      title: "Undated older article",
      slug: "undated-older",
      createdAt: "2025-06-08T00:00:00.000Z",
    });
    const undatedNewer = navigationArticle({
      title: "Undated newer article",
      slug: "undated-newer",
      createdAt: "2025-06-12T00:00:00.000Z",
    });
    const datedNewer = navigationArticle({
      title: "Dated newer article",
      slug: "dated-newer",
      createAt: "2025-06-11T00:00:00.000Z",
      createdAt: "2025-06-01T00:00:00.000Z",
    });
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[exists]"] === false && query["sys.createdAt[lt]"]) return { items: [undatedOlder], total: 1 };
          if (query["fields.createAt[exists]"] === false && query["sys.createdAt[gt]"]) return { items: [undatedNewer], total: 1 };
          if (query["fields.createAt[lt]"]) return { items: [datedOlder], total: 1 };
          if (query["fields.createAt[gt]"]) return { items: [datedNewer], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/current-undated", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Dated older article", slug: "dated-older" },
      next: { title: "Dated newer article", slug: "dated-newer" },
    });
    assert.equal(calls.slice(1).every((query) => query.limit === 1), true);
  });

  it("keeps mixed chronological neighbors reciprocal when technical timestamps are asymmetric", async () => {
    const datedArticle = navigationArticle({
      title: "Dated article",
      slug: "dated-article",
      createAt: "2025-06-10T00:00:00.000Z",
      createdAt: "2025-06-20T00:00:00.000Z",
    });
    const undatedArticle = navigationArticle({
      title: "Undated article",
      slug: "undated-article",
      createdAt: "2025-06-11T00:00:00.000Z",
    });
    const olderUndated = navigationArticle({
      title: "Older undated article",
      slug: "older-undated",
      createdAt: "2025-06-09T00:00:00.000Z",
    });
    const newerDated = navigationArticle({
      title: "Newer dated article",
      slug: "newer-dated",
      createAt: "2025-06-12T00:00:00.000Z",
      createdAt: "2025-06-01T00:00:00.000Z",
    });
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          if (query["fields.slug"] === "dated-article") return { items: [datedArticle], total: 1 };
          if (query["fields.slug"] === "undated-article") return { items: [undatedArticle], total: 1 };
          if (query["fields.createAt[exists]"] === false && (query["sys.createdAt[lte]"] || query["sys.createdAt[lt]"])) {
            return { items: [olderUndated], total: 1 };
          }
          if (
            query["fields.createAt[exists]"] === false &&
            (query["sys.createdAt[gte]"] === "2025-06-10T00:00:00.000Z" || query["sys.createdAt[gt]"] === "2025-06-10T00:00:00.000Z")
          ) {
            return { items: [undatedArticle], total: 1 };
          }
          if (query["fields.createAt[lt]"] === "2025-06-11T00:00:00.000Z") return { items: [datedArticle], total: 1 };
          if (query["fields.createAt[gt]"]) return { items: [newerDated], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const datedResponse = await handler({ path: "/article-navigation/dated-article", query: {} });
    const undatedResponse = await handler({ path: "/article-navigation/undated-article", query: {} });

    assert.equal(datedResponse.statusCode, 200);
    assert.equal(undatedResponse.statusCode, 200);
    assert.deepEqual(JSON.parse(datedResponse.body), {
      previous: { title: "Older undated article", slug: "older-undated" },
      next: { title: "Undated article", slug: "undated-article" },
    });
    assert.deepEqual(JSON.parse(undatedResponse.body), {
      previous: { title: "Dated article", slug: "dated-article" },
      next: { title: "Newer dated article", slug: "newer-dated" },
    });
  });

  it("selects a chronological neighbor with an equal effective date for a dated article", async () => {
    const effectiveDate = "2026-06-10T00:00:00.000Z";
    const current = navigationArticle({
      title: "Current dated article",
      slug: "current-dated",
      createAt: effectiveDate,
      createdAt: "2026-06-20T00:00:00.000Z",
    });
    const undatedPrevious = navigationArticle({
      title: "Undated previous article",
      slug: "undated-previous",
      createdAt: effectiveDate,
    });
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (
            query["fields.createAt[exists]"] === false &&
            query["sys.createdAt"] === effectiveDate
          ) {
            return { items: [undatedPrevious], total: 1 };
          }
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/current-dated", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Undated previous article", slug: "undated-previous" },
      next: null,
    });
    assert.deepEqual(calls, [
      {
        content_type: "article",
        "fields.slug": "current-dated",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt": effectiveDate,
        "sys.createdAt[lt]": "2026-06-20T00:00:00.000Z",
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[lt]": effectiveDate,
        order: "-fields.createAt,-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt[lt]": effectiveDate,
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt": effectiveDate,
        order: "-sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt": effectiveDate,
        "sys.createdAt[gt]": "2026-06-20T00:00:00.000Z",
        order: "sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[gt]": effectiveDate,
        order: "fields.createAt,sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt[gt]": effectiveDate,
        order: "sys.createdAt",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.createAt[exists]": false,
        "sys.createdAt": effectiveDate,
        order: "sys.createdAt",
        limit: 1,
      },
    ]);
  });

  it("keeps a newer undated chronological neighbor visible past an equal-date previous candidate", async () => {
    const effectiveDate = "2026-06-10T00:00:00.000Z";
    const current = navigationArticle({
      title: "Current dated article",
      slug: "current-dated",
      createAt: effectiveDate,
      createdAt: "2026-06-20T00:00:00.000Z",
    });
    const equalPrevious = navigationArticle({
      title: "Equal-date previous article",
      slug: "equal-previous",
      createdAt: effectiveDate,
    });
    const undatedNext = navigationArticle({
      title: "Undated next article",
      slug: "undated-next",
      createdAt: "2026-06-11T00:00:00.000Z",
    });
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[exists]"] !== false) return { items: [], total: 0 };
          if (query["sys.createdAt"] === effectiveDate) {
            return { items: [equalPrevious], total: 1 };
          }
          if (query["sys.createdAt[gt]"] === effectiveDate) return { items: [undatedNext], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/current-dated", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Equal-date previous article", slug: "equal-previous" },
      next: { title: "Undated next article", slug: "undated-next" },
    });
  });

  it("keeps an older undated chronological neighbor visible past an equal-date next candidate", async () => {
    const effectiveDate = "2026-06-20T00:00:00.000Z";
    const current = navigationArticle({
      title: "Current dated article",
      slug: "current-dated",
      createAt: effectiveDate,
      createdAt: "2026-06-10T00:00:00.000Z",
    });
    const undatedPrevious = navigationArticle({
      title: "Undated previous article",
      slug: "undated-previous",
      createdAt: "2026-06-19T00:00:00.000Z",
    });
    const equalNext = navigationArticle({
      title: "Equal-date next article",
      slug: "equal-next",
      createdAt: effectiveDate,
    });
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          if (query["fields.slug"]) return { items: [current], total: 1 };
          if (query["fields.createAt[exists]"] !== false) return { items: [], total: 0 };
          if (query["sys.createdAt"] === effectiveDate) {
            return { items: [equalNext], total: 1 };
          }
          if (query["sys.createdAt[lt]"] === effectiveDate) return { items: [undatedPrevious], total: 1 };
          return { items: [], total: 0 };
        },
      }),
    });

    const response = await handler({ path: "/article-navigation/current-dated", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      previous: { title: "Undated previous article", slug: "undated-previous" },
      next: { title: "Equal-date next article", slug: "equal-next" },
    });
  });

  it("sanitizes upstream article navigation errors", async () => {
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries() {
          throw new Error("Contentful diagnostic: private-token");
        },
      }),
      logger: { error() {} },
    });

    const response = await handler({ path: "/article-navigation/current-article", query: {} });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), { error: "Failed to fetch article navigation" });
    assert.doesNotMatch(response.body, /Contentful|private-token|diagnostic/i);
  });

  it("does not derive public article language from legacy metadata tags", async () => {
    const article = {
      sys: { id: "article-1" },
      fields: { slug: "hello" },
      metadata: {
        tags: [{ sys: { id: "article-lang-en-us" } }, { sys: { id: "career" } }],
      },
    };
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries() {
          return { items: [article], total: 1 };
        },
      }),
    });

    const response = await handler({ path: "/article/hello", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), article);
  });

  it("returns a public author profile and author articles without identity metadata", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query.content_type === "author") {
            return {
              items: [
                {
                  sys: { id: "author-1" },
                  fields: {
                    name: "Marcelo Munhoz",
                    slug: "marcelo-munhoz",
                    biography: "But first...",
                    email: "private@example.test",
                  },
                },
              ],
              total: 1,
            };
          }

          return {
            items: [{ sys: { id: "article-1" }, fields: { title: "Article", slug: "article" } }],
            total: 1,
          };
        },
      }),
    });

    const response = await handler({ path: "/author/marcelo-munhoz", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      author: {
        sys: { id: "author-1" },
        fields: {
          name: "Marcelo Munhoz",
          slug: "marcelo-munhoz",
          biography: "But first...",
        },
      },
      articles: [{ sys: { id: "article-1" }, fields: { title: "Article", slug: "article" } }],
    });
    assert.deepEqual(calls, [
      {
        content_type: "author",
        "fields.slug": "marcelo-munhoz",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.author.sys.id": "author-1",
        order: "-fields.createAt",
        limit: 100,
      },
    ]);
    assert.doesNotMatch(response.body, /private@example|identity|roles|invite/i);
  });

  it("resolves public author routes from a derived name slug when Contentful slug is missing", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query.content_type === "author" && query["fields.slug"]) {
            return { items: [], total: 0 };
          }

          if (query.content_type === "author") {
            return {
              items: [
                {
                  sys: { id: "author-1" },
                  fields: {
                    name: "Marcelo Munhoz",
                    biography: "But first...",
                    photo: "https://secure.gravatar.com/avatar/example",
                  },
                },
              ],
              total: 1,
            };
          }

          return {
            items: [{ sys: { id: "article-1" }, fields: { title: "Article", slug: "article" } }],
            total: 1,
          };
        },
      }),
    });

    const response = await handler({ path: "/author/marcelo-munhoz", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      author: {
        sys: { id: "author-1" },
        fields: {
          name: "Marcelo Munhoz",
          slug: "marcelo-munhoz",
          biography: "But first...",
          photo: "https://secure.gravatar.com/avatar/example",
        },
      },
      articles: [{ sys: { id: "article-1" }, fields: { title: "Article", slug: "article" } }],
    });
    assert.deepEqual(calls, [
      {
        content_type: "author",
        "fields.slug": "marcelo-munhoz",
        limit: 1,
      },
      {
        content_type: "author",
        limit: 100,
      },
      {
        content_type: "article",
        "fields.author.sys.id": "author-1",
        order: "-fields.createAt",
        limit: 100,
      },
    ]);
  });

  it("resolves public author routes when Contentful rejects the optional slug field filter", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query.content_type === "author" && query["fields.slug"]) {
            throw new Error("InvalidQuery");
          }

          if (query.content_type === "author") {
            return {
              items: [
                {
                  sys: { id: "author-1" },
                  fields: {
                    name: "Marcelo Munhoz",
                    bio: {
                      nodeType: "document",
                      data: {},
                      content: [
                        {
                          nodeType: "paragraph",
                          data: {},
                          content: [{ nodeType: "text", value: "But first...", marks: [], data: {} }],
                        },
                      ],
                    },
                    photo: {
                      fields: {
                        file: {
                          url: "//images.ctfassets.net/space/marcelo.jpg",
                        },
                      },
                    },
                  },
                },
              ],
              total: 1,
            };
          }

          return {
            items: [
              {
                sys: { id: "article-1" },
                fields: {
                  title: "Article",
                  slug: "article",
                  author: { sys: { id: "author-1" } },
                },
              },
            ],
            total: 1,
          };
        },
      }),
    });

    const response = await handler({ path: "/author/marcelo-munhoz", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), {
      author: {
        sys: { id: "author-1" },
        fields: {
          name: "Marcelo Munhoz",
          slug: "marcelo-munhoz",
          biography: "But first...",
          photo: {
            fields: {
              file: {
                url: "//images.ctfassets.net/space/marcelo.jpg",
              },
            },
          },
        },
      },
      articles: [
        {
          sys: { id: "article-1" },
          fields: {
            title: "Article",
            slug: "article",
            author: { sys: { id: "author-1" } },
          },
        },
      ],
    });
    assert.deepEqual(calls, [
      {
        content_type: "author",
        "fields.slug": "marcelo-munhoz",
        limit: 1,
      },
      {
        content_type: "author",
        limit: 100,
      },
      {
        content_type: "article",
        "fields.author.sys.id": "author-1",
        order: "-fields.createAt",
        limit: 100,
      },
    ]);
  });

  it("falls back to local author article matching when Contentful rejects linked author filters", async () => {
    const calls = [];
    const articleForAuthor = {
      sys: { id: "article-1" },
      fields: {
        title: "Article",
        slug: "article",
        author: { sys: { id: "author-1" }, fields: { name: "Marcelo Munhoz" } },
      },
    };
    const articleForOtherAuthor = {
      sys: { id: "article-2" },
      fields: {
        title: "Other",
        slug: "other",
        author: { sys: { id: "author-2" }, fields: { name: "Guest Writer" } },
      },
    };
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries(query) {
          calls.push(query);

          if (query.content_type === "author") {
            return {
              items: [
                {
                  sys: { id: "author-1" },
                  fields: {
                    name: "Marcelo Munhoz",
                    slug: "marcelo-munhoz",
                  },
                },
              ],
              total: 1,
            };
          }

          if (query["fields.author.sys.id"]) {
            throw new Error("InvalidQuery");
          }

          return { items: [articleForAuthor, articleForOtherAuthor], total: 2 };
        },
      }),
    });

    const response = await handler({ path: "/author/marcelo-munhoz", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body).articles, [articleForAuthor]);
    assert.deepEqual(calls, [
      {
        content_type: "author",
        "fields.slug": "marcelo-munhoz",
        limit: 1,
      },
      {
        content_type: "article",
        "fields.author.sys.id": "author-1",
        order: "-fields.createAt",
        limit: 100,
      },
      {
        content_type: "article",
        include: 2,
        order: "-fields.createAt",
        limit: 100,
      },
    ]);
  });

  it("returns 404 JSON when author slug is not found", async () => {
    const handler = createContentfulHandler({ client: createClient() });

    const response = await handler({ path: "/author/missing", query: {} });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Author not found" });
  });

  it("returns 404 JSON when article slug is not found", async () => {
    const handler = createContentfulHandler({ client: createClient() });

    const response = await handler({ path: "/article/missing", query: {} });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Article not found" });
  });

  it("returns a safe configuration error when credentials are missing", async () => {
    const messages = [];
    const handler = createContentfulHandler({ env: {}, logger: { error: (...args) => messages.push(args.join(" ")) } });

    const response = await handler({ path: "/entries", query: {} });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), { error: "Server configuration error" });
    assert.doesNotMatch(response.body, /CONTENTFUL|token|key|secret/i);
    assert.deepEqual(messages, ["Contentful runtime configuration is missing"]);
  });

  it("fetches entries from the Contentful Delivery API and resolves included links", async () => {
    const calls = [];
    const handler = createContentfulHandler({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_DELIVERY_KEY: "delivery-key",
      },
      async fetchImpl(url, options) {
        calls.push({ url: url.toString(), options });

        return {
          ok: true,
          async json() {
            return {
              items: [
                {
                  sys: { id: "article-1", type: "Entry" },
                  fields: {
                    author: { sys: { type: "Link", linkType: "Entry", id: "author-1" } },
                  },
                },
              ],
              includes: {
                Entry: [
                  {
                    sys: { id: "author-1", type: "Entry" },
                    fields: { name: "Marcelo Munhoz" },
                  },
                ],
              },
              total: 1,
            };
          },
        };
      },
    });

    const response = await handler({ path: "/entries", query: { page: "2" } });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body).items[0].fields.author.fields, { name: "Marcelo Munhoz" });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.headers.authorization, "Bearer delivery-key");

    const url = new URL(calls[0].url);
    assert.equal(url.origin, "https://cdn.contentful.com");
    assert.equal(url.pathname, "/spaces/space-id/environments/master/entries");
    assert.equal(url.searchParams.get("content_type"), "article");
    assert.equal(url.searchParams.get("limit"), "3");
    assert.equal(url.searchParams.get("skip"), "3");
  });

  it("serializes false missing-date filters for runtime article navigation requests", async () => {
    const current = navigationArticle({
      title: "Current article",
      slug: "current-article",
      createAt: "2025-06-10T00:00:00.000Z",
      createdAt: "2025-06-20T00:00:00.000Z",
    });
    const urls = [];
    const handler = createContentfulHandler({
      env: {
        CONTENTFUL_SPACE_ID: "space-id",
        CONTENTFUL_DELIVERY_KEY: "delivery-key",
      },
      async fetchImpl(input) {
        const url = new URL(input);
        urls.push(url);

        return {
          ok: true,
          async json() {
            return url.searchParams.get("fields.slug") === "current-article"
              ? { items: [current], total: 1 }
              : { items: [], total: 0 };
          },
        };
      },
    });

    const response = await handler({ path: "/article-navigation/current-article", query: {} });
    const missingDateRequests = urls.filter((url) => url.searchParams.has("fields.createAt[exists]"));

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { previous: null, next: null });
    assert.equal(missingDateRequests.length, 4);
    assert.deepEqual(
      missingDateRequests.map((url) => url.searchParams.get("fields.createAt[exists]")),
      ["false", "false", "false", "false"]
    );
    assert.deepEqual(
      missingDateRequests.map((url) => url.searchParams.get("limit")),
      ["1", "1", "1", "1"]
    );
  });

  it("normalizes upstream errors without leaking diagnostics", async () => {
    const messages = [];
    const handler = createContentfulHandler({
      client: createClient({
        async getEntries() {
          throw new Error("upstream failed with secret-token");
        },
      }),
      logger: { error: (...args) => messages.push(args.join(" ")) },
    });

    const response = await handler({ path: "/entries", query: {} });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(JSON.parse(response.body), { error: "Failed to fetch content" });
    assert.doesNotMatch(response.body, /secret-token|stack|upstream failed/i);
    assert.equal(messages.length, 1);
  });

  it("returns 404 for unknown proxy routes", async () => {
    const handler = createContentfulHandler({ client: createClient() });

    const response = await handler({ path: "/unknown", query: {} });

    assert.equal(response.statusCode, 404);
    assert.deepEqual(JSON.parse(response.body), { error: "Not found" });
  });

  it("normalizes Netlify Function redirect paths before routing", async () => {
    const handler = createContentfulHandler({
      client: createClient({
        async getTags() {
          return { items: [{ sys: { id: "netlify" } }] };
        },
      }),
    });

    const response = await handler({ path: "/.netlify/functions/contentful/tags", query: {} });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { items: [{ sys: { id: "netlify" } }] });
  });
});
