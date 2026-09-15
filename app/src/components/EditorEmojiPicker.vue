<template>
  <section id="body-emoji-picker" class="emoji-picker-panel" aria-label="Emoji picker" @keydown.esc.stop.prevent="$emit('close')">
    <header>
      <span>Emoji</span>
      <button ref="closeButton" type="button" aria-label="Close emoji picker" @click="$emit('close')">Close</button>
    </header>
    <p v-if="loading" role="status">Loading emoji…</p>
    <p v-if="failed" role="alert">Emoji picker is unavailable. You can continue typing or close and try again.</p>
    <div ref="host" class="emoji-picker-host"></div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { createEmojiPicker } from "../utils/emojiPicker.js";

const emit = defineEmits(["select", "close"]);
const host = ref(null);
const closeButton = ref(null);
const loading = ref(true);
const failed = ref(false);
let active = true;
let picker;
const select = (event) => {
  if (active && typeof event.detail?.unicode === "string" && event.detail.unicode) emit("select", event.detail.unicode);
};
onMounted(async () => {
  closeButton.value?.focus();
  try {
    const loaded = await createEmojiPicker(host.value);
    if (!active || !loaded) return;
    picker = loaded;
    picker.addEventListener("emoji-click", select);
    loading.value = false;
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
  picker?.removeEventListener("emoji-click", select);
  // Removing the host also disconnects a picker still awaiting its database.
  host.value?.replaceChildren();
});
</script>

<style scoped>
.emoji-picker-panel {
  box-sizing: border-box;
  width: min(100%, 360px);
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
