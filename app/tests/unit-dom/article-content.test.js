import { describe, expect, it } from "vitest";
import fixture from "../fixtures/article-markdown-regression.json";
import { articleContentBlocks, canonicalYoutubeEmbedUrl } from "../../src/utils/articleContent.js";

const markdownHtml = (blocks) => blocks.filter((block) => block.type === "markdown").map((block) => block.html).join("");

const renderedMarkdown = (source) => {
  const element = document.createElement("div");
  element.innerHTML = markdownHtml(articleContentBlocks(source));
  return element;
};

describe("safe article content", () => {
  it("renders supported Markdown semantics and preserves Unicode emoji", () => {
    const rendered = renderedMarkdown(fixture.markdown);

    expect(rendered.querySelector("h2")?.textContent).toBe("Safe formatting");
    expect(rendered.querySelector("em")?.textContent).toBe("boring");
    expect(rendered.querySelector("strong")?.textContent).toBe("important");
    expect(rendered.querySelector('a[href="https://example.test/reference"]')?.textContent).toBe("documented");
    expect(rendered.querySelector("blockquote")?.textContent).toContain("A safe quotation.");
    expect([...rendered.querySelectorAll("li")].map((item) => item.textContent.trim())).toEqual(["First item", "Second item"]);
    expect(rendered.querySelector("code")?.textContent).toBe("const safe = true;");
    expect(rendered.querySelector("table")?.textContent).toContain("Markdown");
    expect(rendered.querySelector("img")?.getAttribute("src")).toBe("https://res.cloudinary.com/demo/image/upload/diagram.png");
    expect(rendered.textContent).toContain(fixture.existingEmoji);
  });

  it("removes active HTML, hostile attributes, unsafe links, and disallowed images", () => {
    const rendered = renderedMarkdown(`${fixture.markdown}\n\n![Blocked](https://attacker.example.test/tracker.png)`);

    expect(rendered.textContent).toContain("Safe formatting");
    expect(rendered.textContent).toContain("Unsafe link");
    expect(rendered.querySelector("script")).toBeNull();
    expect(rendered.querySelector("iframe")).toBeNull();
    expect(rendered.querySelector("[onerror]")).toBeNull();
    expect(rendered.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(rendered.querySelector('img[src^="https://attacker.example.test"]')).toBeNull();
    expect(globalThis.fixtureCompromised).toBeUndefined();
  });

  it("rejects executable CMS content across links, images, markup, and lookalike video hosts", () => {
    const source = [
      "<script>globalThis.articleCompromised = true</script>",
      '<img src="https://res.cloudinary.com/demo/image/upload/safe.png" onload="globalThis.articleCompromised = true">',
      "[Run](javascript:globalThis.articleCompromised=true)",
      "![Inline payload](data:image/svg+xml,<svg onload=globalThis.articleCompromised=true>)",
      '<iframe src="https://www.youtube-nocookie.com/embed/bovBQtB_PDo" allow="*" onload="globalThis.articleCompromised = true"></iframe>',
      "https://www.youtube-nocookie.com.attacker.example/embed/bovBQtB_PDo",
    ].join("\n\n");
    const blocks = articleContentBlocks(source);
    const rendered = renderedMarkdown(source);

    expect(blocks.every((block) => block.type === "markdown")).toBe(true);
    expect(rendered.querySelector("script, iframe, [onload]")).toBeNull();
    expect(rendered.querySelector('a[href^="javascript:"]')).toBeNull();
    expect(rendered.querySelector('img[src^="data:"]')).toBeNull();
    expect(globalThis.articleCompromised).toBeUndefined();
  });

  it("canonicalizes CMS video parameters without accepting CMS-controlled player attributes", () => {
    const source = [
      '<iframe src="https://attacker.example/embed/bovBQtB_PDo" title="CMS title" allow="*" allowfullscreen></iframe>',
      "https://www.youtube-nocookie.com/embed/bovBQtB_PDo?autoplay=1&controls=0",
    ].join("\n\n");
    const blocks = articleContentBlocks(source);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "markdown", html: expect.not.stringContaining("<iframe") });
    expect(blocks[1]).toEqual({ type: "youtube", src: fixture.expectedVideoUrl });
    expect(Object.keys(blocks[1])).toEqual(["type", "src"]);
  });

  it("exposes only sanitized HTML and trusted structured media to rendering boundaries", () => {
    const blocks = articleContentBlocks(fixture.markdown);
    const allowedTags = new Set([
      "A", "BLOCKQUOTE", "BR", "CODE", "DEL", "EM", "H1", "H2", "H3", "H4", "H5", "H6", "HR", "IMG", "LI", "OL",
      "P", "PRE", "STRONG", "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "UL",
    ]);
    const allowedAttributes = new Set(["alt", "href", "rel", "src", "title"]);

    for (const block of blocks) {
      if (block.type === "youtube") {
        expect(block).toEqual({ type: "youtube", src: fixture.expectedVideoUrl });
        continue;
      }

      expect(block).toEqual({ type: "markdown", html: expect.any(String) });
      const boundary = document.createElement("div");
      boundary.innerHTML = block.html;
      for (const element of boundary.querySelectorAll("*")) {
        expect(allowedTags.has(element.tagName)).toBe(true);
        for (const attribute of element.attributes) {
          expect(allowedAttributes.has(attribute.name)).toBe(true);
        }
      }
    }
  });

  it("keeps the exact source order around a standalone trusted video", () => {
    const blocks = articleContentBlocks(`Before the player.\n\n${fixture.standaloneVideoUrl}\n\nAfter the player.`);

    expect(blocks).toEqual([
      { type: "markdown", html: "<p>Before the player.</p>\n" },
      { type: "youtube", src: fixture.expectedVideoUrl },
      { type: "markdown", html: "<p>After the player.</p>\n" },
    ]);
  });

  it.each([
    ["https://www.youtube.com/embed/bovBQtB_PDo", "https://www.youtube-nocookie.com/embed/bovBQtB_PDo"],
    ["https://youtube.com/watch?v=bovBQtB_PDo", "https://www.youtube-nocookie.com/embed/bovBQtB_PDo"],
    ["https://youtu.be/bovBQtB_PDo", "https://www.youtube-nocookie.com/embed/bovBQtB_PDo"],
  ])("canonicalizes an approved YouTube URL: %s", (source, expected) => {
    expect(canonicalYoutubeEmbedUrl(source)).toBe(expected);
  });

  it.each(fixture.unsafeUrls)("rejects an untrusted video URL: %s", (source) => {
    expect(canonicalYoutubeEmbedUrl(source)).toBeNull();
    const blocks = articleContentBlocks(source);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("markdown");
    expect(blocks.some((block) => block.type === "youtube")).toBe(false);
  });

  it("does not promote an inline or fenced YouTube URL to a player", () => {
    const inlineBlocks = articleContentBlocks(fixture.inlineVideoMarkdown);
    const fencedBlocks = articleContentBlocks(`\`\`\`text\n${fixture.standaloneVideoUrl}\n\`\`\``);

    expect(inlineBlocks).toHaveLength(1);
    expect(inlineBlocks[0].type).toBe("markdown");
    expect(fencedBlocks).toHaveLength(1);
    expect(fencedBlocks[0].type).toBe("markdown");
    expect(markdownHtml(fencedBlocks)).toContain(fixture.standaloneVideoUrl);
  });
});
