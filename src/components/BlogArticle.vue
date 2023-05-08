<template>
  <div>
    {{ article.title }}
  </div>
</template>

<script>
import { defineComponent } from "vue";
import client from "../plugins/contentful";

export default defineComponent({
  name: "BlogArticle",
  data() {
    return {
      article: {
        type: Array,
      },
    };
  },
  methods: {
    async asyncArticle() {
      const article = await client.getEntry(this.$route.params.article);

      return (this.article = article.fields);
    },
  },
  beforeMount() {
    return this.asyncArticle();
  },
});
</script>
