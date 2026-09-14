<template>
  <div class="article-content-blocks">
    <template v-for="(block, index) in blocks" :key="`${block.type}-${index}`">
      <div v-if="block.type === 'markdown'" class="article-body-block article-markdown-block" v-html="block.html"></div>
      <div v-else class="article-body-block article-video">
        <iframe
          :src="block.src"
          :title="`YouTube video: ${title}`"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { articleContentBlocks } from "../utils/articleContent.js";

const props = defineProps({
  source: { type: String, default: "" },
  title: { type: String, default: "Article" },
});

const blocks = computed(() => articleContentBlocks(props.source));
</script>

<style scoped>
.article-content-blocks,
.article-body-block {
  max-width: 100%;
  min-width: 0;
}

.article-markdown-block {
  overflow-wrap: anywhere;
}

:deep(.article-markdown-block img) {
  height: auto;
  max-width: 100%;
}

:deep(.article-markdown-block pre),
:deep(.article-markdown-block table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}

.article-video {
  aspect-ratio: 16 / 9;
  margin: 1.5rem 0;
  overflow: hidden;
  width: 100%;
}

.article-video iframe {
  border: 0;
  display: block;
  height: 100%;
  width: 100%;
}
</style>
