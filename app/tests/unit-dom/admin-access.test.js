import { describe, expect, it, vi } from "vitest";

import {
  adminAccessPhraseMatches,
  nextAdminAccessClick,
  rejectAdminAccess,
} from "../../src/utils/adminAuth.js";

describe("hidden admin access", () => {
  it("unlocks only on the third sequential click inside the time window", () => {
    const first = nextAdminAccessClick(null, 1_000);
    const second = nextAdminAccessClick(first.state, 1_200);
    const third = nextAdminAccessClick(second.state, 1_400);

    expect([first.unlock, second.unlock, third.unlock]).toEqual([false, false, true]);
    expect(third.state).toBeNull();
  });

  it("restarts after the click window expires", () => {
    const first = nextAdminAccessClick(null, 1_000);

    expect(nextAdminAccessClick(first.state, 1_800)).toEqual({
      state: { count: 1, lastClickAt: 1_800 },
      unlock: false,
    });
  });

  it("accepts only the exact AMIGO phrase after trimming", () => {
    expect(adminAccessPhraseMatches(" AMIGO ")).toBe(true);
    expect(adminAccessPhraseMatches("amigo")).toBe(false);
    expect(adminAccessPhraseMatches("AMIGA")).toBe(false);
    expect(adminAccessPhraseMatches(null)).toBe(false);
  });

  it.each([
    ["/blog", ["/"]],
    ["/", []],
  ])("rejects access from %s with the fixed notice and safe navigation", async (currentPath, expectedRoutes) => {
    const notifyImpl = vi.fn();
    const replace = vi.fn().mockResolvedValue(undefined);

    await rejectAdminAccess({ currentPath, notifyImpl, router: { replace } });

    expect(notifyImpl).toHaveBeenCalledOnce();
    expect(notifyImpl).toHaveBeenCalledWith({
      type: "negative",
      message: "Você não é um AMIGO, até a próxima!",
    });
    expect(replace.mock.calls.map(([path]) => path)).toEqual(expectedRoutes);
  });
});
