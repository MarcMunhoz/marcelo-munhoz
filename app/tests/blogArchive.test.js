import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  blogArticleLocation,
  blogPaginationDisplay,
  blogReturnLocation,
  blogRouteQuery,
  blogTagOptions,
  normalizeBlogRouteQuery,
  validateBlogIndexPayload,
  validateBlogYearsPayload,
} from "../src/utils/blogArchive.js";

const validArticle = (slug = "article") => ({
  fields: { title: `Article ${slug}`, slug },
  metadata: { tags: [] },
});

describe("blog archive route state", () => {
  it("normalizes the supported blog archive query values", () => {
    assert.deepEqual(normalizeBlogRouteQuery({ page: "4", q: "  architecture  ", year: "2025", tag: "AI" }), {
      page: 4,
      q: "architecture",
      year: "2025",
      tag: "AI",
    });
  });

  it("normalizes invalid archive values with the public API bounds", () => {
    assert.deepEqual(
      normalizeBlogRouteQuery({
        page: "750599937895084",
        q: "  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ",
        year: "1800",
        tag: "invalid tag!",
      }),
      {
        page: 1,
        q: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        year: "",
        tag: "",
      }
    );
  });

  it("omits default archive state from the serialized query", () => {
    assert.deepEqual(blogRouteQuery({ page: 1, q: "", year: "", tag: "" }), {});
  });

  it("serializes only normalized non-default archive state", () => {
    assert.deepEqual(blogRouteQuery({ page: "4", q: "  architecture  ", year: "2025", tag: "AI" }), {
      page: "4",
      q: "architecture",
      year: "2025",
      tag: "AI",
    });
  });

  it("keeps archive return state out of the named article URL", () => {
    assert.deepEqual(blogArticleLocation({ slug: "architecture" }, "/blog?page=4&q=architecture&year=2025&tag=AI"), {
      name: "Artigo",
      params: { slug: "architecture" },
      state: { blogReturnTo: "/blog?page=4&q=architecture&year=2025&tag=AI" },
    });
  });

  it("returns a stored internal blog URL", () => {
    assert.equal(blogReturnLocation({ blogReturnTo: "/blog?page=66&tag=AI" }), "/blog?page=66&tag=AI");
  });

  it("falls back to the archive for unsafe return URLs", () => {
    for (const value of ["https://untrusted.example.test", "//untrusted.example.test", "/blog#section", "/about", "/blog/articles"]) {
      assert.equal(blogReturnLocation({ blogReturnTo: value }), "/blog");
    }
  });

  it("derives literal desktop and compact pagination options", () => {
    assert.deepEqual(blogPaginationDisplay(true), {
      input: true,
      boundaryLinks: false,
      boundaryNumbers: false,
      ellipses: false,
      maxPages: 1,
    });
    assert.deepEqual(blogPaginationDisplay(false), {
      input: false,
      boundaryLinks: false,
      boundaryNumbers: true,
      ellipses: true,
      maxPages: 9,
    });
  });

  it("validates archive and published-year payloads before rendering", () => {
    const archive = {
      featured: [validArticle("featured")],
      items: [validArticle("archive")],
      total: 1,
      page: 1,
      pageSize: 12,
      totalPages: 1,
    };

    assert.equal(validateBlogIndexPayload(archive), archive);
    assert.throws(
      () => validateBlogIndexPayload({ ...archive, items: [{}] }),
      { name: "TypeError", message: "Invalid blog index payload" }
    );
    assert.deepEqual(validateBlogYearsPayload({ years: ["2026", "2024"] }), { years: ["2026", "2024"] });
    assert.throws(
      () => validateBlogYearsPayload({ years: ["2026", "2026"] }),
      { name: "TypeError", message: "Invalid blog years payload" }
    );
  });

  it("maps only usable non-language tags to archive options", () => {
    assert.deepEqual(
      blogTagOptions({
        items: [
          { name: "Architecture", sys: { id: "architecture" } },
          { name: "Article language: Portuguese", sys: { id: "article-lang-pt-br" } },
          { name: "Missing id", sys: {} },
        ],
      }),
      [{ label: "Architecture", value: "architecture" }]
    );
  });
});
