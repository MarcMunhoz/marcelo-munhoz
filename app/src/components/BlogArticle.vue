<template>
  <q-page class="q-pa-md row items-start">
    <q-circular-progress v-if="progress" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <article class="w-full" :class="progress && 'hidden'">
      <img v-if="articleImg" :src="articleImg" :title="article.title" class="max-h-[380px] w-full lg:w-[1000px] object-cover m-auto mt-5" />

      <div class="border-dashed border-2 border-blue-grey-3 p-4 my-[3em] font-bold text-lg">
        {{ article.description }}
      </div>
      <cite class="block not-italic">
        Por <strong>{{ articleAuthor }}</strong
        ><br />
        em {{ formatDate(article.createAt, "pt-br") }}
      </cite>

      <section class="flex justify-end">
        <q-btn flat color="blue-grey-5" icon="fa-solid fa-share" size="md">
          <q-menu transition-show="flip-right" transition-hide="flip-left" class="min-w-fit">
            <div class="social-share flex flex-row flex-nowrap gap-4 p-1 pt-1.5">
              <s-email
                :share-options="{
                  mail: '',
                  subject: `Marcelo Munhoz - ${article.title}`,
                  body: `${article.description}\n${getUrlToShare}`,
                }"
              >
                <i class="fa-solid fa-envelope-open text-[20px]"></i>
              </s-email>
              <s-facebook
                :share-options="{
                  url: getUrlToShare,
                  hashtag: `#${articleTags[0]}`,
                }"
                :window-features="{ width: '500', height: '600' }"
                :use-native-behavior="true"
              >
                <i class="fa-brands fa-facebook text-[20px]"></i>
              </s-facebook>
              <s-linked-in :share-options="{ url: getUrlToShare }" :window-features="{ width: '500', height: '600' }" :use-native-behavior="true">
                <i class="fa-brands fa-linkedin-in text-[20px]"></i>
              </s-linked-in>
              <s-telegram
                :share-options="{
                  url: getUrlToShare,
                  text: `${article.title} #${articleTags[0]}`,
                }"
                :window-features="{ width: '700', height: '600' }"
                :use-native-behavior="true"
              >
                <i class="fa-brands fa-telegram text-[20px]"></i>
              </s-telegram>
              <s-twitter
                :share-options="{
                  url: getUrlToShare,
                  hashtags: articleTags,
                  text: article.description,
                }"
                :window-features="{ width: '500', height: '600' }"
              >
                <i class="fa-brands fa-twitter text-[20px]"></i>
              </s-twitter>
              <s-whats-app
                :share-options="{
                  number: '',
                  text: `${getUrlToShare} - ${article.title} #${articleTags[0]}`,
                }"
                :window-features="{ width: '700', height: '600' }"
              >
                <i class="fa-brands fa-whatsapp text-[20px]"></i>
              </s-whats-app>
            </div>
          </q-menu>
        </q-btn>
      </section>

      <div class="rendered-text"></div>

      <section class="my-4">
        <ul class="flex flex-row gap-4 justify-center">
          <li v-for="tag in articleTags" :key="tag" class="cursor-pointer bg-blue-grey-1 text-blue-grey-3 font-bold p-1">
            <router-link :to="{ name: 'Artigos Tags', params: { tag: tag } }">#{{ tag }}</router-link>
          </li>
        </ul>
      </section>
    </article>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { marked } from "marked";
import { mangle } from "marked-mangle";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { SEmail, SFacebook, SLinkedIn, STelegram, STwitter, SWhatsApp } from "vue-socials";
import { createMetaMixin } from "quasar";

