import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const scopeDirectories = ["src", "middleware", "netlify/functions", "scripts"];
const directivePattern = /\/\*\s*(v8|istanbul)\s+ignore\s+(next|start|stop|file)\s*\*\//g;

async function main() {
  const allowlist = JSON.parse(await readFile(path.join(root, "coverage-exclusions.json"), "utf8"));

  if (allowlist.version !== 1 || !Array.isArray(allowlist.entries)) {
    throw new Error("coverage-exclusions.json must declare version 1 and an entries array.");
  }

  const entries = new Map();
  for (const entry of allowlist.entries) {
    if (
      !entry ||
      !scopeDirectories.some((directory) => entry.file?.startsWith(`${directory}/`)) ||
      !Number.isInteger(entry.line) ||
      entry.line < 1 ||
      !["v8 ignore next", "istanbul ignore next"].includes(entry.directive) ||
      typeof entry.rationale !== "string" ||
      entry.rationale.trim().length < 20 ||
      typeof entry.reviewedBy !== "string" ||
      entry.reviewedBy.trim().length < 3
    ) {
      throw new Error("Each coverage exclusion needs a precise in-scope file, line, next directive, rationale, and reviewer.");
    }

    const key = `${entry.file}:${entry.line}:${entry.directive}`;
    if (entries.has(key)) throw new Error(`Duplicate coverage exclusion: ${key}`);
    entries.set(key, entry);
  }

  async function filesIn(directory) {
    const absoluteDirectory = path.join(root, directory);
    const children = await readdir(absoluteDirectory, { withFileTypes: true });
    const files = await Promise.all(
      children.map(async (child) => {
        const relativePath = path.join(directory, child.name);
        return child.isDirectory() ? filesIn(relativePath) : [relativePath];
      }),
    );
    return files.flat();
  }

  const discovered = new Set();
  for (const directory of scopeDirectories) {
    for (const file of await filesIn(directory)) {
      if (!file.endsWith(".js") && !file.endsWith(".vue")) continue;
      const source = await readFile(path.join(root, file), "utf8");
      for (const match of source.matchAll(directivePattern)) {
        const directive = `${match[1]} ignore ${match[2]}`;
        const line = source.slice(0, match.index).split("\n").length;
        const key = `${file}:${line}:${directive}`;

        if (match[2] !== "next") {
          throw new Error(`Broad coverage ignore directive is forbidden: ${key}`);
        }
        if (!entries.has(key)) {
          throw new Error(`Undocumented coverage exclusion: ${key}`);
        }
        discovered.add(key);
      }
    }
  }

  for (const key of entries.keys()) {
    if (!discovered.has(key)) throw new Error(`Stale coverage exclusion allowlist entry: ${key}`);
  }
}

main();
