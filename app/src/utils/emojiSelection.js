export function replaceEmojiSelection({ value = "", selectionStart, selectionEnd, emoji }) {
  const start = Number.isInteger(selectionStart) ? Math.max(0, Math.min(value.length, selectionStart)) : value.length;
  const end = Number.isInteger(selectionEnd) ? Math.max(start, Math.min(value.length, selectionEnd)) : start;
  const caret = start + emoji.length;
  return { value: value.slice(0, start) + emoji + value.slice(end), selectionStart: caret, selectionEnd: caret };
}
