import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { articleNavigationLabels } from "../src/utils/articleDates.js";
import { articleArchiveTags, blogArticleLocation, blogReturnLocation } from "../src/utils/blogArchive.js";
import { cloudinaryImg, sortAnything } from "../src/utils/homeMedia.js";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

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
    assert.equal(blogReturnLocation({ blogReturnTo: "/blog?page=4&tag=architecture" }), "/blog?page=4&tag=architecture");
    assert.equal(blogReturnLocation({ blogReturnTo: "https://untrusted.example.test" }), "/blog");
  });

  it("preserves the validated archive return across chronological article links", () => {
    const archiveUrl = "/blog?page=4&tag=architecture";
    const currentLocation = blogArticleLocation({ slug: "current" }, archiveUrl);
    const currentArchiveLocation = blogReturnLocation(currentLocation.state);
    const neighborLocation = blogArticleLocation({ title: "Previous article", slug: "previous" }, currentArchiveLocation);

    assert.deepEqual(neighborLocation, {
      name: "Artigo",
      params: { slug: "previous" },
      state: { blogReturnTo: archiveUrl },
    });
    assert.equal("query" in neighborLocation, false);
    assert.equal(blogReturnLocation(neighborLocation.state), archiveUrl);
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

  it("keeps labelled controls and visible archive states stable", () => {
    const page = read("../src/pages/Blog.vue");

    assert.match(page, /label="Search articles"/);
    assert.match(page, /label="Year"/);
    assert.match(page, /label="Tag"/);
    assert.match(page, /<BlogHighlights\s+v-if="featured\.length"/);
    assert.match(page, /<BlogArchiveList/);
    assert.match(page, /v-if="loading"/);
    assert.match(page, /v-else-if="error"/);
    assert.match(page, /@click="loadArchive"/);
    assert.match(page, /v-else-if="articles\.length === 0"/);
  });

  it("switches mobile pagination out of the expansive numbered-button combination", () => {
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

  it("defensively ignores malformed tags when the archive list is used directly", () => {
    for (const tags of [null, {}, [null]]) {
      let result;
      assert.doesNotThrow(() => {
        result = articleArchiveTags({ metadata: { tags } });
      });
      assert.deepEqual(result, []);
    }

    assert.deepEqual(
      articleArchiveTags({
        metadata: { tags: [{ sys: { id: "architecture" } }, { sys: { id: "article-lang-en-us" } }] },
      }),
      ["architecture"]
    );
  });

  it("keeps the shared home media helpers deterministic without mutating source lists", () => {
    const projects = [{ projectName: "Zulu" }, { projectName: "Alpha" }];

    assert.deepEqual(sortAnything(projects, "projectName"), [{ projectName: "Alpha" }, { projectName: "Zulu" }]);
    assert.deepEqual(projects, [{ projectName: "Zulu" }, { projectName: "Alpha" }]);
    assert.equal(
      cloudinaryImg("me", 500).replace(/\?_a=[^&]+$/, ""),
      "https://res.cloudinary.com/marcelo-munhoz/image/upload/c_fit,w_500/v1/marcelo-munhoz-website/me"
    );
  });

});
