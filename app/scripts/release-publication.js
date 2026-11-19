import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const readJson = (path, description) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read valid ${description}: ${error.message}`);
  }
};

export const readReleaseTag = ({ packagePath, lockPath, dockerfilePath }) => {
  const packageJson = readJson(packagePath, "package JSON");
  const packageLock = readJson(lockPath, "package lock JSON");
  const dockerfile = readFileSync(dockerfilePath, "utf8");
  const version = packageJson.version;

  if (typeof version !== "string" || !SEMVER_PATTERN.test(version)) {
    throw new Error(`Package version must be valid X.Y.Z SemVer, received: ${JSON.stringify(version)}`);
  }

  const dockerInstructions = dockerfile
    .replace(/\\\r?\n/g, " ")
    .split(/\r?\n/)
    .filter((line) => /^\s*LABEL\s+/i.test(line));
  const dockerVersions = dockerInstructions.flatMap((instruction) => (
    [...instruction.matchAll(/(?:^|\s)version="([^"]*)"/g)].map((match) => match[1])
  ));
  if (dockerVersions.length !== 1) throw new Error("Dockerfile version label must exist exactly once.");
  const releaseVersions = [packageLock.version, packageLock.packages?.[""]?.version, dockerVersions[0]];
  if (!releaseVersions.every((candidate) => candidate === version)) {
    throw new Error("Package, lockfile, root package, and Docker versions must match.");
  }

  return `v${version}`;
};

export const executeReleasePublicationCli = ({
  env = process.env,
  log = console.log,
  error = console.error,
  processRef = process,
} = {}) => {
  try {
    const tag = readReleaseTag({
      packagePath: env.PACKAGE_JSON || "app/package.json",
      lockPath: env.PACKAGE_LOCK_JSON || "app/package-lock.json",
      dockerfilePath: env.DOCKERFILE || "Dockerfile",
    });
    log(tag);
    return tag;
  } catch (caught) {
    error(caught.message);
    processRef.exitCode = 1;
    return null;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) executeReleasePublicationCli();
