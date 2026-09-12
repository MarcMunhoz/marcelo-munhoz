import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_REPORTS = ["lcov.info", "coverage-summary.json"];
const MAX_TOTAL_BYTES = 1_048_576;

const normalizeWorkspacePaths = (source, workspaceRoot) => {
  const root = resolve(workspaceRoot).replaceAll("\\", "/").replace(/\/$/, "");
  return String(source)
    .replaceAll(`file://${root}/`, "")
    .replaceAll(`${root}/`, "");
};

export const sanitizeCoverageArtifacts = ({ sourceDir, outputDir, workspaceRoot = process.cwd() } = {}) => {
  const source = resolve(sourceDir);
  const output = resolve(outputDir);
  if (!existsSync(source) || !statSync(source).isDirectory()) throw new Error("Coverage source must be a readable directory.");
  if (output === source || output.startsWith(`${source}${sep}`)) throw new Error("Sanitized coverage output must be outside the raw report tree.");

  const reports = [];
  let bytes = 0;
  for (const name of REQUIRED_REPORTS) {
    const path = resolve(source, name);
    if (!existsSync(path) || !statSync(path).isFile()) throw new Error(`Missing required coverage report: ${name}`);
    const raw = readFileSync(path, "utf8");
    bytes += Buffer.byteLength(raw);
    if (bytes > MAX_TOTAL_BYTES) throw new Error("Sanitized coverage exceeds the publication size limit.");
    reports.push({ name, source: normalizeWorkspacePaths(raw, workspaceRoot) });
  }

  mkdirSync(output, { recursive: true });
  for (const report of reports) writeFileSync(resolve(output, basename(report.name)), report.source, "utf8");
  const manifest = { files: reports.length, bytes };
  writeFileSync(resolve(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sanitizeCoverageArtifacts({ sourceDir: process.argv[2] || "coverage", outputDir: process.argv[3] || "artifacts/coverage-sanitized" });
}
