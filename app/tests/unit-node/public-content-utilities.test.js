import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { articleBylineLabels, articleNavigationLabels, publicArticleDates } from "../../src/utils/articleDates.js";
import { articleArchiveTags, blogArticleLocation, blogReturnLocation } from "../../src/utils/blogArchive.js";
import { cloudinaryImg, sortAnything } from "../../src/utils/homeMedia.js";

describe("public content utilities", () => {
  it("localizes article navigation and byline labels", () => {
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
    assert.deepEqual(articleBylineLabels("en-US"), { by: "By", on: "on", updated: "Updated on" });
    assert.deepEqual(articleBylineLabels("pt-BR"), { by: "Por", on: "em", updated: "Atualizado em" });
  });

  it("formats date-only public updates without reporting same-day edits", () => {
    assert.deepEqual(
      publicArticleDates({
        createAt: "2026-06-25T12:00:00.000Z",
        updatedAt: "2026-06-25T22:00:00.000Z",
        locale: "en-US",
      }),
      { created: "June 25, 2026", updated: "" }
    );
    assert.deepEqual(
      publicArticleDates({
        createAt: "2026-06-25T12:00:00.000Z",
        updatedAt: "2026-06-27T08:00:00.000Z",
        locale: "en-US",
      }),
      { created: "June 25, 2026", updated: "June 27, 2026" }
    );
  });

  it("infers byline language from article content when locale metadata is absent", () => {
    assert.deepEqual(
      articleBylineLabels("", { title: "During 9 years my career changed", body: "When I decide to write about software" }),
      { by: "By", on: "on", updated: "Updated on" }
    );
    assert.deepEqual(articleBylineLabels("", { slug: "what-id-learned-last-years", title: "Texto misto" }), {
      by: "By",
      on: "on",
      updated: "Updated on",
    });
    assert.deepEqual(articleBylineLabels("", { tags: ["article-lang-en-us"], title: "Texto misto" }), {
      by: "Por",
      on: "em",
      updated: "Atualizado em",
    });
    assert.deepEqual(
      articleBylineLabels("", { title: "Trabalho remoto no mundo Linux", body: "Você precisa aprender sempre mais" }),
      { by: "Por", on: "em", updated: "Atualizado em" }
    );
  });

  it("preserves a validated archive return across chronological article links", () => {
    const archiveUrl = "/blog?page=4&tag=architecture";
    const currentLocation = blogArticleLocation({ slug: "current" }, archiveUrl);
    const neighborLocation = blogArticleLocation(
      { title: "Previous article", slug: "previous" },
      blogReturnLocation(currentLocation.state)
    );

    assert.deepEqual(neighborLocation, {
      name: "Artigo",
      params: { slug: "previous" },
      state: { blogReturnTo: archiveUrl },
    });
    assert.equal("query" in neighborLocation, false);
    assert.equal(blogReturnLocation(neighborLocation.state), archiveUrl);
  });

  it("defensively ignores malformed and reserved archive tags", () => {
    for (const tags of [null, {}, [null]]) {
      assert.deepEqual(articleArchiveTags({ metadata: { tags } }), []);
    }

    assert.deepEqual(
      articleArchiveTags({
        metadata: { tags: [{ sys: { id: "architecture" } }, { sys: { id: "article-lang-en-us" } }] },
      }),
      ["architecture"]
    );
  });

  it("sorts home media data without mutation and builds deterministic Cloudinary URLs", () => {
    const projects = [{ projectName: "Zulu" }, { projectName: "Alpha" }];

    assert.deepEqual(sortAnything(projects, "projectName"), [{ projectName: "Alpha" }, { projectName: "Zulu" }]);
    assert.deepEqual(projects, [{ projectName: "Zulu" }, { projectName: "Alpha" }]);
    assert.equal(
      cloudinaryImg("me", 500).replace(/\?_a=[^&]+$/, ""),
      "https://res.cloudinary.com/marcelo-munhoz/image/upload/c_fit,w_500/v1/marcelo-munhoz-website/me"
    );
  });
});
