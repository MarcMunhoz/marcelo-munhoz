import { quasar, transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

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
  "**/__fixtures__/**",
  "**/fixtures/**",
  "coverage/**",
];

export default defineConfig({
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
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
        perFile: true,
      },
    },
  },
});
