<template>
  <q-page class="q-pa-md row items-start">
    <q-circular-progress v-if="progress === true" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <article class="w-full" :class="progress && 'hidden'">
      <img v-if="articleImg" :src="articleImg" :title="article.title" class="max-h-[380px] w-full lg:w-[1000px] object-cover m-auto mt-5" />

      <div class="border-dashed border-2 border-blue-grey-3 p-4 my-[3em] font-bold text-lg">{{ article.description }}</div>

      <cite class="block">Por {{ articleAuthor }}<br />em {{ formatDate(article.createAt, "pt-br") }}</cite>

      <section class="flex justify-end">
        <q-btn color="blue-grey-5" icon="fa-solid fa-share">
          <q-menu transition-show="flip-right" transition-hide="flip-left" class="min-w-fit">
            <div class="social-share flex flex-row flex-nowrap content-center gap-3 p-1">
              <s-email :share-options="{ mail: '', subject: `Marcelo Munhoz - ${article.title}`, body: `${article.description}\n${$route.fullPath}` }">
                <i class="fa-solid fa-envelope-open text-[30px]"></i>
              </s-email>
              <s-facebook :share-options="{ url: $route.fullPath, hashtag: `#${articleTags[0]}` }" :window-features="{ width: '500', height: '600' }">
                <i class="fa-brands fa-facebook text-[30px]"></i>
              </s-facebook>
              <s-linked-in :share-options="{ url: $route.fullPath }" :window-features="{ width: '500', height: '600' }">
                <i class="fa-brands fa-linkedin-in text-[30px]"></i>
              </s-linked-in>
              <s-telegram :share-options="{ url: $route.fullPath, text: `${article.title} #${articleTags[0]}` }" :window-features="{ width: '700', height: '600' }">
                <i class="fa-brands fa-telegram text-[30px]"></i>
              </s-telegram>
              <s-twitter :share-options="{ url: $route.fullPath, hashtags: articleTags, text: article.description }" :window-features="{ width: '500', height: '600' }">
                <i class="fa-brands fa-twitter text-[30px]"></i>
              </s-twitter>
              <s-whats-app :share-options="{ number: '', text: `${$route.fullPath} - ${article.title} #${articleTags[0]}` }" :window-features="{ width: '700', height: '600' }">
                <i class="fa-brands fa-whatsapp text-[30px]"></i>
              </s-whats-app>
            </div>
          </q-menu>
        </q-btn>
      </section>

      <div class="rendered-text"></div>

      <section class="my-4">
        <ul class="flex flex-row gap-4 justify-center">
          <li v-for="tag in articleTags" :key="tag.id" class="bg-blue-grey-1 text-blue-grey-3 font-bold p-1">#{{ tag }}</li>
        </ul>
      </section>
    </article>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import client from "../plugins/contentful";
import { marked } from "marked";
import { SEmail, SFacebook, SLinkedIn, STelegram, STwitter, SWhatsApp } from "vue-socials";

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
      articleAuthor: {
        type: String,
      },
      articleTags: {
        type: Array,
      },
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

        // Populates the hashtags
        const hashtags = article.items[0].metadata.tags;
        this.articleTags = hashtags.map((a) => {
          return a.sys.id;
        });

        // Populates articles main array, update date and author
        return (this.article = article.items[0].fields), (this.articleAuthor = article.items[0].fields.author.fields.name), (this.progress = false);
      } catch (err) {
        const error = Object.getOwnPropertyDescriptors(err)
          .message.value.split("\n")[3]
          .replace(/['",]+/g, "");
        console.error(`${error} ¯\\_(ツ)_/¯`);
      }
    },
    formatDate(date, language) {
      const options = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      };

      return new Date(date).toLocaleString(language, options);
    },
  },
});
</script>

<style lang="scss" scoped>
@mixin headings {
  .rendered-text:deep {
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
  &:deep {
    a {
      color: $blue-grey-5;

      &:hover {
        color: $blue-grey-3;
      }
    }
  }
}

.rendered-text {
  &:deep {
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
      }
    }

    img {
      margin: 1em auto;
      object-fit: cover;
    }
  }
}
</style>
