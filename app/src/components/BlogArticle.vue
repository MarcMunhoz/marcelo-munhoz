<template>
  <q-page class="q-pa-md row items-start">
    <q-circular-progress v-if="progress === true" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <article class="w-full" :class="progress && 'hidden'">
      <img v-if="articleImg" :src="articleImg" :title="article.title" class="max-h-[380px] w-full lg:w-[1000px] object-cover m-auto mt-5" />

      <div class="border-dashed border-2 border-blue-grey-3 p-4 my-[3em] font-bold text-lg">{{ article.description }}</div>
      <cite class="block not-italic">
        Por <strong>{{ articleAuthor }}</strong
        ><br />
        em {{ formatDate(article.createAt, "pt-br") }}
      </cite>

      <section class="flex justify-end">
        <q-btn flat color="blue-grey-5" icon="fa-solid fa-share" size="md">
          <q-menu transition-show="flip-right" transition-hide="flip-left" class="min-w-fit">
            <div class="social-share flex flex-row flex-nowrap gap-4 p-1 pt-1.5">
              <s-email :share-options="{ mail: '', subject: `Marcelo Munhoz - ${article.title}`, body: `${article.description}\n${getUrlToShare}` }">
                <i class="fa-solid fa-envelope-open text-[20px]"></i>
              </s-email>
              <s-facebook :share-options="{ url: getUrlToShare, hashtag: `#${articleTags[0]}` }" :window-features="{ width: '500', height: '600' }" :use-native-behavior="true">
                <i class="fa-brands fa-facebook text-[20px]"></i>
              </s-facebook>
              <s-linked-in :share-options="{ url: getUrlToShare }" :window-features="{ width: '500', height: '600' }" :use-native-behavior="true">
                <i class="fa-brands fa-linkedin-in text-[20px]"></i>
              </s-linked-in>
              <s-telegram :share-options="{ url: getUrlToShare, text: `${article.title} #${articleTags[0]}` }" :window-features="{ width: '700', height: '600' }" :use-native-behavior="true">
                <i class="fa-brands fa-telegram text-[20px]"></i>
              </s-telegram>
              <s-twitter :share-options="{ url: getUrlToShare, hashtags: articleTags, text: article.description }" :window-features="{ width: '500', height: '600' }">
                <i class="fa-brands fa-twitter text-[20px]"></i>
              </s-twitter>
              <s-whats-app :share-options="{ number: '', text: `${getUrlToShare} - ${article.title} #${articleTags[0]}` }" :window-features="{ width: '700', height: '600' }">
                <i class="fa-brands fa-whatsapp text-[20px]"></i>
              </s-whats-app>
            </div>
          </q-menu>
        </q-btn>
      </section>

      <div class="rendered-text"></div>

      <section class="my-4">
        <ul class="flex flex-row gap-4 justify-center">
          <li v-for="tag in articleTags" :key="tag.id" class="cursor-pointer bg-blue-grey-1 text-blue-grey-3 font-bold p-1">
            <router-link :to="{ name: 'Artigos Tags', params: { tag: tag } }">#{{ tag }}</router-link>
          </li>
        </ul>
      </section>
    </article>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import client from "../utils/contentful";
import { marked } from "marked";
import { mangle } from "marked-mangle";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { SEmail, SFacebook, SLinkedIn, STelegram, STwitter, SWhatsApp } from "vue-socials";
import { createMetaMixin } from "quasar";

export default defineComponent({
  name: "BlogArticle",
  data() {
    return {
      article: Array,
      createAt: Date,
      articleImg: URL,
      articleAuthor: String,
      articleTags: Array,
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
          // Open Graph / Facebook
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
          // Twitter
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
  mounted() {
    return this.asyncArticle();
  },
  methods: {
    async asyncArticle() {
      try {
        const article = await client.getEntries({
          content_type: "article",
          "fields.slug": this.$route.params.slug,
        });

        this.createAt = article.items[0].sys.createdAt;

        // Populates header with article title
        const articleTitle = article.items[0].fields.title;
        const headerArticleName = document.querySelector(".header-title");
        headerArticleName.innerHTML = articleTitle;
        document.title = `Marcelo Munhoz - ${articleTitle}`;

        // Gets the article main image if its exists
        article.items[0].fields.cloudinary ? (this.articleImg = article.items[0].fields.cloudinary[0].url.replace(/http/g, "https")) : (this.articleImg = "");

        // Seeks and replaces embed links by iframe
        const articleBodyDOM = document.querySelector(".rendered-text");
        const regexLinkVideo = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?(?:youtube\.com|youtu\.be|vimeo\.com).*?)\1[^>]*>(.*?)<\/a>/gi;

        marked.use(mangle());
        const gfmOptions = {
          prefix: "marked-",
        };
        marked.use(gfmHeadingId(gfmOptions));
        const parsedArticleBody = marked.parse(article.items[0].fields.body);

        const linkToIframe = parsedArticleBody.replace(regexLinkVideo, '<div id="video-container" class="relative pb-[56.25%] h-0"><iframe src="$2" allow="clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="allowfullscreen" id="video-iframe" class="absolute top-0 left-0 h-full w-full"></iframe></div>');
        articleBodyDOM.innerHTML = linkToIframe;

        // Populates the hashtags
        const hashtags = article.items[0].metadata.tags;
        this.articleTags = hashtags.map((a) => {
          return a.sys.id;
        });

        // Populates articles main array, update date and author
        return (this.article = article.items[0].fields), (this.articleAuthor = article.items[0].fields.author.fields.name), (this.progress = false);
      } catch (err) {
        console.error(err);
      }
    },
    formatDate(date, language) {
      const options = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      };

      // If there isn't custom createAt returns the raw date
      const finalCreateDate = date !== undefined ? date : this.createAt;

      return new Date(finalCreateDate).toLocaleString(language, options);
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
