<template>
  <q-page class="q-pa-md row items-center">
    <q-circular-progress v-if="progress === true" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <ArticleList :data-articles="articles" v-if="$route.path === '/blog'" :class="progress && 'hidden'" />

    <q-pagination v-if="$route.path === '/blog'" v-model="currentPage" :max="maxPages" @click="setData" direction-links flat color="blue-grey-3" active-color="blue-grey-5" :class="progress && 'hidden'" class="w-full justify-center lg:mt-0 mt-6" />
  </q-page>
</template>

<script>
import { defineComponent, ref } from "vue";
import client from "../plugins/contentful";
import ArticleList from "../components/ArticlesList.vue";

export default defineComponent({
  name: "BlogPage",
  created() {
    return this.setData();
  },
  data() {
    return {
      articles: Array,
      maxPages: Number,
      currentPage: ref(1),
      skipArticles: Number,
      progress: true,
    };
  },
  methods: {
    async setData() {
      try {
        const articles = await client.getEntries({
          content_type: "article",
          order: "-sys.createdAt,-fields.createAt",
          limit: 3,
          skip: this.displayedArticles(),
        });

        return (this.articles = articles.items), (this.maxPages = this.calculatePagesCount(articles.total)), (this.progress = false);
      } catch (err) {
        console.error(err);
      }
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
    ArticleList,
  },
});
</script>
