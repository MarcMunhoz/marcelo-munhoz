import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CREDENTIAL_ENV_NAMES = [
  "CONTENTFUL_MANAGEMENT_KEY",
  "CONTENTFUL_MANAGEMENT_TOKEN",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_UPLOAD_FOLDER",
  "CLOUDINARY_FOLDER",
  "CLOUDINARY_UPLOAD_PRESET",
  "CLOUDINARY_URL",
];

const SECRET_VALUE_ENV_NAMES = new Set([
  "CONTENTFUL_MANAGEMENT_KEY",
  "CONTENTFUL_MANAGEMENT_TOKEN",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLOUDINARY_UPLOAD_PRESET",
  "CLOUDINARY_URL",
]);

const TEXT_ASSET_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);

const extensionOf = (path) => {
  const index = path.lastIndexOf(".");
  return index >= 0 ? path.slice(index) : "";
};

const walkFiles = (rootDir) => {
  const files = [];
  const pending = [rootDir];

  while (pending.length) {
    const current = pending.pop();
    const stat = statSync(current);

    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) {
        pending.push(resolve(current, entry));
      }
    } else if (stat.isFile() && TEXT_ASSET_EXTENSIONS.has(extensionOf(current))) {
      files.push(current);
    }
  }

  return files.sort();
};

const uniqueIndicatorsFromEnv = (env = {}) =>
  CREDENTIAL_ENV_NAMES.flatMap((name) => {
    const indicators = [{ name, value: name, label: name }];
    const configuredValue = env[name];

    if (SECRET_VALUE_ENV_NAMES.has(name) && typeof configuredValue === "string" && configuredValue.length >= 8) {
      indicators.push({ name, value: configuredValue, label: `${name} value` });
    }

    return indicators;
  });

export const scanBuiltAssetsForCredentials = ({ rootDir = "dist", env = process.env } = {}) => {
  const resolvedRoot = resolve(rootDir);

  if (!existsSync(resolvedRoot)) {
    throw new Error(`Built assets directory not found: ${rootDir}`);
  }

  const findings = [];
  const indicators = uniqueIndicatorsFromEnv(env);

  for (const file of walkFiles(resolvedRoot)) {
    const source = readFileSync(file, "utf8");

    for (const indicator of indicators) {
      if (source.includes(indicator.value)) {
        findings.push({
          file: relative(resolvedRoot, file),
          indicator: indicator.label,
        });
      }
    }
  }

  return findings;
};

const isCli = process.argv[1] === fileURLToPath(import.meta.url);

if (isCli) {
  const rootDir = process.argv[2] || "dist";
  const findings = scanBuiltAssetsForCredentials({ rootDir });

  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`Credential indicator found in built asset: ${finding.file} (${finding.indicator})`);
    }

    process.exitCode = 1;
  }
}
