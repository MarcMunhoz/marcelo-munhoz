import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminSessionDisplay, createPreviewSession, selectedPreviewRole, signOutAdmin } from "../src/utils/adminAuth.js";

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

  it("formats authenticated owner and writer sessions with display identity and role", () => {
    assert.deepEqual(adminSessionDisplay({ name: "Marcelo Munhoz", roles: ["owner"] }), {
      name: "Marcelo Munhoz",
      role: "Owner",
      context: "Signed in",
      preview: false,
      canSignOut: true,
    });
    assert.deepEqual(adminSessionDisplay({ name: "Guest Writer", roles: ["writer"] }), {
      name: "Guest Writer",
      role: "Writer",
      context: "Signed in",
      preview: false,
      canSignOut: true,
    });
  });

  it("formats local preview as development context instead of a real identity", () => {
    assert.deepEqual(adminSessionDisplay(createPreviewSession({ role: "owner" })), {
      name: "Local preview",
      role: "Owner",
      context: "Development only",
      preview: true,
      canSignOut: false,
    });
  });

  it("signs out only after confirmation", async () => {
    const calls = [];
    const identity = {
      logout() {
        calls.push("logout");
      },
    };

    assert.equal(await signOutAdmin({ identity, confirmImpl: () => false }), false);
    assert.deepEqual(calls, []);

    assert.equal(await signOutAdmin({ identity, confirmImpl: () => true }), true);
    assert.deepEqual(calls, ["logout"]);
  });
});
