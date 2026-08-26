<template>
  <q-page class="q-pa-md row items-start">
    <q-circular-progress v-if="progress" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <article class="article-content w-full" :class="progress && 'hidden'">
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
        <ul class="article-tags">
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

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Marked } from "marked";
import { mangle } from "marked-mangle";
import { gfmHeadingId } from "marked-gfm-heading-id";
import { SEmail, SFacebook, SLinkedIn, STelegram, STwitter, SWhatsApp } from "vue-socials";
import { useMeta } from "quasar";
import { buildApiUrl } from "../utils/apiBase.js";
import { articleBylineLabels, articleLocaleFromArticle, articleNavigationLabels, isArticleLanguageTag, publicArticleDates } from "../utils/articleDates.js";
import { articleAuthorProfile } from "../utils/authorProfiles.js";
import {
  blogArticleLocation,
  blogReturnLocation,
  isCurrentArticleNavigationRequest,
  isCurrentArticleRouteRequest,
  validateBlogArticleNavigationPayload,
  validateBlogArticlePayload,
} from "../utils/blogArchive.js";
import { articleHeroImageUrl } from "../utils/contentfulImages.js";

const articleMarkdown = new Marked(mangle(), gfmHeadingId({ prefix: "marked-" }));
const route = useRoute();
const article = ref({});
const articleImg = ref("");
const articleAuthor = ref("");
const articleAuthorSlug = ref("");
const articleTags = ref([]);
const createAt = ref(null);
const articleLocale = ref("pt-BR");
const articleNavigation = ref({ previous: null, next: null });
const progress = ref(true);
let articleRequestId = 0;
let navigationRequestId = 0;

const archiveLocation = computed(() => blogReturnLocation(typeof window === "undefined" ? {} : window.history.state));
const getUrlToShare = computed(() => document.baseURI);
const navigationLabels = computed(() => articleNavigationLabels(articleLocale.value));
const bylineLabels = computed(() => articleBylineLabels(articleLocale.value, article.value));
const articleDates = computed(() =>
  publicArticleDates({
    createAt: article.value.createAt,
    updatedAt: article.value.updatedAt,
    fallbackCreatedAt: createAt.value,
    locale: articleLocale.value,
  })
);

useMeta(() => ({
  title: `Marcelo Munhoz - ${article.value.title}`,
  meta: {
    description: {
      name: "description",
      content: article.value.description,
    },
    ogType: {
      property: "og:type",
      content: "article",
    },
    ogUrl: {
      property: "og:url",
      content: getUrlToShare.value,
    },
    ogTitle: {
      property: "og:title",
      content: `Marcelo Munhoz - ${article.value.title}`,
    },
    ogDescription: {
      property: "og:description",
      content: article.value.description,
    },
    ogImage: {
      property: "og:image",
      content: articleImg.value,
    },
    twitterCard: {
      property: "twitter:card",
      content: "summary_large_image",
    },
    twitteUrl: {
      property: "twitter:url",
      content: getUrlToShare.value,
    },
    twitteTitle: {
      property: "twitter:title",
      content: `Marcelo Munhoz - ${article.value.title}`,
    },
    twitteDescription: {
      property: "twitter:description",
      content: article.value.description,
    },
    twitteImage: {
      property: "twitter:image",
      content: articleImg.value,
    },
  },
}));

const articleNeighborLocation = (neighbor) => blogArticleLocation(neighbor, archiveLocation.value);

