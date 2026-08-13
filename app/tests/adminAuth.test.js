import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminAccountInitials, adminSessionDisplay, createPreviewSession, getAdminSession, openAdminLogin, selectedPreviewRole, signOutAdmin } from "../src/utils/adminAuth.js";

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

  it("loads the Contentful author profile id from authenticated user metadata", async () => {
    const previousIdentity = globalThis.netlifyIdentity;

    globalThis.netlifyIdentity = {
      currentUser() {
        return {
          id: "user-123",
          email: "writer@example.test",
          app_metadata: {
            roles: ["writer"],
            authorEntryId: "author-1",
          },
          async jwt() {
            return "token";
          },
        };
      },
    };

    try {
      assert.deepEqual(await getAdminSession(), {
        subject: "user-123",
        name: "writer@example.test",
        roles: ["writer"],
        authorEntryId: "author-1",
        token: "token",
        preview: false,
      });
    } finally {
      globalThis.netlifyIdentity = previousIdentity;
    }
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

  it("formats account menu initials without requiring a profile photo", () => {
    assert.equal(adminAccountInitials({ name: "Marcelo Munhoz", roles: ["owner"] }), "MM");
    assert.equal(adminAccountInitials({ name: "Guest", roles: ["writer"] }), "G");
    assert.equal(adminAccountInitials(createPreviewSession({ role: "writer" })), "W");
    assert.equal(adminAccountInitials(null), "AD");
  });

  it("falls back to the Netlify Identity login route when the widget is unavailable", () => {
    const previousIdentity = globalThis.netlifyIdentity;
    const location = { href: "" };

    globalThis.netlifyIdentity = undefined;

    try {
      assert.equal(openAdminLogin({ location }), true);
      assert.equal(location.href, "/.netlify/identity/login");
    } finally {
      globalThis.netlifyIdentity = previousIdentity;
    }
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
