<template>
  <q-page class="q-pa-md row items-start">
    <BlogIndex :data-articles="articles" :total-articles="totalArticles" />
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { createClient } from "contentful";
import BlogIndex from "../components/BlogIndex.vue";

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_DELIVERY,
  environment: "articles",
});

export default defineComponent({
  name: "BlogPage",
  created() {
    this.setData();
  },
  data() {
    return {
      articles: Array,
      totalArticles: Number,
    };
  },
  methods: {
    async setData() {
      const articlesRaw = await client.getEntries({
        content_type: "article",
        order: "-fields.createAt",
        limit: 3,
      });

      return (this.articles = articlesRaw.items), (this.totalArticles = articlesRaw.total);
    },
  },
  components: {
    BlogIndex,
  },
});
</script>
