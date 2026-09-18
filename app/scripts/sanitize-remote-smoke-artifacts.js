import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const TEXT_EXTENSIONS = new Set([".json", ".log", ".txt", ".xml"]);
const MAX_FILES = 20;
const MAX_BYTES = 64 * 1024;

const walk = (directory) => {
  const files = [];
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  return files.sort();
};

export const redactRemoteDiagnostic = (source, { sensitiveValues = [] } = {}) => {
  let sanitized = String(source).replace(/https?:\/\/[^\s"'<>]+/gi, "<preview-url>");
  sanitized = sanitized.replace(/(?:\/[A-Za-z0-9._-]+){2,}(?::\d+(?::\d+)?)?/g, "<local-path>");
  sanitized = sanitized.replace(/[A-Z]:\\[^\s"'<>]*/gi, "<local-path>");
  sanitized = sanitized.replace(/\b[A-Z][A-Z0-9_]{2,}=[^\s]+/g, "<environment-metadata>");
  sanitized = sanitized.replace(/\b(authorization|cookie|set-cookie)\s*[:=]\s*[^\r\n]+/gi, "$1: <redacted>");
  sanitized = sanitized.replace(/\b(token|secret|password|api[_-]?key)\s*[:=]\s*[^\s,;}]+/gi, "$1=<redacted>");
  for (const value of sensitiveValues) {
    if (typeof value === "string" && value.length >= 4) sanitized = sanitized.split(value).join("<redacted>");
  }
  return sanitized;
};

export const sanitizeRemoteSmokeArtifacts = ({ sourceDir, outputDir, sensitiveValues = [] } = {}) => {
  const source = resolve(sourceDir);
  const output = resolve(outputDir);
  if (!existsSync(source) || !statSync(source).isDirectory()) throw new Error("Remote smoke artifact source must be a readable directory.");
  if (output === source || output.startsWith(`${source}${sep}`)) throw new Error("Sanitized output must be outside the raw artifact tree.");
  mkdirSync(output, { recursive: true });

  const manifest = { sanitizedTextFiles: 0, omittedBinaryFiles: 0, truncatedFiles: 0 };
  for (const file of walk(source).slice(0, MAX_FILES)) {
    const extension = extname(file).toLowerCase();
    if (!TEXT_EXTENSIONS.has(extension)) {
      manifest.omittedBinaryFiles += 1;
      continue;
    }
    const raw = readFileSync(file);
    const truncated = raw.length > MAX_BYTES;
    const text = raw.subarray(0, MAX_BYTES).toString("utf8");
    manifest.sanitizedTextFiles += 1;
    if (truncated) manifest.truncatedFiles += 1;
    const targetName = `diagnostic-${String(manifest.sanitizedTextFiles).padStart(3, "0")}${TEXT_EXTENSIONS.has(extension) ? extension : ".txt"}`;
    writeFileSync(resolve(output, basename(targetName)), redactRemoteDiagnostic(text, { sensitiveValues }), "utf8");
  }

  writeFileSync(resolve(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  sanitizeRemoteSmokeArtifacts({ sourceDir: process.argv[2], outputDir: process.argv[3] });
}
