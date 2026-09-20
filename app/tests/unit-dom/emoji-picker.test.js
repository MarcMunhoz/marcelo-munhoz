import { beforeEach, describe, expect, it, vi } from "vitest";
const controls = vi.hoisted(() => ({ construct: vi.fn(), ready: vi.fn() }));
vi.mock("emoji-picker-element/picker", () => ({ default: class {
  constructor(options) {
    controls.construct(options);
    const element = document.createElement("div");
    element.database = { ready: controls.ready };
    return element;
  }
} }));
import { createEmojiPicker } from "../../src/utils/emojiPicker.js";

beforeEach(() => {
  controls.construct.mockReset();
  controls.ready.mockReset().mockResolvedValue(undefined);
  document.body.replaceChildren();
});
describe("local emoji picker initialization", () => {
  it("uses Portuguese labels and a local catalog and connects before opening the database", async () => {
    const host = document.body.appendChild(document.createElement("div"));
    controls.ready.mockImplementationOnce(async () => expect(host.children).toHaveLength(1));
    const picker = await createEmojiPicker(host);
    expect(host.firstChild).toBe(picker);
    const options = controls.construct.mock.calls[0][0];
    expect(options.locale).toBe("pt");
    expect(options.dataSource).toContain("/pt/cldr/data.json");
    expect(options.dataSource).not.toMatch(/^https?:\/\//);
    expect(options.i18n.searchLabel).toBeTruthy();
    expect(options.i18n.searchLabel).not.toBe("Search");
    expect(picker.classList.contains("light")).toBe(true);
  });
  it("does not construct after the editor disconnects during import", async () => {
    expect(await createEmojiPicker(document.createElement("div"))).toBeNull();
    expect(controls.construct).not.toHaveBeenCalled();
  });
  it("disconnects a picker whose database fails", async () => {
    const host = document.body.appendChild(document.createElement("div"));
    controls.ready.mockRejectedValueOnce(new Error("IndexedDB unavailable"));
    await expect(createEmojiPicker(host)).rejects.toThrow("IndexedDB unavailable");
    expect(host.children).toHaveLength(0);
  });
});
