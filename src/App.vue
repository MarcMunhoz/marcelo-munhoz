<template>
  <router-view :key="$route.fullPath" />
</template>

<script>
import { defineComponent } from "vue";
import { useMeta } from "quasar";

const metaData = {
  meta: {
    author: { name: "author", content: "Marcelo Munhoz <me@marcelomunhoz.com>" },
    description: { name: "description", content: "Some brief histories of my past-present development experience. The life, the universe and everything about a tech life" },
    keywords: { name: "keywords", content: "blog,personal,pessoal,developer,Quasar,Vue,Vuejs,coding,webtech,tips,dicas" },
    equiv: { "http-equiv": "Content-Type", content: "text/html; charset=UTF-8" },
  },
};

export default defineComponent({
  name: "App",
  setup() {
    useMeta(metaData);
  },
  watch: {
    $route: {
      immediate: true,
      handler(to, from) {
        document.title = `Marcelo Munhoz - ${to.meta.title}` || "Marcelo Munhoz";
      },
    },
  },
});
</script>
