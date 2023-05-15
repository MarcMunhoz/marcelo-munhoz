<template>
  <q-page class="q-pa-md row items-center">
    <q-circular-progress v-if="progress === true" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />
    <section class="row gap-4 justify-center w-full" :class="progress && 'hidden'">
      <q-card class="w-[350px]" v-for="article in articlesTag" :key="article.id">
        <router-link :to="{ name: 'Artigo', params: { slug: article.fields.slug, id: article.sys.id } }">
          <img v-if="article.fields.cloudinary" :src="`https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/${article.fields.cloudinary[0].public_id}`" />
          <img v-else src="https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/marcelo-munhoz-website/no-thumbnail.jpg" />

          <q-card-section>
            <div class="text-h6">{{ article.fields.title }}</div>
            <div class="text-subtitle2">by {{ article.fields.author.fields.name }}</div>
          </q-card-section>

          <q-card-section class="q-pt-none">{{ article.fields.description }}</q-card-section>
        </router-link>
      </q-card>
    </section>
    <q-pagination v-model="currentPage" :max="maxPages" @click="setData" direction-links flat color="blue-grey-3" active-color="blue-grey-5" class="w-full justify-center lg:mt-0 mt-6" />
  </q-page>
</template>

<script>
import { defineComponent, ref } from "vue";
import client from "src/plugins/contentful";
import displayedArticles from "../pages/Blog.vue";
import calculatePagesCount from "../pages/Blog.vue";

export default defineComponent({
  name: "ArticlesTags",
  created() {
    return (this.currentTag = this.$router.currentRoute.value.params.tag), this.setData();
  },
  data() {
    return {
      articlesTag: Array,
      currentTag: String,
      maxPages: Number,
      currentPage: ref(1),
      skipArticles: Number,
      progress: true,
    };
  },
  mixins: [displayedArticles, calculatePagesCount],
  methods: {
    async setData() {
      try {
        const articles = await client.getEntries({
          "metadata.tags.sys.id[all]": this.currentTag,
          content_type: "article",
          order: "-fields.createAt",
          limit: 3,
          skip: this.displayedArticles(),
        });

        const headerTags = document.querySelector(".header-title");
        headerTags.innerHTML = `#${this.currentTag}`;

        return (this.articlesTag = articles.items), ((this.maxPages = this.calculatePagesCount(articles.total)), (this.progress = false));
      } catch (error) {
        console.error(error);
      }
    },
  },
});
</script>
