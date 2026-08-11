import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPreviewSession, selectedPreviewRole } from "../src/utils/adminAuth.js";

describe("admin auth preview sessions", () => {
  it("uses owner as the default local preview role for full admin testing", () => {
    assert.equal(selectedPreviewRole({ storage: null }), "owner");
    assert.deepEqual(createPreviewSession({ role: "owner" }), {
      subject: "local-preview-owner",
      name: "Owner preview",
      roles: ["owner"],
      preview: true,
    });
  });

  it("allows switching the local preview role between writer and owner", () => {
    const storage = {
      getItem(key) {
        return key === "admin.previewRole" ? "writer" : null;
      },
    };

    assert.equal(selectedPreviewRole({ storage }), "writer");
    assert.deepEqual(createPreviewSession({ role: "writer" }), {
      subject: "local-preview-writer",
      name: "Writer preview",
      roles: ["writer"],
      preview: true,
    });
  });

  it("falls back to owner when local preview storage contains an unsupported role", () => {
    const storage = {
      getItem() {
        return "admin";
      },
    };

    assert.equal(selectedPreviewRole({ storage }), "owner");
  });
});
