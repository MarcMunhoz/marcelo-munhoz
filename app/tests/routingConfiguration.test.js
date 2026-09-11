import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createApp } from "../middleware/createApp.js";
import contentfulAdminRoutes from "../middleware/routes/contentfulAdmin.js";
import contentfulRoutes from "../middleware/routes/contentful.js";
import { quasarBuildEnvironment, quasarDevServerProxy } from "../quasarBuildManifest.js";
import routes from "../src/router/routes.js";
import { scrollBehavior } from "../src/router/scrollBehavior.js";
import { publicAuthorMetadata } from "../src/utils/authorProfiles.js";
import { appDocumentTitle, appMetadata, shouldShowCookieNotice } from "../src/utils/cookieNotice.js";

describe("routing configuration", () => {
  it("shows the cookie notice only on public routes while consent is pending", () => {
    assert.equal(shouldShowCookieNotice({ meta: {} }, true), true);
    assert.equal(shouldShowCookieNotice({ meta: { requiresAdmin: true } }, true), false);
    assert.equal(shouldShowCookieNotice({ meta: {} }, false), false);
  });

  it("derives public and administrative shell metadata from the active route", () => {
    const route = { meta: {} };

    assert.equal(appDocumentTitle({ meta: { title: "About" } }), "Marcelo Munhoz - About");
    assert.deepEqual(appMetadata(route), {
      meta: {
        description: {
          name: "description",
          content: "Some brief histories of my past-present development experience. The life, the universe and everything about a tech life",
        },
        robots: { name: "robots", content: "index,follow" },
      },
    });
    route.meta.requiresAdmin = true;
    assert.equal(appMetadata(route).meta.robots.content, "noindex,nofollow");
  });

  it("derives reactive author metadata from default and loaded public profiles", () => {
    const author = { name: "", biography: "" };

    assert.deepEqual(publicAuthorMetadata(author), {
      title: "Marcelo Munhoz - Author",
      meta: {
        description: { name: "description", content: "Articles by " },
      },
    });
    author.name = "Example Author";
    author.biography = "Writes about software.";
    assert.deepEqual(publicAuthorMetadata(author), {
      title: "Marcelo Munhoz - Example Author",
      meta: {
        description: { name: "description", content: "Writes about software." },
      },
    });
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

  it("registers the owner tag-management route", () => {
    const mainLayout = routes.find((route) => route.path === "/");
    const tagManagementRoute = mainLayout.children.find((route) => route.path === "/admin/tags");

    assert.ok(tagManagementRoute);
    assert.equal(tagManagementRoute.meta.requiresAdmin, true);
    assert.equal(tagManagementRoute.meta.requiresOwner, true);
  });

  it("mounts local admin Contentful routes separately from public routes", () => {
    const mountedHandlers = createApp().router.stack.map((layer) => layer.handle);

    assert.equal(mountedHandlers.includes(contentfulAdminRoutes), true);
    assert.equal(mountedHandlers.includes(contentfulRoutes), true);
  });

  it("proxies local admin API calls from the Quasar dev server to the local middleware server", () => {
    assert.equal(quasarDevServerProxy["/api/admin/contentful"].target, "http://localhost:3000");
    assert.equal(quasarDevServerProxy["/api"].target, "http://localhost:3000");
  });

  it("does not inject Contentful credentials into the frontend build config", () => {
    assert.deepEqual(quasarBuildEnvironment, {});
  });

});
