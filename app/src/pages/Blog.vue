<template>
  <q-page class="q-pa-md row items-center">
    <q-circular-progress v-if="progress === true" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <ArticleList :data-articles="articles" v-if="$route.path === '/blog'" :class="progress && 'hidden'" />

    <q-pagination
      v-if="$route.path === '/blog'"
      v-model="currentPage"
      :max="maxPages"
      @update:model-value="setData"
      direction-links
      flat
      color="blue-grey-3"
      active-color="blue-grey-5"
      :class="progress && 'hidden'"
      class="w-full justify-center lg:mt-0 mt-6"
    />
  </q-page>
</template>

<script>
import { defineComponent, ref } from "vue";
import ArticleList from "../components/ArticlesList.vue";

export default defineComponent({
  name: "BlogPage",
  created() {
    return this.setData();
  },
  data() {
    return {
      articles: [],
      maxPages: 0,
      currentPage: 1,
      skipArticles: 0,
      progress: true,
    };
  },
  methods: {
    async setData() {
      this.progress = true;
      try {
        const res = await fetch(`/api/contentful/entries?page=${this.currentPage}`);

        const data = await res.json();
        this.articles = data.items;
        this.maxPages = this.calculatePagesCount(data.total);
      } catch (err) {
        console.error("Erro ao carregar artigos:", err);
      } finally {
        this.progress = false;
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
