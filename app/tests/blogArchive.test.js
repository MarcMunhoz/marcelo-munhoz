import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { blogArticleLocation, blogReturnLocation, blogRouteQuery, normalizeBlogRouteQuery } from "../src/utils/blogArchive.js";

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
});
