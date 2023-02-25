<template>
  <article class="container-fluid mt-4 py-0 px-3">
    <h1 class="article-title text-center display-3">
      {{ article.title }}
    </h1>
    <cite class="col-md-6 px-0 d-inline-block small text-end">
      <template v-if="article.lang === 'en-US'">Article published on:</template>
      <template v-else>Artigo criado em:</template>
      {{ formatDate(article.createdAt, article.lang) }}
    </cite>

    <cite class="col-md-6 px-0 small text-start">
      <template v-if="article.lang === 'en-US'">|&nbsp;Last updated:</template>
      <template v-else>|&nbsp;Última atualização:</template>
      {{ formatDate(article.updatedAt, article.lang) }}
    </cite>

    <div class="socialShare d-flex justify-content-end align-items-center my-2">
      <b-button-group>
        <b-button variant="outline-secondary">
          <ShareNetwork network="email" :url="`${baseURL}${$nuxt.$route.path}`" :title="`${article.author.name} - ${article.title}`" :description="article.description" :hashtags="hashtags" class="text-capitalize"> <font-awesome-icon icon="envelope-open-text" /> E-mail </ShareNetwork>
        </b-button>
        <b-button variant="outline-secondary" v-for="social in socialShareList()" :key="social.index">
          <ShareNetwork :network="social.nameAccount.split('-')[0]" :url="`${baseURL}${$nuxt.$route.path}`" :title="`${article.author.name} - ${article.title}`" :description="article.description" :hashtags="hashtags" class="text-capitalize">
            <font-awesome-icon :icon="[social.iconPrefix, social.nameAccount.split('-')[0]]" />
            {{ social.nameAccount.split("-")[0] }}
          </ShareNetwork>
        </b-button>
      </b-button-group>
    </div>

    <p class="mt-2 mb-5 mx-0 border p-3">{{ article.description }}</p>

    <nav class="article-navbar font-weight-bold text-uppercase">
      <ul>
        <li v-for="link of article.toc" :key="link.id">
          <NuxtLink :to="`#${link.id}`" :class="{ 'py-2': link.depth === 2, 'ml-2 pb-2': link.depth === 3 }">
            {{ link.text }}
          </NuxtLink>
        </li>
      </ul>
    </nav>

    <img v-if="article.thumb" :src="`${cloudinaryImg(article.thumb)}.jpg`" :title="article.alt" class="article-image d-block mt-0 mx-auto mb-4" />

    <nuxt-content :document="article" class="mb-4" />

    <cite class="d-block text-end small font-weight-bold">
      <template v-if="article.lang === 'en-US'">Written by:</template>
      <template v-else>Escrito por:</template>
      {{ article.author.name }}
    </cite>

    <prev-next :prev="prev" :next="next" />
  </article>
</template>

<script>
import VideoPlayer from "nuxt-video-player";
import Vue from "vue";
import sortAnything from "@/pages/index";
import VueSocialSharing from "vue-social-sharing";

Vue.use(VueSocialSharing);

export default {
  head() {
    return {
      title: this.article.title,
      meta: [
        { hid: "description", name: "description", content: this.article.description },
        // Open Graph
        { hid: "og:title", property: "og:title", content: this.article.title },
        { hid: "og:description", property: "og:description", content: this.article.description },
        {
          hid: "og:image",
          property: "og:image",
          content: `https://res.cloudinary.com/marcelo-munhoz/image/upload/c_fill,f_auto,h_274,q_auto,w_524/marcelo-munhoz-website/${this.article.thumb}.jpg`,
        },
        // Twitter Card
        { hid: "twitter:title", name: "twitter:title", content: this.article.title },
        { hid: "twitter:description", name: "twitter:description", content: this.article.description },
      ],
    };
  },
  async asyncData({ $content, params }) {
    const article = await $content("articles", params.slug).fetch();

    const [prev, next] = await $content("articles").only(["title", "slug"]).sortBy("createdAt", "desc").where({ draft: false }).surround(params.slug).fetch();

    return {
      article,
      prev,
      next,
    };
  },
  data() {
    return {
      baseURL: null,
    };
  },
  mixins: [sortAnything],
  components: {
    VideoPlayer,
  },
  methods: {
    formatDate(date, language) {
      const options = {
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      date.charAt(date.length - 1) === "Z" ? (date = date.substring(0, date.length - 1)) : date; // Hack to remove Zulu UTC offset

      return new Date(date).toLocaleString(language, options);
    },
    cloudinaryImg(imgName) {
      return this.$cloudinary.image.url(`marcelo-munhoz-website/${imgName}`, { crop: "fill", height: 380, width: 1000 });
    },
    socialShareList() {
      return this.sortAnything(this.SocialNetwork, "nameAccount")
        .filter((social) => social.useItOn.includes("share"))
        .slice();
    },
  },
  computed: {
    hashtags() {
      return this.article.tags.join();
    },
  },
  mounted() {
    return (this.baseURL = document.location.origin);
  },
};
</script>

<style lang="scss">
@import "@/assets/scss/variables";

.btn-group {
  @media #{$small-screens} {
    display: flex;
    flex-flow: row wrap;
    gap: 0.5em;
    margin: 1em 0;

    .btn {
      border-radius: 0 !important;
      margin-left: 0 !important;
    }
  }
}

article {
  font-size: 1.2rem;

  h2 {
    font-size: 28px;
    font-weight: bold;
    margin-top: 2rem;
  }

  h3 {
    font-size: 22px;
    font-weight: bold;
    margin-top: 1rem;
  }

  p {
    margin-bottom: inherit;
  }

  a {
    text-decoration: none !important;

    &[class^="text-capitalize"] {
      color: hsl(0, 0%, 80%) !important;
    }

    &:not(.button-social):not([class^="text-capitalize"]) {
      box-shadow: inset 0 -2px 0 hsl(0, 0%, 80%);
      transition: box-shadow 0.3s ease-out, background-color 0.3s ease-out;
    }

    &:not([class^="text-capitalize"]):hover {
      background-color: hsl(0, 0%, 80%);
      color: hsl(0, 0%, 0%);
    }
  }

  .article-image {
    max-width: 1280px;
  }

  .article-navbar {
    ul {
      & > li {
        &::marker {
          content: "\22D5";
        }
      }
    }
  }

  .mb-5.mx-0.border {
    border-style: dashed !important;
  }

  .v-player {
    height: 0;
    overflow: hidden;
    padding-bottom: 56.25%;
    position: relative;

    .v-player__iframe {
      border: 0;
      height: 100%;
      left: 0;
      position: absolute;
      top: 0;
      width: 100%;
    }
  }
}
</style>
