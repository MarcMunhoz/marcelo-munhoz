import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "vitest";

import { executeReleasePublicationCli, readReleaseTag } from "../../scripts/release-publication.js";

const temporaryDirectories = [];

const createFixture = ({ packageVersion = "2.4.1", lockVersion = packageVersion, rootVersion = packageVersion, dockerVersion = packageVersion } = {}) => {
  const directory = mkdtempSync(join(tmpdir(), "release-publication-"));
  temporaryDirectories.push(directory);
  const paths = {
    packagePath: join(directory, "package.json"),
    lockPath: join(directory, "package-lock.json"),
    dockerfilePath: join(directory, "Dockerfile"),
  };
  writeFileSync(paths.packagePath, `${JSON.stringify({ name: "example", version: packageVersion }, null, 2)}\n`);
  writeFileSync(paths.lockPath, `${JSON.stringify({
    name: "example",
    version: lockVersion,
    lockfileVersion: 3,
    packages: { "": { name: "example", version: rootVersion } },
  }, null, 2)}\n`);
  writeFileSync(paths.dockerfilePath, `FROM node:22-alpine\nLABEL version="${dockerVersion}" \\\n  author="Example"\n`);
  return paths;
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("release publication metadata", () => {
  it("returns the normalized tag when every release version agrees", () => {
    assert.equal(readReleaseTag(createFixture()), "v2.4.1");
  });

  it("fails closed when package, lockfile, root package, or Docker versions disagree", () => {
    assert.throws(() => readReleaseTag(createFixture({ lockVersion: "2.4.0" })), /must match/);
    assert.throws(() => readReleaseTag(createFixture({ rootVersion: "2.4.0" })), /must match/);
    assert.throws(() => readReleaseTag(createFixture({ dockerVersion: "2.4.0" })), /must match/);
  });

  it("rejects malformed semantic versions and missing Docker labels", () => {
    assert.throws(() => readReleaseTag(createFixture({ packageVersion: "v2.4" })), /valid X\.Y\.Z/);
    const paths = createFixture();
    writeFileSync(paths.dockerfilePath, "FROM node:22-alpine\n");
    assert.throws(() => readReleaseTag(paths), /Dockerfile version label/);

    const commentedPaths = createFixture();
    writeFileSync(commentedPaths.dockerfilePath, '# LABEL version="2.4.1"\nFROM node:22-alpine\n');
    assert.throws(() => readReleaseTag(commentedPaths), /Dockerfile version label/);
  });

  it("reports the validated tag through the CLI and fails closed on invalid JSON", () => {
    const paths = createFixture();
    const logs = [];
    const processRef = { exitCode: 0 };
    assert.equal(executeReleasePublicationCli({
      env: {
        PACKAGE_JSON: paths.packagePath,
        PACKAGE_LOCK_JSON: paths.lockPath,
        DOCKERFILE: paths.dockerfilePath,
      },
      log: (message) => logs.push(message),
      processRef,
    }), "v2.4.1");
    assert.deepEqual(logs, ["v2.4.1"]);
    assert.equal(processRef.exitCode, 0);

    writeFileSync(paths.packagePath, "not-json\n");
    const errors = [];
    assert.equal(executeReleasePublicationCli({
      env: {
        PACKAGE_JSON: paths.packagePath,
        PACKAGE_LOCK_JSON: paths.lockPath,
        DOCKERFILE: paths.dockerfilePath,
      },
      error: (message) => errors.push(message),
      processRef,
    }), null);
    assert.equal(processRef.exitCode, 1);
    assert.match(errors[0], /valid package JSON/);
  });
});
