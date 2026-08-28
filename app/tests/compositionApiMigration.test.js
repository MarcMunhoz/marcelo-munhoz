import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const firstWave = [
  "../src/pages/ErrorNotFound.vue",
  "../src/pages/IndexPage.vue",
  "../src/pages/About.vue",
  "../src/components/AdminArticleCard.vue",
  "../src/components/BlogArchiveList.vue",
  "../src/components/BlogHighlights.vue",
];

const secondWave = ["../src/App.vue", "../src/layouts/MainLayout.vue", "../src/pages/AuthorProfile.vue"];

const thirdWave = ["../src/pages/Blog.vue", "../src/components/BlogArticle.vue"];

const fourthWave = ["../src/pages/AdminTags.vue", "../src/pages/AdminProfile.vue", "../src/pages/Admin.vue"];

const fifthWave = ["../src/pages/AdminArticleEditor.vue"];

const forbiddenOptionsApiPatterns = [
  /\bdefineComponent\b/,
  /\bexport\s+default\b/,
  /\bmixins\s*:/,
  /\bdata\s*\(\s*\)/,
  /\bmethods\s*:/,
  /\bcomputed\s*:/,
  /\bthis\./,
];

export const assertScriptSetupMigration = (files) => {
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");

    assert.match(source, /<script setup>/, `${file} must use <script setup>`);

    for (const forbiddenPattern of forbiddenOptionsApiPatterns) {
      assert.doesNotMatch(source, forbiddenPattern, `${file} must not retain ${forbiddenPattern}`);
    }
  }
};

describe("Composition API migration", () => {
  it("keeps the first migration wave on the script setup structural contract", () => {
    assertScriptSetupMigration(firstWave);
  });

  it("keeps the second migration wave on the script setup structural contract", () => {
    assertScriptSetupMigration(secondWave);
  });

  it("keeps the third migration wave on the script setup structural contract", () => {
    assertScriptSetupMigration(thirdWave);
  });

  it("keeps the administrative migration wave on the script setup structural contract", () => {
    assertScriptSetupMigration(fourthWave);
  });
});

export { firstWave, secondWave, thirdWave, fourthWave, fifthWave };
