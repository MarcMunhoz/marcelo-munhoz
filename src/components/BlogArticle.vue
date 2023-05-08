<template>
  <q-page class="q-pa-md row items-start">
    <article class="w-full">
      <cite class="block text-center">Artigo criado em {{ formatDate(article.createAt, "pt-br") }} | Última atualização: {{ formatDate(articleUpdateAt, "pt-br") }}</cite>

      <div class="border-dashed border-2 border-blue-grey-3 p-4 my-[3em] font-bold text-lg">{{ article.description }}</div>

      <div v-html="article.body"></div>

      <p class="text-right mt-4 font-bold">Escrito por {{ articleAuthor }}</p>
    </article>
  </q-page>
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
      articleUpdateAt: {
        type: String,
      },
      articleAuthor: {
        type: String,
      },
    };
  },
  components: {},
  mounted() {
    return this.asyncArticle();
  },
  methods: {
    async asyncArticle() {
      const article = await client.getEntries({
        content_type: "article",
        "fields.slug": this.$route.params.slug,
      });

      const headerArticleName = document.querySelector(".article-name");
      headerArticleName.append(` — ${article.items[0].fields.title}`);

      return (this.article = article.items[0].fields), (this.articleUpdateAt = article.items[0].sys.updatedAt), (this.articleAuthor = article.items[0].fields.author.fields.name);
    },
    formatDate(date, language) {
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };

      return new Date(date).toLocaleString(language, options);
    },
  },
});
</script>
