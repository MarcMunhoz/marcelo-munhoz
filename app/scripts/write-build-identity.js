import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/i;

export const normalizeCommitSha = (value) => {
  if (typeof value !== "string" || !FULL_COMMIT_SHA.test(value)) {
    throw new Error("Build identity requires a full commit SHA.");
  }
  return value.toLowerCase();
};

export const serializeBuildIdentity = (commit) => `${JSON.stringify({ commit: normalizeCommitSha(commit) })}\n`;

export const writeBuildIdentity = ({ commit, outputDir = "dist" } = {}) => {
  const markerDirectory = join(outputDir, ".well-known");
  const markerPath = join(markerDirectory, "build-identity.json");
  mkdirSync(markerDirectory, { recursive: true });
  writeFileSync(markerPath, serializeBuildIdentity(commit), { encoding: "utf8", mode: 0o644 });
  return markerPath;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeBuildIdentity({ commit: process.env.COMMIT_REF, outputDir: process.argv[2] || "dist" });
}
