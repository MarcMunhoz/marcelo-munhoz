import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("routing configuration", () => {
  it("keeps blog components on the shared API URL helper without legacy external defaults", () => {
    const files = [
      "../src/pages/Blog.vue",
      "../src/components/ArticlesTags.vue",
      "../src/components/BlogArticle.vue",
    ];

    for (const file of files) {
      const source = read(file);
      assert.match(source, /buildApiUrl/);
      assert.doesNotMatch(source, /legacy-api\.example|VITE_API_URL/);
    }
  });

  it("routes Contentful API requests before the SPA fallback", () => {
    const netlifyToml = read("../netlify.toml");
    const apiRedirect = netlifyToml.indexOf('from = "/api/contentful/*"');
    const spaRedirect = netlifyToml.indexOf('from = "/*"');

    assert.ok(apiRedirect >= 0);
    assert.ok(spaRedirect >= 0);
    assert.ok(apiRedirect < spaRedirect);
    assert.match(netlifyToml, /to = "\/\.netlify\/functions\/contentful\/:splat"/);
    assert.match(netlifyToml, /connect-src 'self'/);
  });

  it("does not inject Contentful credentials into the frontend build config", () => {
    const quasarConfig = read("../quasar.config.js");

    assert.doesNotMatch(quasarConfig, /CONTENTFUL_DELIVERY_KEY|CONTENTFUL_DELIVERY|CONTENTFUL_SPACE_ID/);
  });

  it("uses a static Contentful SDK import for Function bundling", () => {
    const proxySource = read("../netlify/functions/contentfulProxyCore.js");

    assert.match(proxySource, /import\s+\{\s*createClient\s*\}\s+from\s+"contentful"/);
    assert.doesNotMatch(proxySource, /import\(["']contentful["']\)/);
  });

  it("keeps the Netlify Function dependency graph inside the functions directory", () => {
    const functionSource = read("../netlify/functions/contentful.js");

    assert.match(functionSource, /from "\.\/contentfulProxyCore\.js"/);
    assert.doesNotMatch(functionSource, /\.\.\/\.\.\//);
  });
});
