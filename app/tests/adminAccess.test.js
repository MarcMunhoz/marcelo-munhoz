import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminAccessPhraseMatches, nextAdminAccessClick, rejectAdminAccess } from "../src/utils/adminAuth.js";

describe("hidden admin access", () => {
  it("unlocks only on three sequential name clicks inside the time window", () => {
    const first = nextAdminAccessClick(null, 1000);
    const second = nextAdminAccessClick(first.state, 1200);
    const third = nextAdminAccessClick(second.state, 1400);

    assert.equal(first.unlock, false);
    assert.equal(second.unlock, false);
    assert.equal(third.unlock, true);
    assert.equal(third.state, null);
  });

  it("restarts the sequence after the click window expires", () => {
    const first = nextAdminAccessClick(null, 1000);
    const expired = nextAdminAccessClick(first.state, 1800);

    assert.deepEqual(expired, {
      state: { count: 1, lastClickAt: 1800 },
      unlock: false,
    });
  });

  it("accepts only the AMIGO phrase after trimming surrounding whitespace", () => {
    assert.equal(adminAccessPhraseMatches(" AMIGO "), true);
    assert.equal(adminAccessPhraseMatches("amigo"), false);
    assert.equal(adminAccessPhraseMatches("AMIGA"), false);
    assert.equal(adminAccessPhraseMatches(null), false);
  });

  it("rejects a non-AMIGO visitor with a second hint and returns home", async () => {
    const notifications = [];
    const routes = [];

    await rejectAdminAccess({
      currentPath: "/blog",
      notifyImpl: (options) => notifications.push(options),
      router: { replace: async (path) => routes.push(path) },
    });

    assert.deepEqual(notifications, [{ type: "negative", message: "Você não é um AMIGO, até a próxima!" }]);
    assert.deepEqual(routes, ["/"]);
  });
});
