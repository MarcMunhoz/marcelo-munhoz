import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import contentfulRoutes from "../middleware/routes/contentful.js";
import { scrollBehavior } from "../src/router/index.js";
import routes from "../src/router/routes.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("routing configuration", () => {
  it("keeps the routed view mounted when only the query changes", () => {
    const appSource = read("../src/App.vue");

    assert.match(appSource, /<router-view\s+:key="\$route\.path"\s*\/>/);
    assert.doesNotMatch(appSource, /<router-view\s+:key="\$route\.fullPath"\s*\/>/);
  });

  it("restores a saved browser scroll position before using the top fallback", () => {
    assert.deepEqual(scrollBehavior({}, {}, { left: 18, top: 72 }), { left: 18, top: 72 });
    assert.deepEqual(scrollBehavior({}, {}, null), { left: 0, top: 0 });
  });

  it("mounts the public blog-index endpoint locally", () => {
    const publicRoute = contentfulRoutes.stack.find((layer) => layer.route);

    assert.ok(publicRoute);
    assert.equal(publicRoute.route.path.includes("/blog-index"), true);
  });

  it("keeps blog components on the shared API URL helper without legacy external defaults", () => {
    const files = ["../src/pages/Blog.vue", "../src/components/BlogArticle.vue"];

    for (const file of files) {
      const source = read(file);
      assert.match(source, /buildApiUrl/);
      assert.doesNotMatch(source, /legacy-api\.example|VITE_API_URL/);
    }
  });

  it("redirects legacy tag URLs to the canonical named archive query", () => {
    const mainLayout = routes.find((route) => route.path === "/");
    const legacyTagRoute = mainLayout.children.find((route) => route.path === "/blog/tags/:tag");

    assert.ok(legacyTagRoute);
    assert.equal(typeof legacyTagRoute.redirect, "function");
    assert.deepEqual(legacyTagRoute.redirect({ params: { tag: "architecture" } }), {
      name: "Meus Artigos",
      query: { tag: "architecture" },
    });
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

  it("routes admin Contentful API requests separately before public API and SPA fallbacks", () => {
    const netlifyToml = read("../netlify.toml");
    const adminRedirect = netlifyToml.indexOf('from = "/api/admin/contentful/*"');
    const publicRedirect = netlifyToml.indexOf('from = "/api/contentful/*"');
    const spaRedirect = netlifyToml.indexOf('from = "/*"');

    assert.ok(adminRedirect >= 0);
    assert.ok(publicRedirect >= 0);
    assert.ok(spaRedirect >= 0);
    assert.ok(adminRedirect < publicRedirect);
    assert.ok(adminRedirect < spaRedirect);
    assert.match(netlifyToml, /to = "\/\.netlify\/functions\/contentful-admin\/:splat"/);
  });

  it("mounts local admin Contentful routes separately from public routes", () => {
    const serverSource = read("../middleware/server.js");

    assert.match(serverSource, /isAllowedCorsOrigin/);
    assert.match(serverSource, /contentfulAdminRoutes/);
    assert.match(serverSource, /app\.use\("\/api\/admin\/contentful", contentfulAdminRoutes\)/);
    assert.match(serverSource, /app\.use\("\/api\/contentful", contentfulRoutes\)/);
  });

  it("proxies local admin API calls from the Quasar dev server to the local middleware server", () => {
    const quasarConfig = read("../quasar.config.js");

    assert.match(quasarConfig, /devServer:\s*\{/);
    assert.match(quasarConfig, /"\/api\/admin\/contentful"/);
    assert.match(quasarConfig, /target:\s*"http:\/\/localhost:3000"/);
  });

  it("does not inject Contentful credentials into the frontend build config", () => {
    const quasarConfig = read("../quasar.config.js");

    assert.doesNotMatch(
      quasarConfig,
      /CONTENTFUL_DELIVERY_KEY|CONTENTFUL_DELIVERY|CONTENTFUL_SPACE_ID|CONTENTFUL_MANAGEMENT_KEY|CONTENTFUL_MANAGEMENT_TOKEN|CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET/
    );
    assert.match(quasarConfig, /env:\s*\{\}/);
  });

  it("keeps Cloudinary write credentials out of frontend source", () => {
    const frontendFiles = [
      "../src/pages/Admin.vue",
      "../src/utils/adminApi.js",
      "../src/utils/adminDashboard.js",
      "../src/utils/contentfulImages.js",
      "../quasar.config.js",
    ];

    for (const file of frontendFiles) {
      const source = read(file);
      assert.doesNotMatch(source, /CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET|CLOUDINARY_UPLOAD_PRESET|api_secret/);
    }
  });

  it("keeps the Function free from Contentful SDK bundling", () => {
    const proxySource = read("../netlify/functions/contentfulProxyCore.js");

    assert.doesNotMatch(proxySource, /from\s+"contentful"/);
    assert.doesNotMatch(proxySource, /import\(["']contentful["']\)/);
  });

  it("keeps the Netlify Function dependency graph inside the functions directory", () => {
    const functionSource = read("../netlify/functions/contentful.js");

    assert.match(functionSource, /from "\.\/contentfulProxyCore\.js"/);
    assert.doesNotMatch(functionSource, /\.\.\/\.\.\//);
  });

  it("keeps the admin Netlify Function dependency graph inside the functions directory", () => {
    const functionSource = read("../netlify/functions/contentful-admin.js");

    assert.match(functionSource, /from "\.\/contentfulAdminCore\.js"/);
    assert.doesNotMatch(functionSource, /\.\.\/\.\.\//);
  });

  it("does not accept browser-supplied Cloudinary credentials in the admin media facade", () => {
    const adminSource = read("../netlify/functions/contentfulAdminCore.js");

    assert.match(adminSource, /CLOUDINARY_API_KEY/);
    assert.match(adminSource, /CLOUDINARY_API_SECRET/);
    assert.doesNotMatch(adminSource, /data\.CLOUDINARY_API_KEY|data\.CLOUDINARY_API_SECRET|query\.CLOUDINARY_API_KEY|query\.CLOUDINARY_API_SECRET/);
  });
});
