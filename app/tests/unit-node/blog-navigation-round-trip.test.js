import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isDeepStrictEqual } from "node:util";

import { createContentfulHandler } from "../../netlify/functions/contentfulProxyCore.js";
import {
  blogArticleLocation,
  blogReturnLocation,
  blogRouteQuery,
  isCurrentArticleNavigationRequest,
  isCurrentArticleRouteRequest,
  normalizeBlogRouteQuery,
  validateBlogArticleNavigationPayload,
  validateBlogArticlePayload,
} from "../../src/utils/blogArchive.js";

const contentTypeLink = {
  sys: { type: "Link", linkType: "ContentType", id: "article" },
};

const fixtureAuthor = {
  sys: { id: "fixture-author", type: "Entry" },
  fields: { name: "Archive Author", slug: "archive-author" },
};

const currentArticle = {
  sys: {
    id: "fixture-current",
    type: "Entry",
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T12:00:00.000Z",
    contentType: contentTypeLink,
  },
  metadata: { tags: [{ sys: { type: "Link", linkType: "Tag", id: "architecture" } }] },
  fields: {
    title: "Current systems article",
    slug: "current-systems-article",
    description: "A deterministic current article used by the archive round trip.",
    body: "Current article body.",
    createAt: "2026-06-10T00:00:00.000Z",
    locale: "en-US",
    thumbnailAlt: "Current article illustration",
    thumbnail: {
      sys: { id: "fixture-current-image", type: "Asset" },
      fields: {
        title: "Current article illustration",
        file: {
          url: "//images.example.test/current.jpg",
          fileName: "current.jpg",
          contentType: "image/jpeg",
          details: { size: 1_024, image: { width: 1_200, height: 630 } },
        },
      },
    },
    author: fixtureAuthor,
  },
};

const previousArticle = {
  sys: {
    id: "fixture-previous",
    type: "Entry",
    createdAt: "2026-06-09T23:00:00.000Z",
    updatedAt: "2026-06-10T01:00:00.000Z",
    contentType: contentTypeLink,
  },
  metadata: { tags: [{ sys: { type: "Link", linkType: "Tag", id: "architecture" } }] },
  fields: {
    title: "Previous systems article",
    slug: "previous-systems-article",
    description: "An undated article whose system date supplies the editorial fallback.",
    body: "Previous article body.",
    locale: "en-US",
    thumbnailAlt: "Previous article illustration",
    thumbnail: {
      sys: { id: "fixture-previous-image", type: "Asset" },
      fields: {
        title: "Previous article illustration",
        file: {
          url: "//images.example.test/previous.jpg",
          fileName: "previous.jpg",
          contentType: "image/jpeg",
          details: { size: 960, image: { width: 1_200, height: 630 } },
        },
      },
    },
    author: fixtureAuthor,
  },
};

const nextArticle = {
  sys: {
    id: "fixture-next",
    type: "Entry",
    createdAt: "2026-06-10T11:00:00.000Z",
    updatedAt: "2026-06-10T13:00:00.000Z",
    contentType: contentTypeLink,
  },
  metadata: { tags: [{ sys: { type: "Link", linkType: "Tag", id: "architecture" } }] },
  fields: {
    title: "Next systems article",
    slug: "next-systems-article",
    description: "A same-date article ordered by the system timestamp tie-breaker.",
    body: "Next article body.",
    createAt: "2026-06-10T00:00:00.000Z",
    locale: "en-US",
    thumbnailAlt: "Next article illustration",
    thumbnail: {
      sys: { id: "fixture-next-image", type: "Asset" },
      fields: {
        title: "Next article illustration",
        file: {
          url: "//images.example.test/next.jpg",
          fileName: "next.jpg",
          contentType: "image/jpeg",
          details: { size: 1_088, image: { width: 1_200, height: 630 } },
        },
      },
    },
    author: fixtureAuthor,
  },
};

