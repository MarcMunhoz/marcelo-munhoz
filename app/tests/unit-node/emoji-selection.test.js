import { describe, expect, it } from "vitest";
import { replaceEmojiSelection } from "../../src/utils/emojiSelection.js";

describe("Unicode emoji selection", () => {
  it.each([[2, 2, "Hi👩🏽‍💻 there"], [2, 8, "Hi👩🏽‍💻"]])("inserts or replaces UTF-16 selection %s:%s", (start, end, expected) => {
    expect(replaceEmojiSelection({ value: "Hi there", selectionStart: start, selectionEnd: end, emoji: "👩🏽‍💻" }))
      .toEqual({ value: expected, selectionStart: 9, selectionEnd: 9 });
  });
  it("appends when selection is unavailable and preserves existing emoji", () => {
    expect(replaceEmojiSelection({ value: "🌻", emoji: "❤️" })).toEqual({ value: "🌻❤️", selectionStart: 4, selectionEnd: 4 });
  });
});
