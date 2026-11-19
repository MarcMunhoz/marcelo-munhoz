import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const BUMP_PRIORITY = { patch: 1, minor: 2, major: 3 };

const parseJson = (path, description) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read valid ${description}: ${error.message}`);
  }
};

const stringifyJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

export const deriveBump = (commitMessages = []) => {
  if (!Array.isArray(commitMessages) || !commitMessages.every((message) => typeof message === "string")) {
    throw new Error("Commit messages must be an array of strings.");
  }

  let selected = null;
  for (const message of commitMessages) {
    if (/(?:^|\r?\n)BREAKING(?: |-)CHANGE:/m.test(message)) return "major";
    const match = /^([a-z]+)(\([^\r\n]+\))?(!)?:/.exec(message);
    if (!match) continue;
    const [, type, , breakingMark] = match;
    const candidate = breakingMark
      ? "major"
      : type === "feat"
        ? "minor"
        : type === "fix" || type === "perf"
          ? "patch"
          : null;
    if (candidate && (!selected || BUMP_PRIORITY[candidate] > BUMP_PRIORITY[selected])) selected = candidate;
  }
  return selected;
};

export const incrementVersion = (version, bump) => {
  if (typeof version !== "string") throw new Error(`Base version must be valid X.Y.Z SemVer, received: ${JSON.stringify(version)}`);
  const match = SEMVER_PATTERN.exec(version);
  if (!match) throw new Error(`Base version must be valid X.Y.Z SemVer, received: ${version}`);
  if (!Object.hasOwn(BUMP_PRIORITY, bump)) throw new Error(`Unsupported version bump: ${bump}`);

  const [, majorText, minorText, patchText] = match;
  const parts = [majorText, minorText, patchText].map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error(`Base version must be valid X.Y.Z SemVer, received: ${version}`);
  const [major, minor, patch] = parts;
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

export const updateReleaseVersion = ({ basePackagePath, packagePath, lockPath, dockerfilePath, commitMessagesPath }) => {
  const commitMessages = parseJson(commitMessagesPath, "commit messages JSON");
  const bump = deriveBump(commitMessages);
  if (!bump) return { changed: false, version: null };

  const basePackage = parseJson(basePackagePath, "base package JSON");
  const packageJson = parseJson(packagePath, "package JSON");
  const packageLock = parseJson(lockPath, "package lock JSON");
  const dockerfile = readFileSync(dockerfilePath, "utf8");
  const version = incrementVersion(basePackage.version, bump);

  if (!packageLock.packages?.[""] || typeof packageLock.packages[""] !== "object") {
    throw new Error("Package lock must contain the root package entry.");
  }
  const dockerVersionMatches = dockerfile.match(/\bversion="[^"]*"/g) || [];
  if (dockerVersionMatches.length !== 1) throw new Error("Dockerfile version label must exist exactly once.");

  const nextPackage = { ...packageJson, version };
  const nextLock = {
    ...packageLock,
    version,
    packages: { ...packageLock.packages, "": { ...packageLock.packages[""], version } },
  };
  const nextDockerfile = dockerfile.replace(/\bversion="[^"]*"/, `version="${version}"`);
  const outputs = [
    [packagePath, stringifyJson(nextPackage)],
    [lockPath, stringifyJson(nextLock)],
    [dockerfilePath, nextDockerfile],
  ];
  const changed = outputs.some(([path, content]) => readFileSync(path, "utf8") !== content);
  if (changed) for (const [path, content] of outputs) writeFileSync(path, content);
  return { changed, version };
};

export const executeReleaseVersionCli = ({ env = process.env, log = console.log, error = console.error, processRef = process } = {}) => {
  try {
    const result = updateReleaseVersion({
      basePackagePath: env.BASE_PACKAGE_JSON,
      packagePath: env.PACKAGE_JSON || "app/package.json",
      lockPath: env.PACKAGE_LOCK_JSON || "app/package-lock.json",
      dockerfilePath: env.DOCKERFILE || "Dockerfile",
      commitMessagesPath: env.COMMIT_MESSAGES_FILE,
    });
    if (result.changed) log(result.version);
    return result;
  } catch (caught) {
    error(caught.message);
    processRef.exitCode = 1;
    return null;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) executeReleaseVersionCli();
