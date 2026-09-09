import assert from "node:assert/strict";
import { describe, it } from "vitest";

import installAnalytics from "../../src/boot/google-analytics.js";

describe("analytics boot boundary", () => {
  it("records route changes without requiring a session identifier", () => {
    let afterEach;
    const previousWindow = globalThis.window;
    globalThis.window = { dataLayer: [] };

    try {
      installAnalytics({ router: { afterEach: (callback) => { afterEach = callback; } } });
      afterEach({ path: "/about", name: "about" }, { path: "/", name: "home" });

      assert.deepEqual(globalThis.window.dataLayer, [
        { screenPath: "/about", screenName: "about", sessionId: null },
        { event: "appScreenView" },
      ]);
    } finally {
      globalThis.window = previousWindow;
    }
  });
});
