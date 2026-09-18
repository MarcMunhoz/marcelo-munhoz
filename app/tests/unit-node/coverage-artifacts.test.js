import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";

import { sanitizeCoverageArtifacts } from "../../scripts/sanitize-coverage-artifacts.js";

describe("coverage artifact publication", () => {
  it("publishes bounded reports with repository-relative source paths", () => {
    const root = mkdtempSync(join(tmpdir(), "coverage-artifacts-"));
    const sourceDir = join(root, "coverage");
    const outputDir = join(root, "published");
    const workspaceRoot = ["", "workspace", "app"].join("/");
    mkdirSync(sourceDir);
    writeFileSync(join(sourceDir, "lcov.info"), `TN:\nSF:${workspaceRoot}/src/example.js\nDA:1,1\nend_of_record\n`);
    writeFileSync(join(sourceDir, "coverage-final.json"), JSON.stringify({ [`${workspaceRoot}/src/example.js`]: { path: `${workspaceRoot}/src/example.js` } }));
    writeFileSync(join(sourceDir, "coverage-summary.json"), JSON.stringify({ total: { lines: { pct: 92 } } }));

    try {
      const manifest = sanitizeCoverageArtifacts({ sourceDir, outputDir, workspaceRoot });
      assert.equal(readFileSync(join(outputDir, "lcov.info"), "utf8").includes(workspaceRoot), false);
      assert.match(readFileSync(join(outputDir, "lcov.info"), "utf8"), /SF:src\/example\.js/);
      assert.equal(existsSync(join(outputDir, "coverage-final.json")), false);
      assert.deepEqual(manifest, { files: 2, bytes: manifest.bytes });
      assert.ok(manifest.bytes > 0 && manifest.bytes <= 1_048_576);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails closed when the expected report is missing or oversized", () => {
    const root = mkdtempSync(join(tmpdir(), "coverage-artifacts-boundary-"));
    const sourceDir = join(root, "coverage");
    mkdirSync(sourceDir);
    try {
      assert.throws(() => sanitizeCoverageArtifacts({ sourceDir, outputDir: join(root, "published") }), /Missing required coverage report/);
      writeFileSync(join(sourceDir, "lcov.info"), "x".repeat(1_048_577));
      assert.throws(() => sanitizeCoverageArtifacts({ sourceDir, outputDir: join(root, "published") }), /size limit/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
