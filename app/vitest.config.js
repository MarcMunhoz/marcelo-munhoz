import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const coverageInclude = [
  "src/**/*.{js,vue}",
  "middleware/**/*.js",
  "netlify/functions/**/*.js",
  "scripts/**/*.js",
];

const coverageExclude = [
  "dist/**",
  ".quasar/**",
  "node_modules/**",
  "tests/**",
  // Browser-process launchers are test infrastructure; their invoked policy,
  // readiness, and sanitization modules remain measured independently.
  "scripts/run-cypress-matrix.js",
  "scripts/run-remote-smoke.js",
  "**/__fixtures__/**",
  "**/fixtures/**",
  "coverage/**",
];

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "unit-node",
          environment: "node",
          include: ["tests/unit-node/**/*.test.js"],
        },
      },
      {
        test: {
          name: "unit-dom",
          environment: "happy-dom",
          include: ["tests/unit-dom/**/*.test.js"],
          setupFiles: ["tests/setup/unit-dom.js"],
        },
      },
      {
        resolve: {
          alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
          },
        },
        plugins: [vue({ template: { transformAssetUrls } }), quasar()],
        test: {
          name: "component",
          environment: "happy-dom",
          include: ["tests/component/**/*.test.js"],
          setupFiles: ["tests/setup/component.js"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: coverageInclude,
      exclude: coverageExclude,
      reporter: ["text", "html", "lcov", "json"],
      thresholds: {
        branches: 83,
        functions: 86,
        lines: 92,
        statements: 91,
      },
    },
  },
});
