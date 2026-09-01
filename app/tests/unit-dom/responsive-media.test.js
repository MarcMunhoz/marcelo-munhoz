import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { observeMediaQuery } from "../../src/utils/responsiveMedia.js";

describe("native responsive media queries", () => {
  it("reports the initial match, propagates changes, and removes the listener", () => {
    const values = [];
    let listener;
    let removedListener;
    const mediaQuery = {
      matches: true,
      addEventListener(type, callback) {
        assert.equal(type, "change");
        listener = callback;
      },
      removeEventListener(type, callback) {
        assert.equal(type, "change");
        removedListener = callback;
      },
    };

    const stop = observeMediaQuery("(max-width: 720px)", (matches) => values.push(matches), {
      matchMedia: (query) => {
        assert.equal(query, "(max-width: 720px)");
        return mediaQuery;
      },
    });

    listener({ matches: false });
    stop();

    assert.deepEqual(values, [true, false]);
    assert.equal(removedListener, listener);
  });

  it("returns a safe cleanup when matchMedia is unavailable", () => {
    const values = [];
    const stop = observeMediaQuery("(max-width: 599px)", (matches) => values.push(matches), {});

    assert.deepEqual(values, [false]);
    assert.doesNotThrow(stop);
  });
});
