import source from "../../src/components/EditorEmojiPicker.vue?raw";
import { parse, compileStyle } from "@vue/compiler-sfc";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelectorAll("style[data-emoji-test]").forEach((style) => style.remove());
  window.happyDOM.setWindowSize({ width: 1024, height: 768 });
});

describe("emoji picker responsive styles", () => {
  it.each([320, 375, 600, 1440])("applies scrolling and compact category styles at %spx", (width) => {
    window.happyDOM.setWindowSize({ width, height: 812 });
    const { descriptor } = parse(source);
    const { code, errors } = compileStyle({ source: descriptor.styles[0].content, id: "data-v-emoji-test", scoped: true });
    expect(errors).toEqual([]);
    const style = document.createElement("style");
    style.dataset.emojiTest = "true";
    style.textContent = code;
    document.head.appendChild(style);
    const panel = document.createElement("section");
    panel.className = "emoji-picker-panel";
    panel.setAttribute("data-v-emoji-test", "");
    const host = panel.appendChild(document.createElement("div"));
    host.className = "emoji-picker-host";
    host.setAttribute("data-v-emoji-test", "");
    const picker = host.appendChild(document.createElement("emoji-picker"));
    document.body.appendChild(panel);

    const panelStyle = getComputedStyle(panel);
    expect(panelStyle.overflow).toBe("auto");
    expect(panelStyle.position).toBe("absolute");
    expect(Number(panelStyle.zIndex)).toBeGreaterThan(0);
    expect(panelStyle.maxWidth).toBe("calc(100% - 16px)");
    if (width <= 720) {
      expect(panelStyle.left).toBe("8px");
      expect(panelStyle.right).toBe("8px");
    }
    const pickerStyle = getComputedStyle(picker);
    expect(pickerStyle.width).toBe("100%");
    expect(pickerStyle.maxHeight).toBe("60dvh");
    expect(pickerStyle.getPropertyValue("--num-columns").trim()).toBe(width < 420 ? "6" : "8");
    if (width < 420) {
      expect(pickerStyle.getPropertyValue("--category-emoji-size").trim()).toBe("1rem");
      expect(pickerStyle.getPropertyValue("--category-emoji-padding").trim()).toBe("0.2rem");
    }
  });
});