describe("blog navigation cross-layer contract", () => {
  it("validates renderable article and chronological-navigation payloads", () => {
    assert.equal(validateBlogArticlePayload(currentArticle), currentArticle);
    assert.throws(
      () => validateBlogArticlePayload({ ...currentArticle, fields: { ...currentArticle.fields, body: "" } }),
      { name: "TypeError", message: "Invalid blog article payload" }
    );

    const navigation = {
      previous: { title: "Previous systems article", slug: "previous-systems-article" },
      next: { title: "Next systems article", slug: "next-systems-article" },
    };
    assert.equal(validateBlogArticleNavigationPayload(navigation), navigation);
    assert.throws(
      () => validateBlogArticleNavigationPayload({ previous: { title: "", slug: "broken" }, next: null }),
      { name: "TypeError", message: "Invalid blog article navigation payload" }
    );
  });

  it("accepts only article and navigation responses for the current slug and request ids", () => {
    assert.equal(
      isCurrentArticleRouteRequest({ requestId: 4, currentRequestId: 4, requestedSlug: "current", currentSlug: "current" }),
      true
    );
    assert.equal(
      isCurrentArticleRouteRequest({ requestId: 3, currentRequestId: 4, requestedSlug: "old", currentSlug: "current" }),
      false
    );
    assert.equal(
      isCurrentArticleNavigationRequest({
        requestId: 8,
        currentRequestId: 8,
        articleRequestId: 4,
        currentArticleRequestId: 4,
        requestedSlug: "current",
        currentSlug: "current",
      }),
      true
    );
    assert.equal(
      isCurrentArticleNavigationRequest({
        requestId: 7,
        currentRequestId: 8,
        articleRequestId: 3,
        currentArticleRequestId: 4,
        requestedSlug: "old",
        currentSlug: "current",
      }),
      false
    );
  });

  it("keeps canonical archive state, the selected slug, and chronological neighbors aligned", async () => {
    const expectedQueries = [
      {
        query: {
          content_type: "article",
          order: "-fields.createAt,-sys.createdAt",
          limit: 12,
          skip: 12,
          query: "systems design",
          "fields.createAt[gte]": "2026-01-01T00:00:00.000Z",
          "fields.createAt[lt]": "2027-01-01T00:00:00.000Z",
          "metadata.tags.sys.id[all]": "architecture",
        },
        result: { items: [currentArticle], total: 13 },
      },
      {
        query: { content_type: "article", "fields.slug": "current-systems-article", limit: 1 },
        result: { items: [currentArticle], total: 1 },
      },
      {
        query: { content_type: "article", "fields.slug": "current-systems-article", limit: 1 },
        result: { items: [currentArticle], total: 1 },
      },
      {
        query: {
          content_type: "article",
          "fields.createAt": "2026-06-10T00:00:00.000Z",
          "sys.createdAt[lt]": "2026-06-10T10:00:00.000Z",
          order: "-sys.createdAt",
          limit: 1,
        },
        result: { items: [], total: 0 },
      },
      {
        query: {
          content_type: "article",
          "fields.createAt[lt]": "2026-06-10T00:00:00.000Z",
          order: "-fields.createAt,-sys.createdAt",
          limit: 1,
        },
        result: { items: [], total: 0 },
      },
      {
        query: {
          content_type: "article",
          "fields.createAt[exists]": false,
          "sys.createdAt[lt]": "2026-06-10T00:00:00.000Z",
          order: "-sys.createdAt",
          limit: 1,
        },
        result: { items: [previousArticle], total: 1 },
      },
      {
        query: {
          content_type: "article",
          "fields.createAt[exists]": false,
          "sys.createdAt": "2026-06-10T00:00:00.000Z",
          order: "-sys.createdAt",
          limit: 1,
        },
        result: { items: [], total: 0 },
      },
      {
        query: {
          content_type: "article",
          "fields.createAt": "2026-06-10T00:00:00.000Z",
          "sys.createdAt[gt]": "2026-06-10T10:00:00.000Z",
          order: "sys.createdAt",
          limit: 1,
        },
        result: { items: [nextArticle], total: 1 },
      },
      {
        query: {
          content_type: "article",
          "fields.createAt[exists]": false,
          "sys.createdAt[gt]": "2026-06-10T00:00:00.000Z",
          order: "sys.createdAt",
          limit: 1,
        },
        result: { items: [], total: 0 },
      },
      {
        query: {
          content_type: "article",
          "fields.createAt[exists]": false,
          "sys.createdAt": "2026-06-10T00:00:00.000Z",
          order: "sys.createdAt",
          limit: 1,
        },
        result: { items: [], total: 0 },
      },
    ];
    const calls = [];
    const client = {
      async getEntries(query) {
        calls.push(query);
        assert.equal(Number.isSafeInteger(query.limit), true, "every Contentful query must have an integer limit");
        assert.equal(query.limit >= 1 && query.limit <= 12, true, "every Contentful query must remain bounded");

        if ("skip" in query) {
          assert.equal(Number.isSafeInteger(query.skip) && query.skip >= 0 && query.skip <= 12, true, "archive skip must remain bounded");
        }

        const expectedIndex = expectedQueries.findIndex(({ query: expectedQuery }) => isDeepStrictEqual(query, expectedQuery));

        if (expectedIndex === -1) {
          throw new Error(`Unexpected Contentful query: ${JSON.stringify(query)}`);
        }

        const [{ result }] = expectedQueries.splice(expectedIndex, 1);
        return result;
      },
      async getTags() {
        throw new Error("Unexpected Contentful tag query");
      },
    };
    const handler = createContentfulHandler({ client });

    const archiveState = normalizeBlogRouteQuery({
      page: "2",
      q: "  systems   design  ",
      year: "2026",
      tag: "architecture",
    });
    const archiveQuery = blogRouteQuery(archiveState);
    const archiveUrl = `/blog?${new URLSearchParams(archiveQuery).toString()}`;

    assert.deepEqual(archiveState, { page: 2, q: "systems design", year: "2026", tag: "architecture" });
    assert.deepEqual(archiveQuery, { page: "2", q: "systems design", year: "2026", tag: "architecture" });
    assert.equal(archiveUrl, "/blog?page=2&q=systems+design&year=2026&tag=architecture");

    const indexResponse = await handler({ path: "/blog-index", query: archiveQuery });
    const indexPayload = JSON.parse(indexResponse.body);

    assert.equal(indexResponse.statusCode, 200);
    assert.deepEqual(indexPayload, {
      featured: [],
      items: [currentArticle],
      total: 13,
      page: 2,
      pageSize: 12,
      totalPages: 2,
    });
    assert.equal(indexPayload.items[0].fields.slug, "current-systems-article");
    assert.deepEqual(
      [indexPayload.items[0].fields.createAt || indexPayload.items[0].sys.createdAt, indexPayload.items[0].sys.createdAt],
      ["2026-06-10T00:00:00.000Z", "2026-06-10T10:00:00.000Z"]
    );

    const articleLocation = blogArticleLocation(indexPayload.items[0], archiveUrl);

    assert.deepEqual(articleLocation, {
      name: "Artigo",
      params: { slug: "current-systems-article" },
      state: { blogReturnTo: "/blog?page=2&q=systems+design&year=2026&tag=architecture" },
    });
    assert.equal(`/blog/${articleLocation.params.slug}`, "/blog/current-systems-article");
    assert.equal(blogReturnLocation(articleLocation.state), "/blog?page=2&q=systems+design&year=2026&tag=architecture");

    const articleResponse = await handler({ path: `/article/${articleLocation.params.slug}`, query: {} });
    const articlePayload = JSON.parse(articleResponse.body);

    assert.equal(articleResponse.statusCode, 200);
    assert.equal(articlePayload.fields.slug, "current-systems-article");
    assert.deepEqual([articlePayload.fields.createAt || articlePayload.sys.createdAt, articlePayload.sys.createdAt], [
      "2026-06-10T00:00:00.000Z",
      "2026-06-10T10:00:00.000Z",
    ]);

    const navigationResponse = await handler({ path: `/article-navigation/${articlePayload.fields.slug}`, query: {} });

    assert.equal(navigationResponse.statusCode, 200);
    assert.deepEqual(JSON.parse(navigationResponse.body), {
      previous: { title: "Previous systems article", slug: "previous-systems-article" },
      next: { title: "Next systems article", slug: "next-systems-article" },
    });
    assert.deepEqual(
      [
        [previousArticle.fields.createAt || previousArticle.sys.createdAt, previousArticle.sys.createdAt],
        [currentArticle.fields.createAt || currentArticle.sys.createdAt, currentArticle.sys.createdAt],
        [nextArticle.fields.createAt || nextArticle.sys.createdAt, nextArticle.sys.createdAt],
      ],
      [
        ["2026-06-09T23:00:00.000Z", "2026-06-09T23:00:00.000Z"],
        ["2026-06-10T00:00:00.000Z", "2026-06-10T10:00:00.000Z"],
        ["2026-06-10T00:00:00.000Z", "2026-06-10T11:00:00.000Z"],
      ]
    );
    assert.equal(calls.length, 10);
    assert.deepEqual(expectedQueries, []);
  });
});
