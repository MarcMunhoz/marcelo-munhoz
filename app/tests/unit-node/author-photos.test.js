import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  authorPhotoCandidates,
  authorPhotoResetActionLabel,
  authorPhotoSource,
  gravatarAvatarUrl,
  isAllowedFallbackPhotoUrl,
  nextAuthorPhotoIndex,
  normalizeGravatarProfileInput,
} from "../../src/utils/authorPhotos.js";

const HASH = "a".repeat(64);

describe("author photo resolution", () => {
  it("normalizes public Gravatar slugs, URLs, and canonical hashes without accepting email addresses", () => {
    assert.equal(normalizeGravatarProfileInput(" marcelo.munhoz "), "marcelo.munhoz");
    assert.equal(normalizeGravatarProfileInput("https://gravatar.com/marcelo.munhoz/"), "marcelo.munhoz");
    assert.equal(normalizeGravatarProfileInput(HASH.toUpperCase()), HASH);
    assert.equal(normalizeGravatarProfileInput("writer@example.test"), "");
    assert.equal(normalizeGravatarProfileInput("https://example.test/marcelo"), "");
  });

  it("builds a bounded G-rated Gravatar URL that reports a missing avatar", () => {
    assert.equal(gravatarAvatarUrl(HASH), `https://gravatar.com/avatar/${HASH}?s=192&r=g&d=404`);
    assert.equal(gravatarAvatarUrl("not-a-hash"), "");
  });

  it("accepts only HTTPS fallbacks from the explicit image host allowlist", () => {
    assert.equal(isAllowedFallbackPhotoUrl(""), true);
    assert.equal(isAllowedFallbackPhotoUrl("https://res.cloudinary.com/demo/image/upload/avatar.webp"), true);
    assert.equal(isAllowedFallbackPhotoUrl("https://images.ctfassets.net/space/avatar.jpg"), true);
    assert.equal(isAllowedFallbackPhotoUrl("http://res.cloudinary.com/demo/avatar.jpg"), false);
    assert.equal(isAllowedFallbackPhotoUrl("https://user:secret@res.cloudinary.com/demo/avatar.jpg"), false);
    assert.equal(isAllowedFallbackPhotoUrl("https://example.test/avatar.jpg"), false);
  });

  it("orders Gravatar, allowlisted fallback, and legacy photos without duplicates", () => {
    assert.deepEqual(
      authorPhotoCandidates({
        photo: {
          gravatar_hash: HASH,
          fallback_url: "https://res.cloudinary.com/demo/image/upload/avatar.webp",
          secure_url: `https://gravatar.com/avatar/${HASH}?s=192&r=g&d=404`,
        },
      }),
      [
        `https://gravatar.com/avatar/${HASH}?s=192&r=g&d=404`,
        "https://res.cloudinary.com/demo/image/upload/avatar.webp",
      ]
    );
    assert.deepEqual(authorPhotoCandidates({ photo: "https://secure.gravatar.com/avatar/legacy" }), [
      "https://secure.gravatar.com/avatar/legacy",
    ]);
  });

  it("advances through candidates once and terminates at initials without looping", () => {
    const candidates = ["https://gravatar.com/avatar/hash", "https://res.cloudinary.com/demo/fallback.jpg"];
    assert.equal(nextAuthorPhotoIndex(candidates, 0), 1);
    assert.equal(nextAuthorPhotoIndex(candidates, 1), 2);
    assert.equal(nextAuthorPhotoIndex(candidates, 2), 2);
  });

  it("identifies the source of the photo candidate currently displayed", () => {
    const author = {
      photo: {
        gravatar_profile: "marcelo.munhoz",
        gravatar_hash: HASH,
        fallback_url: "https://res.cloudinary.com/demo/image/upload/avatar.webp",
        secure_url: "https://images.ctfassets.net/space/legacy.jpg",
      },
    };

    assert.deepEqual(authorPhotoSource(author, 0), { kind: "gravatar", label: "Gravatar", detail: "marcelo.munhoz" });
    assert.deepEqual(authorPhotoSource(author, 1), { kind: "fallback", label: "Fallback URL", detail: "" });
    assert.deepEqual(authorPhotoSource(author, 2), { kind: "legacy", label: "Legacy photo", detail: "" });
    assert.deepEqual(authorPhotoSource(author, 3), { kind: "initials", label: "Initials", detail: "" });
  });

  it("identifies an existing unconfigured image as a legacy photo", () => {
    assert.deepEqual(authorPhotoSource({ photo: "https://secure.gravatar.com/avatar/legacy" }), {
      kind: "legacy",
      label: "Legacy photo",
      detail: "",
    });
  });

  it("keeps a clear-settings action after a broken configured photo falls back to initials", () => {
    assert.equal(authorPhotoResetActionLabel("legacy", 1), "Use initials instead");
    assert.equal(authorPhotoResetActionLabel("initials", 1), "Keep initials and clear photo settings");
    assert.equal(authorPhotoResetActionLabel("initials", 0), "");
  });
});
