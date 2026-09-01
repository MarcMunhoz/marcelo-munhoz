import assert from "node:assert/strict";
import { describe, it } from "vitest";

import routes from "../../src/router/routes.js";
import { scrollBehavior } from "../../src/router/scrollBehavior.js";
import { publicAuthorMetadata } from "../../src/utils/authorProfiles.js";
import { appDocumentTitle, appMetadata, shouldShowCookieNotice } from "../../src/utils/cookieNotice.js";
import { returnToAdminDashboard, runTerminalAdminAction } from "../../src/utils/adminDashboard.js";

describe("routing helpers", () => {
  it("shows cookie notice only on public routes while consent is pending", () => {
    assert.equal(shouldShowCookieNotice({ meta: {} }, true), true);
    assert.equal(shouldShowCookieNotice({ meta: { requiresAdmin: true } }, true), false);
    assert.equal(shouldShowCookieNotice({ meta: {} }, false), false);
  });

  it("derives public and administrative shell metadata", () => {
    const route = { meta: {} };

    assert.equal(appDocumentTitle({ meta: { title: "About" } }), "Marcelo Munhoz - About");
    assert.equal(appMetadata(route).meta.robots.content, "index,follow");
    route.meta.requiresAdmin = true;
    assert.equal(appMetadata(route).meta.robots.content, "noindex,nofollow");
  });

  it("derives reactive author metadata", () => {
    const author = { name: "", biography: "" };

    assert.equal(publicAuthorMetadata(author).title, "Marcelo Munhoz - Author");
    author.name = "Example Author";
    author.biography = "Writes about software.";
    assert.deepEqual(publicAuthorMetadata(author), {
      title: "Marcelo Munhoz - Example Author",
      meta: { description: { name: "description", content: "Writes about software." } },
    });
  });

  it("restores saved scroll positions before using the top fallback", () => {
    assert.deepEqual(scrollBehavior({}, {}, { left: 18, top: 72 }), { left: 18, top: 72 });
    assert.deepEqual(scrollBehavior({}, {}, null), { left: 0, top: 0 });
  });

  it("redirects legacy tag URLs to the canonical archive query", () => {
    const mainLayout = routes.find((route) => route.path === "/");
    const legacyTagRoute = mainLayout.children.find((route) => route.path === "/blog/tags/:tag");

    assert.deepEqual(legacyTagRoute.redirect({ params: { tag: "architecture" } }), {
      name: "Meus Artigos",
      query: { tag: "architecture" },
    });
  });

  it("redirects only after a successful terminal admin action", async () => {
    const events = [];
    const router = { replace: async (path) => events.push(`redirect:${path}`) };

    await returnToAdminDashboard(router);
    assert.deepEqual(events, ["redirect:/admin"]);

    await assert.rejects(
      runTerminalAdminAction({
        operation: async () => Promise.reject(new Error("mutation failed")),
        router,
      }),
      /mutation failed/
    );
    assert.deepEqual(events, ["redirect:/admin"]);
  });

  it("runs successful terminal state work before redirecting", async () => {
    const events = [];
    const result = await runTerminalAdminAction({
      operation: async () => {
        events.push("operation");
        return "response";
      },
      onSuccess: async (response) => events.push(`success:${response}`),
      router: { replace: async (path) => events.push(`redirect:${path}`) },
    });

    assert.equal(result, "response");
    assert.deepEqual(events, ["operation", "success:response", "redirect:/admin"]);
  });
});
