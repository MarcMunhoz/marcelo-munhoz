<template>
  <q-page class="q-pa-md row items-center">
    <ArticleList :data-articles="articles" v-if="$route.path === '/blog'" />

    <q-pagination v-if="$route.path === '/blog'" v-model="currentPage" :max="maxPages" @click="setData" direction-links flat color="blue-grey-3" active-color="blue-grey-5" class="w-full justify-center lg:mt-0 mt-6" />
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
    };
  },
  methods: {
    async setData() {
      try {
        const articles = await client.getEntries({
          content_type: "article",
          order: "-fields.createAt",
          limit: 3,
          skip: this.displayedArticles(),
        });

        return (this.articles = articles.items), (this.maxPages = this.calculatePagesCount(articles.total));
      } catch (err) {
        const error = Object.getOwnPropertyDescriptors(err)
          .message.value.split("\n")[3]
          .replace(/['",]+/g, "");
        console.error(`${error} ¯\\_(ツ)_/¯`);
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
