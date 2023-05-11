<template>
  <q-page class="q-pa-md row items-start">
    <article class="w-full">
      <cite class="block text-center">Artigo criado em {{ formatDate(article.createAt, "pt-br") }} | Última atualização: {{ formatDate(articleUpdateAt, "pt-br") }}</cite>

      <img v-if="articleImg" :src="articleImg" :title="article.title" class="max-h-[380px] w-full lg:w-[1000px] object-cover m-auto mt-5" />

      <div class="border-dashed border-2 border-blue-grey-3 p-4 my-[3em] font-bold text-lg">{{ article.description }}</div>

      <div class="rendered-text"></div>

      <p class="text-right mt-4 italic">Escrito por {{ articleAuthor }}</p>
    </article>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import client from "../plugins/contentful";
import { marked } from "marked";

export default defineComponent({
  name: "BlogArticle",
  data() {
    return {
      article: {
        type: Array,
      },
      articleImg: {
        type: URL,
      },
      articleUpdateAt: {
        type: String,
      },
      articleAuthor: {
        type: String,
      },
    };
  },
  mounted() {
    return this.asyncArticle();
  },
  methods: {
    async asyncArticle() {
      const article = await client.getEntries({
        content_type: "article",
        "fields.slug": this.$route.params.slug,
      });

      // Populates header with article title
      const headerArticleName = document.querySelector(".article-name");
      headerArticleName.innerHTML = `${article.items[0].fields.title}`;

      // Gets the article main image if its exists
      article.items[0].fields.cloudinary ? (this.articleImg = article.items[0].fields.cloudinary[0].url) : (this.articleImg = "");

      // Seeks and replaces embed links by iframe
      const articleBodyDOM = document.querySelector(".rendered-text");
      const regexLinkVideo = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?(?:youtube\.com|youtu\.be|vimeo\.com).*?)\1[^>]*>(.*?)<\/a>/gi;
      const parsedArticleBody = marked.parse(article.items[0].fields.body);
      const linkToIframe = parsedArticleBody.replace(regexLinkVideo, '<div id="video-container" class="relative pb-[56.25%] h-0"><iframe src="$2" allow="clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="allowfullscreen" id="video-iframe" class="absolute top-0 left-0 h-full w-full"></iframe></div>');
      articleBodyDOM.innerHTML = linkToIframe;

      // Populates articles main array, update date and author
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

<style lang="scss" scoped>
.rendered-text {
  &:deep {
    font-size: 1.3em;
    font-weight: 300;

    h2 {
      font-size: 1.7em;
      font-weight: 700;
    }

    p {
      line-height: 1.2;
      margin: 1em 0;
    }

    a {
      box-shadow: inset 0 -2px 0 $blue-grey-5;
      color: $blue-grey-5;
      transition: box-shadow 0.3s ease-out, background-color 0.3s ease-out;

      &:hover {
        background-color: $blue-grey-5;
        color: white;
      }
    }

    ul {
      list-style-type: disc;
    }

    ul,
    ol {
      margin-left: 1rem;

      li {
        display: list-item;
        text-align: -webkit-match-parent;
      }
    }

    code {
      color: $accent;
      font-weight: 700;
    }

    pre {
      background-color: $grey-3;
      padding: 1em;

      code {
        color: initial;
        font-weight: normal;
      }
    }

    img {
      margin: 1em auto;
      object-fit: cover;
    }
  }
}
</style>
