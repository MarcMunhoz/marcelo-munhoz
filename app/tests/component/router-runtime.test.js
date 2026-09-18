import { describe, expect, it } from "vitest";

import routes from "../../src/router/routes.js";

describe("router runtime boundaries", () => {
  it("loads every lazy route component exposed by the application route table", async () => {
    const records = routes.flatMap((route) => [route, ...(route.children || [])]);
    const lazyComponents = records.map((route) => route.component).filter((component) => typeof component === "function");

    const loaded = await Promise.all(lazyComponents.map((component) => component()));

    expect(loaded).toHaveLength(lazyComponents.length);
    expect(loaded.every((module) => typeof module.default === "object")).toBe(true);
  });
});
