import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "vitest";

import { deriveBump, incrementVersion, updateReleaseVersion } from "../../scripts/release-version.js";

const temporaryDirectories = [];

const createFixture = ({
  baseVersion = "2.4.0",
  currentVersion = "2.4.0",
  dockerfile = 'FROM node:22-alpine\nLABEL version="2.4.0" \\\n+  author="Example"\n',
  commits = ["fix(release): Fixes version metadata"],
} = {}) => {
  const directory = mkdtempSync(join(tmpdir(), "release-version-"));
  temporaryDirectories.push(directory);
  const paths = {
    basePackagePath: join(directory, "base-package.json"),
    packagePath: join(directory, "package.json"),
    lockPath: join(directory, "package-lock.json"),
    dockerfilePath: join(directory, "Dockerfile"),
    commitMessagesPath: join(directory, "commit-messages.json"),
  };

  writeFileSync(paths.basePackagePath, `${JSON.stringify({ name: "example", version: baseVersion }, null, 2)}\n`);
  writeFileSync(paths.packagePath, `${JSON.stringify({ name: "example", version: currentVersion }, null, 2)}\n`);
  writeFileSync(paths.lockPath, `${JSON.stringify({
    name: "example",
    version: currentVersion,
    lockfileVersion: 3,
    packages: { "": { name: "example", version: currentVersion } },
  }, null, 2)}\n`);
  writeFileSync(paths.dockerfilePath, dockerfile);
  writeFileSync(paths.commitMessagesPath, JSON.stringify(commits));
  return paths;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("release version", () => {
  it("selects the highest semantic bump represented by conventional commits", () => {
    assert.equal(deriveBump(["docs: Updates guidance", "fix(api): Fixes response", "feat(ui): Adds search"]), "minor");
    assert.equal(deriveBump(["feat: Adds search", "refactor(core)!: Changes the public contract"]), "major");
    assert.equal(deriveBump(["perf: Improves rendering"]), "patch");
    assert.equal(deriveBump(["chore: Updates tooling", "docs: Updates guidance"]), null);
  });

  it("recognizes a breaking-change footer in the complete commit message", () => {
    assert.equal(deriveBump(["refactor(core): Changes internals\n\nBREAKING CHANGE: Removes the legacy API"]), "major");
    assert.equal(deriveBump(["Legacy subject\n\nBREAKING CHANGE: Removes the legacy API", "fix: Fixes fallback"]), "major");
  });

  it("increments strict semantic versions and rejects malformed versions", () => {
    assert.equal(incrementVersion("2.4.0", "major"), "3.0.0");
    assert.equal(incrementVersion("2.4.0", "minor"), "2.5.0");
    assert.equal(incrementVersion("2.4.0", "patch"), "2.4.1");
    assert.throws(() => incrementVersion("v2.4", "patch"), /valid X\.Y\.Z/);
  });

  it("updates both package manifests and the Docker label from the base version", () => {
    const paths = createFixture({ baseVersion: "2.4.0", currentVersion: "9.9.9", commits: ["feat: Adds automated releases"] });

    assert.deepEqual(updateReleaseVersion(paths), { changed: true, version: "2.5.0" });
    assert.equal(JSON.parse(readFileSync(paths.packagePath, "utf8")).version, "2.5.0");
    const lock = JSON.parse(readFileSync(paths.lockPath, "utf8"));
    assert.equal(lock.version, "2.5.0");
    assert.equal(lock.packages[""].version, "2.5.0");
    assert.match(readFileSync(paths.dockerfilePath, "utf8"), /version="2\.5\.0"/);
  });

  it("does not write any file when an input is malformed", () => {
    const paths = createFixture({ dockerfile: "FROM node:22-alpine\n" });
    const packageBefore = readFileSync(paths.packagePath, "utf8");
    const lockBefore = readFileSync(paths.lockPath, "utf8");

    assert.throws(() => updateReleaseVersion(paths), /Dockerfile version label/);
    assert.equal(readFileSync(paths.packagePath, "utf8"), packageBefore);
    assert.equal(readFileSync(paths.lockPath, "utf8"), lockBefore);
  });

  it("rejects a non-string base version without changing release files", () => {
    const paths = createFixture();
    writeFileSync(paths.basePackagePath, `${JSON.stringify({ name: "example", version: ["2.4.0"] }, null, 2)}\n`);
    const before = [paths.packagePath, paths.lockPath, paths.dockerfilePath].map((path) => readFileSync(path, "utf8"));

    assert.throws(() => updateReleaseVersion(paths), /valid X\.Y\.Z/);
    assert.deepEqual(
      [paths.packagePath, paths.lockPath, paths.dockerfilePath].map((path) => readFileSync(path, "utf8")),
      before,
    );
  });

  it("returns no change for non-release commits or already-correct files", () => {
    const noReleasePaths = createFixture({ commits: ["docs: Updates guidance"] });
    assert.deepEqual(updateReleaseVersion(noReleasePaths), { changed: false, version: null });

    const idempotentPaths = createFixture();
    assert.deepEqual(updateReleaseVersion(idempotentPaths), { changed: true, version: "2.4.1" });
    assert.deepEqual(updateReleaseVersion(idempotentPaths), { changed: false, version: "2.4.1" });
  });
});
