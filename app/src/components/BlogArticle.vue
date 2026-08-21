<template>
  <q-page class="q-pa-md row items-start">
    <q-circular-progress v-if="progress" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <article class="w-full" :class="progress && 'hidden'">
      <router-link :to="archiveLocation" class="article-return">
        <q-icon name="fa-solid fa-arrow-left" aria-hidden="true" />
        <span>{{ navigationLabels.all }}</span>
      </router-link>

      <img v-if="articleImg" :src="articleImg" :title="article.title" :alt="article.alt || article.title" class="max-h-[380px] w-full lg:w-[1000px] object-cover m-auto mt-5" />

      <div class="border-dashed border-2 border-blue-grey-3 p-4 my-[3em] font-bold text-lg">
        {{ article.description }}
      </div>
      <cite class="block not-italic">
        {{ bylineLabels.by }}
        <router-link v-if="articleAuthorSlug" :to="{ name: 'Author', params: { slug: articleAuthorSlug } }" class="author-link">
          <strong>{{ articleAuthor }}</strong>
        </router-link>
        <strong v-else>{{ articleAuthor }}</strong>
        <br />
        {{ bylineLabels.on }} {{ articleDates.created }}
        <template v-if="articleDates.updated">
          <br />
          {{ bylineLabels.updated }} {{ articleDates.updated }}
        </template>
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
            <router-link :to="{ name: 'Meus Artigos', query: { tag } }">#{{ tag }}</router-link>
          </li>
        </ul>
      </section>

      <nav
        v-if="articleNavigation.previous || articleNavigation.next"
        class="article-navigation"
        :aria-label="`${navigationLabels.previous} / ${navigationLabels.next}`"
      >
        <router-link
          v-if="articleNavigation.previous"
          :to="articleNeighborLocation(articleNavigation.previous)"
          class="article-neighbor article-neighbor--previous"
        >
          <span class="article-neighbor__label">{{ navigationLabels.previous }}</span>
          <strong>{{ articleNavigation.previous.title }}</strong>
        </router-link>
        <router-link
          v-if="articleNavigation.next"
          :to="articleNeighborLocation(articleNavigation.next)"
          class="article-neighbor article-neighbor--next"
        >
          <span class="article-neighbor__label">{{ navigationLabels.next }}</span>
          <strong>{{ articleNavigation.next.title }}</strong>
        </router-link>
      </nav>
    </article>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { Marked } from "marked";
import { mangle } from "marked-mangle";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { SEmail, SFacebook, SLinkedIn, STelegram, STwitter, SWhatsApp } from "vue-socials";
import { createMetaMixin } from "quasar";
import { buildApiUrl } from "../utils/apiBase.js";
import { articleBylineLabels, articleLocaleFromArticle, articleNavigationLabels, isArticleLanguageTag, publicArticleDates } from "../utils/articleDates.js";
import { articleAuthorProfile } from "../utils/authorProfiles.js";
import { blogArticleLocation, blogReturnLocation } from "../utils/blogArchive.js";
import { articleHeroImageUrl } from "../utils/contentfulImages.js";

const articleMarkdown = new Marked(mangle(), gfmHeadingId({ prefix: "marked-" }));

const nonEmptyString = (value) => typeof value === "string" && Boolean(value.trim());

const isRenderableArticlePayload = (article) => {
  if (!article || typeof article !== "object" || Array.isArray(article)) {
    return false;
  }

  const { fields, metadata, sys } = article;
  const authorName = fields?.author?.fields?.name || fields?.author?.name;
  const tags = metadata?.tags;

  return (
    sys &&
    typeof sys === "object" &&
    nonEmptyString(sys.createdAt) &&
    fields &&
    typeof fields === "object" &&
    !Array.isArray(fields) &&
    nonEmptyString(fields.title) &&
    nonEmptyString(fields.slug) &&
    typeof fields.description === "string" &&
    nonEmptyString(fields.body) &&
    nonEmptyString(authorName) &&
    metadata &&
    typeof metadata === "object" &&
    Array.isArray(tags) &&
    tags.every((tag) => nonEmptyString(tag?.sys?.id)) &&
    (fields.locale === undefined || typeof fields.locale === "string") &&
    (fields.createAt === undefined || typeof fields.createAt === "string") &&
    (fields.updatedAt === undefined || typeof fields.updatedAt === "string") &&
    (fields.alt === undefined || typeof fields.alt === "string")
  );
};

