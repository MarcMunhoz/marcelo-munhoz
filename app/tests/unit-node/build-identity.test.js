import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";

import { serializeBuildIdentity, writeBuildIdentity } from "../../scripts/write-build-identity.js";

const commit = "0123456789abcdef0123456789abcdef01234567";

describe("Deploy Preview build identity", () => {
  it("serializes only the normalized commit identity", () => {
    assert.equal(serializeBuildIdentity(commit.toUpperCase()), `${JSON.stringify({ commit })}\n`);
  });

  it("rejects missing, abbreviated, or non-hexadecimal identities", () => {
    for (const value of [undefined, "", "0123456", `${commit.slice(0, -1)}z`]) {
      assert.throws(() => serializeBuildIdentity(value), /full commit SHA/);
    }
  });

  it("writes the marker below the built static tree", () => {
    const outputDir = mkdtempSync(join(tmpdir(), "build-identity-"));

    try {
      const markerPath = writeBuildIdentity({ commit, outputDir });
      assert.equal(readFileSync(markerPath, "utf8"), `${JSON.stringify({ commit })}\n`);
      assert.equal(markerPath, join(outputDir, ".well-known", "build-identity.json"));
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
