<template>
  <router-view :key="$route.fullPath" />
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "App",
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