export default defineComponent({
  name: "BlogArticle",
  data() {
    return {
      article: {},
      articleImg: "",
      articleAuthor: "",
      articleAuthorSlug: "",
      articleTags: [],
      createAt: null,
      articleLocale: "pt-BR",
      articleNavigation: { previous: null, next: null },
      articleRequestId: 0,
      navigationRequestId: 0,
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
    await this.loadArticle(this.$route.params.slug);
  },
  watch: {
    "$route.params.slug"(slug) {
      this.loadArticle(slug);
    },
  },
  methods: {
    articleNeighborLocation(neighbor) {
      return blogArticleLocation(neighbor, this.archiveLocation);
    },
    async loadArticle(slug = this.$route.params.slug) {
      const requestedSlug = String(slug || "");
      const requestId = ++this.articleRequestId;
      this.navigationRequestId += 1;
      this.articleNavigation = { previous: null, next: null };
      this.progress = true;

      try {
        const res = await fetch(buildApiUrl(`/api/contentful/article/${encodeURIComponent(requestedSlug)}`));
        if (!res.ok) {
          throw new Error(`Blog API returned ${res.status}`);
        }

        const article = await res.json();
        if (requestId !== this.articleRequestId || requestedSlug !== String(this.$route.params.slug || "")) {
          return;
        }
        if (!isRenderableArticlePayload(article)) {
          throw new Error("Blog API returned an invalid article payload");
        }

        this.createAt = article.sys.createdAt;
        this.article = article.fields;
        this.articleLocale = articleLocaleFromArticle({ ...article.fields, metadata: article.metadata }, "pt-BR");
        const author = articleAuthorProfile(article);
        this.articleAuthor = author.name;
        this.articleAuthorSlug = author.slug;
        this.articleImg = articleHeroImageUrl(article.fields);

        const rawBody = article.fields.body;

        const parsedArticleBody = articleMarkdown.parse(rawBody);

        const linkToIframe = parsedArticleBody.replace(
          /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?(?:youtube\.com|youtu\.be|vimeo\.com).*?)\1[^>]*>(.*?)<\/a>/gi,
          `<div id="video-container" class="relative pb-[56.25%] h-0">
            <iframe src="$2" allowfullscreen class="absolute top-0 left-0 h-full w-full"></iframe>
          </div>`
        );

        document.querySelector(".rendered-text").innerHTML = linkToIframe;

        const hashtags = article.metadata?.tags || [];
        this.articleTags = hashtags.map((tag) => tag.sys.id).filter((tag) => !isArticleLanguageTag(tag));

        const headerArticleName = document.querySelector(".header-title");
        if (headerArticleName) {
          headerArticleName.innerHTML = this.article.title;
        }

        document.title = `Marcelo Munhoz - ${this.article.title}`;
        this.progress = false;
        await this.loadArticleNavigation(requestedSlug, requestId);
      } catch (err) {
        if (requestId === this.articleRequestId) {
          console.error("Erro ao carregar artigo:", err);
        }
      }
    },
    async loadArticleNavigation(slug, articleRequestId) {
      const requestId = ++this.navigationRequestId;

      try {
        const res = await fetch(buildApiUrl(`/api/contentful/article-navigation/${encodeURIComponent(slug)}`));
        if (!res.ok) {
          throw new Error(`Article navigation API returned ${res.status}`);
        }

        const navigation = await res.json();
        const isNavigationLink = (value) =>
          value === null ||
          (value && typeof value === "object" && typeof value.title === "string" && value.title.trim() && typeof value.slug === "string" && value.slug.trim());
        if (!navigation || typeof navigation !== "object" || !isNavigationLink(navigation.previous) || !isNavigationLink(navigation.next)) {
          throw new Error("Article navigation API returned an invalid payload");
        }

        if (
          requestId !== this.navigationRequestId ||
          articleRequestId !== this.articleRequestId ||
          slug !== String(this.$route.params.slug || "")
        ) {
          return;
        }

        this.articleNavigation = {
          previous: navigation.previous || null,
          next: navigation.next || null,
        };
      } catch (err) {
        if (requestId === this.navigationRequestId && articleRequestId === this.articleRequestId) {
          this.articleNavigation = { previous: null, next: null };
          console.error("Erro ao carregar navegação do artigo:", err);
        }
      }
    },
  },
  computed: {
    archiveLocation() {
      return blogReturnLocation(typeof window === "undefined" ? {} : window.history.state);
    },
    getUrlToShare() {
      return document.baseURI;
    },
    navigationLabels() {
      return articleNavigationLabels(this.articleLocale);
    },
    bylineLabels() {
      return articleBylineLabels(this.articleLocale, this.article);
    },
    articleDates() {
      return publicArticleDates({
        createAt: this.article.createAt,
        updatedAt: this.article.updatedAt,
        fallbackCreatedAt: this.createAt,
        locale: this.articleLocale,
      });
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

.author-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.article-return,
.article-neighbor {
  color: $blue-grey-5;
  outline: 2px solid transparent;
  outline-offset: 3px;
  text-decoration: none;
}

.article-return {
  align-items: center;
  display: inline-flex;
  font-weight: 700;
  gap: 0.5rem;
}

.article-return:focus-visible,
.article-neighbor:focus-visible {
  outline-color: currentColor;
}

.article-navigation {
  display: flex;
  gap: 2rem;
  justify-content: space-between;
  margin: 3rem 0 1rem;
}

.article-neighbor {
  align-items: flex-start;
  display: flex;
  flex: 1 1 18rem;
  flex-direction: column;
  min-width: 0;

  strong {
    overflow-wrap: anywhere;
  }
}

.article-neighbor--next {
  align-items: flex-end;
  margin-left: auto;
  text-align: right;
}

.article-neighbor__label {
  font-size: 0.875rem;
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

@media (max-width: 700px) {
  .article-navigation {
    flex-direction: column;
    gap: 1.5rem;
  }

  .article-neighbor {
    flex-basis: auto;
    width: 100%;
  }
}
</style>
