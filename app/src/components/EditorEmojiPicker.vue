<template>
  <section ref="panel" id="body-emoji-picker" class="emoji-picker-panel" :style="floatingStyle" aria-label="Emoji picker" @keydown.esc.stop.prevent="$emit('close')">
    <header>
      <button type="button" class="emoji-picker-drag-handle" aria-label="Move emoji picker" :disabled="!movable" @pointerdown="startDragging" @keydown="moveWithKeyboard">
        <span aria-hidden="true">⋮⋮</span>
        <span>Emoji</span>
      </button>
      <button ref="closeButton" type="button" aria-label="Close emoji picker" @click="$emit('close')">Close</button>
    </header>
    <p v-if="loading" role="status">Loading emoji…</p>
    <p v-if="failed" role="alert">Emoji picker is unavailable. You can continue typing or close and try again.</p>
    <div ref="host" class="emoji-picker-host"></div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { createEmojiPicker } from "../utils/emojiPicker.js";

const emit = defineEmits(["select", "close"]);
const panel = ref(null);
const host = ref(null);
const closeButton = ref(null);
const loading = ref(true);
const failed = ref(false);
let active = true;
let picker;
let drag;
const position = ref(null);
const movable = ref(window.innerWidth > 720);
const floatingStyle = computed(() => position.value ? {
  left: `${position.value.left}px`,
  right: "auto",
  top: `${position.value.top}px`,
} : undefined);
const clampPosition = (left, top) => {
  const panelElement = panel.value;
  const boundary = panelElement?.parentElement;
  if (!panelElement || !boundary) return { left, top };
  const boundaryRect = boundary.getBoundingClientRect();
  const panelRect = panelElement.getBoundingClientRect();
  return {
    left: Math.min(Math.max(8, left), Math.max(8, boundaryRect.width - panelRect.width - 8)),
    top: Math.min(Math.max(8, top), Math.max(8, boundaryRect.height - panelRect.height - 8)),
  };
};
const stopDragging = () => {
  drag = null;
  window.removeEventListener("pointermove", movePicker);
  window.removeEventListener("pointerup", stopDragging);
  window.removeEventListener("pointercancel", stopDragging);
};
const movePicker = (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  position.value = clampPosition(
    drag.left + event.clientX - drag.clientX,
    drag.top + event.clientY - drag.clientY
  );
};
const startDragging = (event) => {
  if (!movable.value) return;
  const panelRect = panel.value?.getBoundingClientRect();
  const boundaryRect = panel.value?.parentElement?.getBoundingClientRect();
  if (!panelRect || !boundaryRect) return;
  const initial = clampPosition(panelRect.left - boundaryRect.left, panelRect.top - boundaryRect.top);
  position.value = initial;
  drag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...initial };
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  window.addEventListener("pointermove", movePicker);
  window.addEventListener("pointerup", stopDragging);
  window.addEventListener("pointercancel", stopDragging);
};
const moveWithKeyboard = (event) => {
  const direction = {
    ArrowLeft: [-16, 0],
    ArrowRight: [16, 0],
    ArrowUp: [0, -16],
    ArrowDown: [0, 16],
  }[event.key];
  if (!direction || !movable.value) return;
  event.preventDefault();
  const panelRect = panel.value?.getBoundingClientRect();
  const boundaryRect = panel.value?.parentElement?.getBoundingClientRect();
  if (!panelRect || !boundaryRect) return;
  const current = position.value || clampPosition(panelRect.left - boundaryRect.left, panelRect.top - boundaryRect.top);
  position.value = clampPosition(current.left + direction[0], current.top + direction[1]);
};
const syncViewport = () => {
  movable.value = window.innerWidth > 720;
  if (!movable.value) {
    position.value = null;
    stopDragging();
    return;
  }
  if (position.value) position.value = clampPosition(position.value.left, position.value.top);
};
const select = (event) => {
  if (active && typeof event.detail?.unicode === "string" && event.detail.unicode) emit("select", event.detail.unicode);
};
onMounted(async () => {
  window.addEventListener("resize", syncViewport);
  closeButton.value?.focus();
  try {
    const loaded = await createEmojiPicker(host.value);
    if (!active || !loaded) return;
    picker = loaded;
    picker.addEventListener("emoji-click", select);
    loading.value = false;
    await nextTick();
    syncViewport();
    if (closeButton.value?.parentElement?.parentElement?.contains(document.activeElement)) {
      picker.shadowRoot?.querySelector("input")?.focus();
    }
  } catch {
    if (active) {
      loading.value = false;
      failed.value = true;
    }
  }
});
onBeforeUnmount(() => {
  active = false;
  stopDragging();
  window.removeEventListener("resize", syncViewport);
  picker?.removeEventListener("emoji-click", select);
  // Removing the host also disconnects a picker still awaiting its database.
  host.value?.replaceChildren();
});
</script>

<style scoped>
.emoji-picker-panel {
  box-sizing: border-box;
  position: absolute;
  top: 96px;
  right: 8px;
  z-index: 20;
  width: min(100%, 360px);
  max-width: calc(100% - 16px);
  min-width: 0;
  max-height: min(520px, 75dvh);
  overflow: auto;
  border: 1px solid #b0bec5;
  color: #263238;
  background: #ffffff;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px;
}
.emoji-picker-drag-handle {
  align-items: center;
  display: inline-flex;
  gap: 6px;
  cursor: grab;
  touch-action: none;
}
.emoji-picker-drag-handle:active { cursor: grabbing; }
button {
  color: #455a64;
  background: #ffffff;
  border: 1px solid #90a4ae;
  padding: 6px 10px;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid #455a64;
  outline-offset: 2px;
}
p { padding: 0 8px; }
.emoji-picker-host { min-width: 0; }
.emoji-picker-host :deep(emoji-picker) {
  width: 100%;
  height: 380px;
  max-height: 60dvh;
  --num-columns: 8;
  --background: #ffffff;
  --border-color: #cfd8dc;
  --outline-color: #455a64;
}
@media (max-width: 720px) {
  .emoji-picker-panel {
    left: 8px !important;
    right: 8px !important;
    width: auto;
  }
  .emoji-picker-drag-handle { cursor: default; }
}
@media (max-width: 420px) {
  .emoji-picker-host :deep(emoji-picker) {
    --num-columns: 6;
    --emoji-size: 1.25rem;
    --emoji-padding: 0.35rem;
    --category-emoji-size: 1rem;
    --category-emoji-padding: 0.2rem;
  }
}
</style>