export default defineComponent({
  name: "BlogArticle",
  data() {
    return {
      article: {},
      articleImg: "",
      articleAuthor: "",
      articleTags: [],
      createAt: null,
      progress: true,
    };
  },
  components: {
    SEmail,
    SFacebook,
    SLinkedIn,
    STelegram,
    STwitter,
    SWhatsApp,
  },
  mixins: [
    createMetaMixin(function () {
      return {
        title: `Marcelo Munhoz - ${this.article.title}`,
        meta: {
          description: {
            name: "description",
            content: this.article.description,
          },
          ogType: {
            property: "og:type",
            content: "article",
          },
          ogUrl: {
            property: "og:url",
            content: this.getUrlToShare,
          },
          ogTitle: {
            property: "og:title",
            content: `Marcelo Munhoz - ${this.article.title}`,
          },
          ogDescription: {
            property: "og:description",
            content: this.article.description,
          },
          ogImage: {
            property: "og:image",
            content: this.articleImg,
          },
          twitterCard: {
            property: "twitter:card",
            content: "summary_large_image",
          },
          twitteUrl: {
            property: "twitter:url",
            content: this.getUrlToShare,
          },
          twitteTitle: {
            property: "twitter:title",
            content: `Marcelo Munhoz - ${this.article.title}`,
          },
          twitteDescription: {
            property: "twitter:description",
            content: this.article.description,
          },
          twitteImage: {
            property: "twitter:image",
            content: this.articleImg,
          },
        },
      };
    }),
  ],
  async mounted() {
    await this.loadArticle();
  },
  methods: {
    async loadArticle() {
      try {
        const res = await fetch(`/api/contentful/article/${this.$route.params.slug}`);
        const article = await res.json();

        this.createAt = article.sys.createdAt;
        this.article = article.fields;
        this.articleAuthor = article.fields.author.fields.name;
        this.articleImg = article.fields.cloudinary ? article.fields.cloudinary[0].url.replace("http://", "https://") : "";

        const rawBody = article.fields.body;

        marked.use(mangle());
        marked.use(gfmHeadingId({ prefix: "marked-" }));

        const parsedArticleBody = marked.parse(rawBody);

        const linkToIframe = parsedArticleBody.replace(
          /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?(?:youtube\.com|youtu\.be|vimeo\.com).*?)\1[^>]*>(.*?)<\/a>/gi,
          `<div id="video-container" class="relative pb-[56.25%] h-0">
            <iframe src="$2" allowfullscreen class="absolute top-0 left-0 h-full w-full"></iframe>
          </div>`
        );

        document.querySelector(".rendered-text").innerHTML = linkToIframe;

        const hashtags = article.metadata?.tags || [];
        this.articleTags = hashtags.map((tag) => tag.sys.id);

        const headerArticleName = document.querySelector(".header-title");
        if (headerArticleName) {
          headerArticleName.innerHTML = this.article.title;
        }

        document.title = `Marcelo Munhoz - ${this.article.title}`;
        this.progress = false;
      } catch (err) {
        console.error("Erro ao carregar artigo:", err);
      }
    },
    formatDate(date, language) {
      const finalDate = date || this.createAt;
      return new Date(finalDate).toLocaleDateString(language, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    },
  },
  computed: {
    getUrlToShare() {
      return document.baseURI;
    },
  },
});
</script>

<style lang="scss" scoped>
@mixin headings {
  :deep(.rendered-text) {
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      @content;
    }
  }
}

@include headings {
  font-weight: 700;
  margin: 1em 0;
}

.social-share {
  a {
    color: $blue-grey-5;

    &:hover {
      color: $blue-grey-3;
    }
  }
}

:deep(.rendered-text) {
  font-size: 1.3em;
  font-weight: 300;

  h1 {
    font-size: 2em;
  }

  h2 {
    font-size: 1.7em;
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
    background-color: $blue-grey-1;
    color: $blue-grey-5;
  }

  pre {
    background-color: $grey-3;
    padding: 1em;

    code {
      background-color: unset;
      color: initial;
      font-weight: normal;
      white-space: pre-wrap;
    }
  }

  img {
    margin: 1em auto;
    object-fit: cover;
  }
}
</style>
