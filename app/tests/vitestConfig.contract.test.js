import assert from "node:assert/strict";
import { describe, it } from "node:test";

import vitestConfig from "../vitest.config.js";

const projects = vitestConfig.test.projects;

describe("Vitest project and coverage contract", () => {
  it("keeps Node, browser-module, and component tests in their intended runtimes", () => {
    assert.deepEqual(
      projects.map(({ test }) => ({
        environment: test.environment,
        include: test.include,
        name: test.name,
      })),
      [
        { name: "unit-node", environment: "node", include: ["tests/unit-node/**/*.test.js"] },
        { name: "unit-dom", environment: "happy-dom", include: ["tests/unit-dom/**/*.test.js"] },
        { name: "component", environment: "happy-dom", include: ["tests/component/**/*.test.js"] },
      ],
    );
  });

  it("enforces complete V8 coverage with portable reports and boundary-only exclusions", () => {
    const { coverage } = vitestConfig.test;

    assert.equal(coverage.provider, "v8");
    assert.deepEqual(coverage.reporter, ["text", "html", "lcov", "json"]);
    assert.deepEqual(coverage.thresholds, {
      branches: 100,
      functions: 100,
      lines: 100,
      perFile: true,
      statements: 100,
    });
    assert.deepEqual(coverage.include, [
      "src/**/*.{js,vue}",
      "middleware/**/*.js",
      "netlify/functions/**/*.js",
      "scripts/**/*.js",
    ]);
    assert.deepEqual(coverage.exclude, [
      "dist/**",
      ".quasar/**",
      "node_modules/**",
      "tests/**",
      "**/__fixtures__/**",
      "**/fixtures/**",
      "coverage/**",
    ]);
  });
});
