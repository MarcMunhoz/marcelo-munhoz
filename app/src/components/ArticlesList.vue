<template>
  <section class="row gap-4 justify-center w-full">
    <q-card class="w-[350px]" v-for="article in dataArticles" :key="article.sys.id">
      <router-link :to="{ name: 'Artigo', params: { slug: article.fields.slug } }">
        <img :src="articleCardImageUrl(article.fields)" :alt="article.fields.alt || article.fields.title" />

        <q-card-section>
          <div class="text-h6">{{ article.fields.title }}</div>
          <div class="text-subtitle2">by {{ article.fields.author.fields.name }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">{{ article.fields.description }}</q-card-section>
      </router-link>
    </q-card>
  </section>
</template>

<script>
import { defineComponent } from "vue";
import { articleCardImageUrl } from "../utils/contentfulImages.js";

export default defineComponent({
  name: "ArticleList",
  props: {
    dataArticles: {
      type: Array,
    },
  },
  methods: {
    articleCardImageUrl,
  },
});
</script>
