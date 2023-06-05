<template>
  <router-view :key="$route.fullPath" />
</template>

<script>
import { defineComponent } from "vue";
import { createMetaMixin } from "quasar";

export default defineComponent({
  name: "App",
  mixins: [
    createMetaMixin(function () {
      return {
        meta: {
          description: {
            name: "description",
            content: "Some brief histories of my past-present development experience. The life, the universe and everything about a tech life",
          },
        },
      };
    }),
  ],
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
