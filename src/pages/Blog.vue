<template>
  <q-page class="q-pa-md row items-center">
    <BlogIndex :data-articles="articles" />

    <q-pagination v-model="currentPage" :max="maxPages" @click="setData" direction-links flat color="blue-grey-3" active-color="blue-grey-5" class="w-full justify-center lg:mt-0 mt-6" />
  </q-page>
</template>

<script>
import { defineComponent, ref } from "vue";
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
      maxPages: Number,
      currentPage: ref(1),
      skipArticles: Number,
    };
  },
  methods: {
    async setData() {
      const articles = await client.getEntries({
        content_type: "article",
        order: "-fields.createAt",
        limit: 3,
        skip: this.displayedArticles(),
      });

      return (this.articles = articles.items), (this.maxPages = this.calculatePagesCount(articles.total));
    },
    calculatePagesCount(totalCount) {
      const maxArticles = 3;

      return totalCount < maxArticles ? 1 : Math.ceil(totalCount / maxArticles);
    },
    displayedArticles() {
      return this.currentPage > 1 ? (this.skipArticles = 3 * this.currentPage - 3) : (this.skipArticles = 0);
    },
  },
  components: {
    BlogIndex,
  },
});
</script>
