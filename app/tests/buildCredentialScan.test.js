import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";

import { scanBuiltAssetsForCredentials } from "../scripts/scan-built-assets.js";

const withFixtureDir = (files, callback) => {
  const dir = mkdtempSync(join(tmpdir(), "credential-scan-"));

  try {
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(dir, name), content);
    }

    return callback(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe("built asset credential scan", () => {
  it("passes when built frontend assets contain no admin credential names or sanitized values", () => {
    withFixtureDir(
      {
        "app.js": "const apiBase='/api/admin/contentful';",
        "index.html": "<script src='/assets/app.js'></script>",
      },
      (dir) => {
        const result = scanBuiltAssetsForCredentials({
          rootDir: dir,
          env: {
            CONTENTFUL_MANAGEMENT_TOKEN: "cfmgmt_sanitized_alias_789",
            CONTENTFUL_MANAGEMENT_KEY: "cfmgmt_sanitized_secret_123",
            CLOUDINARY_API_KEY: "cloudinary_sanitized_key_123",
            CLOUDINARY_API_SECRET: "cloudinary_sanitized_secret_456",
            CLOUDINARY_CLOUD_NAME: "public-cloud-name",
            CLOUDINARY_UPLOAD_FOLDER: "public-folder",
          },
        });

        assert.deepEqual(result, []);
      }
    );
  });

  it("reports credential names and configured sanitized values found in built frontend assets", () => {
    withFixtureDir(
      {
        "app.js": "window.bad='CONTENTFUL_MANAGEMENT_KEY';",
        "chunk.js": "const leaked='cloudinary_sanitized_secret_456';",
        "worker.js": "const alsoBad='CLOUDINARY_API_KEY';",
      },
      (dir) => {
        const result = scanBuiltAssetsForCredentials({
          rootDir: dir,
          env: {
            CONTENTFUL_MANAGEMENT_TOKEN: "cfmgmt_sanitized_alias_789",
            CONTENTFUL_MANAGEMENT_KEY: "cfmgmt_sanitized_secret_123",
            CLOUDINARY_API_KEY: "cloudinary_sanitized_key_123",
            CLOUDINARY_API_SECRET: "cloudinary_sanitized_secret_456",
            CLOUDINARY_CLOUD_NAME: "public-cloud-name",
            CLOUDINARY_UPLOAD_FOLDER: "public-folder",
          },
        });

        assert.deepEqual(result, [
          { file: "app.js", indicator: "CONTENTFUL_MANAGEMENT_KEY" },
          { file: "chunk.js", indicator: "CLOUDINARY_API_SECRET value" },
          { file: "worker.js", indicator: "CLOUDINARY_API_KEY" },
        ]);
      }
    );
  });
});
