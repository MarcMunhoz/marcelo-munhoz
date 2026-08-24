import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("public responsive layout", () => {
  it("keeps the compact global shell accessible and contained", () => {
    const layout = read("../src/layouts/MainLayout.vue");
    const app = read("../src/App.vue");

    assert.match(layout, /class="site-toolbar"/);
    assert.match(layout, /class="site-toolbar-title"/);
    assert.match(layout, /aria-label="About"/);
    assert.match(layout, /aria-label="Blog"/);
    assert.match(layout, /aria-label="Admin"/);
    const adminDropdown = layout.match(/<q-btn-dropdown\b[^>]*>/)?.[0] || "";
    assert.match(adminDropdown, /id="admin-menu-trigger"/);
    assert.match(adminDropdown, /toggle-aria-label="Admin"/);
    assert.match(layout, /<\/q-btn-dropdown>\s*<q-tooltip target="#admin-menu-trigger">Admin<\/q-tooltip>/);
    const compactShell = layout.match(/@media \(max-width: 700px\) \{([\s\S]*)\n\}/)?.[1] || "";
    assert.match(compactShell, /\.site-nav-action\s*\{[\s\S]*?:deep\(\.block\)\s*\{\s*display:\s*none\s*!important;/);
    assert.match(layout, /class="site-footer-content"/);
    assert.match(layout, /white-space:\s*normal/);
    assert.match(layout, /min-width:\s*min\(240px,\s*calc\(100vw - 24px\)\)/);
    assert.match(layout, /@media \(max-width:\s*700px\)/);
    assert.match(app, /class="cookie-card"/);
    assert.match(app, /class="cookie-card-body"/);
    assert.match(app, /overflow-y:\s*auto/);
  });

  it("bounds public page content at the compact breakpoint", () => {
    const home = read("../src/pages/IndexPage.vue");
    const about = read("../src/pages/About.vue");
    const article = read("../src/components/BlogArticle.vue");

    assert.match(home, /clamp\(/);
    assert.match(home, /class="home-hero flex flex-nowrap justify-center max-h-\[500px\]"/);
    assert.match(home, /knowledge-grid/);
    assert.match(home, /home-projects/);
    assert.match(home, /@media \(max-width:\s*700px\)/);
    const compactProjectChipRule = home.match(/\.home-projects :deep\(\.q-chip\) \{([\s\S]*?)\n  \}/)?.[1] || "";
    assert.match(compactProjectChipRule, /height:\s*auto/);
    assert.match(compactProjectChipRule, /min-height:\s*2em/);
    assert.match(about, /about-introduction/);
    assert.match(about, /@media \(max-width:\s*700px\)/);
    assert.match(article, /article-tags/);
    assert.match(article, /overflow-wrap:\s*anywhere/);
    assert.match(article, /overflow-x:\s*auto/);
    assert.match(article, /max-width:\s*100%/);
  });
});