const loadArticleNavigation = async (slug, requestedArticleRequestId) => {
  const requestId = ++navigationRequestId;

  try {
    const res = await fetch(buildApiUrl(`/api/contentful/article-navigation/${encodeURIComponent(slug)}`));
    if (!res.ok) {
      throw new Error(`Article navigation API returned ${res.status}`);
    }

    const navigation = validateBlogArticleNavigationPayload(await res.json());

    if (
      !isCurrentArticleNavigationRequest({
        requestId,
        currentRequestId: navigationRequestId,
        articleRequestId: requestedArticleRequestId,
        currentArticleRequestId: articleRequestId,
        requestedSlug: slug,
        currentSlug: route.params.slug,
      })
    ) {
      return;
    }

    articleNavigation.value = {
      previous: navigation.previous || null,
      next: navigation.next || null,
    };
  } catch (loadError) {
    if (requestId === navigationRequestId && requestedArticleRequestId === articleRequestId) {
      articleNavigation.value = { previous: null, next: null };
      console.error("Erro ao carregar navegação do artigo:", loadError);
    }
  }
};

const loadArticle = async (slug = route.params.slug) => {
  const requestedSlug = String(slug || "");
  const requestId = ++articleRequestId;
  navigationRequestId += 1;
  articleNavigation.value = { previous: null, next: null };
  progress.value = true;

  try {
    const res = await fetch(buildApiUrl(`/api/contentful/article/${encodeURIComponent(requestedSlug)}`));
    if (!res.ok) {
      throw new Error(`Blog API returned ${res.status}`);
    }

    const loadedArticle = await res.json();
    if (
      !isCurrentArticleRouteRequest({
        requestId,
        currentRequestId: articleRequestId,
        requestedSlug,
        currentSlug: route.params.slug,
      })
    ) {
      return;
    }

    validateBlogArticlePayload(loadedArticle);
    createAt.value = loadedArticle.sys.createdAt;
    article.value = loadedArticle.fields;
    articleLocale.value = articleLocaleFromArticle({ ...loadedArticle.fields, metadata: loadedArticle.metadata }, "pt-BR");
    const author = articleAuthorProfile(loadedArticle);
    articleAuthor.value = author.name;
    articleAuthorSlug.value = author.slug;
    articleImg.value = articleHeroImageUrl(loadedArticle.fields);

    const parsedArticleBody = articleMarkdown.parse(loadedArticle.fields.body);
    const linkToIframe = parsedArticleBody.replace(
      /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?(?:youtube\.com|youtu\.be|vimeo\.com).*?)\1[^>]*>(.*?)<\/a>/gi,
      `<div id="video-container" class="relative pb-[56.25%] h-0">
        <iframe src="$2" allowfullscreen class="absolute top-0 left-0 h-full w-full"></iframe>
      </div>`
    );

    document.querySelector(".rendered-text").innerHTML = linkToIframe;

    const hashtags = loadedArticle.metadata?.tags || [];
    articleTags.value = hashtags.map((tag) => tag.sys.id).filter((tag) => !isArticleLanguageTag(tag));

    const headerArticleName = document.querySelector(".header-title");
    if (headerArticleName) {
      headerArticleName.innerHTML = article.value.title;
    }

    document.title = `Marcelo Munhoz - ${article.value.title}`;
    progress.value = false;
    await loadArticleNavigation(requestedSlug, requestId);
  } catch (loadError) {
    if (requestId === articleRequestId) {
      console.error("Erro ao carregar artigo:", loadError);
    }
  }
};

onMounted(async () => {
  await loadArticle(route.params.slug);
});

watch(
  () => route.params.slug,
  (slug) => loadArticle(slug)
);

onBeforeUnmount(() => {
  articleRequestId += 1;
  navigationRequestId += 1;
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
  min-width: 0;
  overflow-wrap: anywhere;

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
    max-width: 100%;
    overflow-x: auto;
    padding: 1em;

    code {
      background-color: unset;
      color: initial;
      font-weight: normal;
      white-space: pre-wrap;
    }
  }

  img {
    height: auto;
    margin: 1em auto;
    max-width: 100%;
    object-fit: cover;
  }

  table {
    display: block;
    max-width: 100%;
    overflow-x: auto;
  }
}

.article-content,
.article-tags {
  min-width: 0;
}

.article-tags {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}

.article-tags li {
  max-width: 100%;
  overflow-wrap: anywhere;
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
