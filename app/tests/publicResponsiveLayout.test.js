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
    assert.match(layout, /aria-label="Navigation menu"/);
    const adminDropdown = layout.match(/<q-btn-dropdown\b[^>]*>/)?.[0] || "";
    assert.match(adminDropdown, /v-if="adminSession"/);
    assert.match(adminDropdown, /id="admin-menu-trigger"/);
    assert.match(adminDropdown, /toggle-aria-label="Admin"/);
    assert.match(layout, /<\/q-btn-dropdown>\s*<q-tooltip v-if="adminSession" target="#admin-menu-trigger">Admin<\/q-tooltip>/);
    assert.match(layout, /class="mobile-navigation-menu"/);
    assert.match(layout, /<q-item-section>About<\/q-item-section>/);
    assert.match(layout, /<q-item-section>Blog<\/q-item-section>/);
    assert.match(layout, /<q-item-section>Dashboard<\/q-item-section>/);
    assert.match(layout, /\.mobile-navigation-menu\s*\{\s*display:\s*none/);
    assert.match(layout, /@media \(max-width: 700px\)[\s\S]*?\.desktop-navigation-action\s*\{\s*display:\s*none/);
    assert.match(layout, /@media \(max-width: 700px\)[\s\S]*?\.mobile-navigation-menu\s*\{\s*display:\s*inline-flex/);
    assert.match(layout, /class="site-footer-content"/);
    assert.match(layout, /white-space:\s*normal/);
    assert.match(layout, /min-width:\s*min\(240px,\s*calc\(100vw - 24px\)\)/);
    assert.match(layout, /@media \(max-width:\s*700px\)/);
    assert.match(app, /class="cookie-card"/);
    assert.match(app, /class="cookie-card-body"/);
    assert.match(app, /overflow-y:\s*auto/);
  });

  it("delivers the complete home hero responsively without destructive cropping", () => {
    const home = read("../src/pages/IndexPage.vue");
    const heroImage = home.match(/<img\s+class="home-hero-image"[\s\S]*?\/>/)?.[0] || "";
    const heroStyles = home.match(/\.home-hero-image\s*\{([^}]*)\}/)?.[1] || "";

    assert.match(heroImage, /src="[^"]*\/f_auto,q_auto,c_scale,w_1731\//);
    assert.match(heroImage, /srcset="[\s\S]*w_480[\s\S]*480w[\s\S]*w_960[\s\S]*960w[\s\S]*w_1280[\s\S]*1280w[\s\S]*w_1731[\s\S]*1731w[\s\S]*w_1920[\s\S]*1920w/);
    assert.match(heroImage, /sizes="100vw"/);
    assert.match(heroImage, /width="1731"/);
    assert.match(heroImage, /height="909"/);
    assert.match(heroStyles, /height:\s*auto/);
    assert.match(heroStyles, /width:\s*100%/);
    assert.doesNotMatch(home, /\.home-hero\s*\{[^}]*height:/);
    assert.doesNotMatch(heroStyles, /object-fit:\s*cover/);
  });

  it("bounds public page content at the compact breakpoint", () => {
    const home = read("../src/pages/IndexPage.vue");
    const about = read("../src/pages/About.vue");
    const article = read("../src/components/BlogArticle.vue");

    assert.match(home, /clamp\(/);
    assert.match(home, /class="home-hero"/);
    assert.match(home, /\.home-hero\s*\{[^}]*width:\s*100%/);
    assert.match(home, /class="home-section home-knowledge"/);
    assert.match(home, /class="knowledge-list"/);
    assert.match(home, /home-projects/);
    assert.match(home, /marcelomunhoz_hero\.png/);
    assert.match(home, /alt="Marcelo Munhoz"/);
    assert.match(home, /class="home-facts"/);
    assert.match(home, /yearCount\("2004-06-04"\)/);
    assert.match(home, /@media \(max-width:\s*700px\)/);
    assert.match(home, /\.knowledge-list\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/);
    assert.match(about, /about-introduction/);
    assert.match(about, /@media \(max-width:\s*700px\)/);
    assert.match(article, /article-tags/);
    assert.match(article, /overflow-wrap:\s*anywhere/);
    assert.match(article, /overflow-x:\s*auto/);
    assert.match(article, /max-width:\s*100%/);
  });
});
