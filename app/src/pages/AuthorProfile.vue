<template>
  <q-page class="author-page">
    <q-circular-progress v-if="progress" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />

    <section v-else class="author-profile">
      <header class="author-header">
        <div class="author-photo">
          <img v-if="author.photoUrl" :src="author.photoUrl" :alt="`${author.name} profile photo`" />
          <span v-else>{{ authorInitials }}</span>
        </div>
        <div>
          <p class="author-kicker">Author</p>
          <h1>{{ author.name }}</h1>
          <p v-if="author.biography">{{ author.biography }}</p>
        </div>
      </header>

      <section class="author-articles">
        <h2>Articles</h2>
        <p v-if="articles.length === 0" class="empty-state">No published articles found for this author.</p>
        <div class="article-grid">
          <q-card v-for="article in articles" :key="article.sys.id" flat bordered class="article-card">
            <router-link :to="{ name: 'Artigo', params: { slug: article.fields.slug } }">
              <img :src="articleCardImageUrl(article.fields)" :alt="article.fields.alt || article.fields.title" />
              <q-card-section>
                <h3>{{ article.fields.title }}</h3>
                <p>{{ article.fields.description }}</p>
              </q-card-section>
            </router-link>
          </q-card>
        </div>
      </section>
    </section>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { createMetaMixin } from "quasar";
import { buildApiUrl } from "../utils/apiBase.js";
import { publicAuthorProfile } from "../utils/authorProfiles.js";
import { articleCardImageUrl } from "../utils/contentfulImages.js";

export default defineComponent({
  name: "AuthorProfile",
  data() {
    return {
      author: publicAuthorProfile(),
      articles: [],
      progress: true,
    };
  },
  mixins: [
    createMetaMixin(function () {
      return {
        title: `Marcelo Munhoz - ${this.author.name || "Author"}`,
        meta: {
          description: {
            name: "description",
            content: this.author.biography || `Articles by ${this.author.name}`,
          },
        },
      };
    }),
  ],
  computed: {
    authorInitials() {
      return String(this.author.name || "Author")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    },
  },
  async mounted() {
    await this.loadAuthor();
  },
  methods: {
    articleCardImageUrl,
    async loadAuthor() {
      this.progress = true;

      try {
        const response = await fetch(buildApiUrl(`/api/contentful/author/${this.$route.params.slug}`));

        if (!response.ok) {
          throw new Error(`Author API returned ${response.status}`);
        }

        const payload = await response.json();
        this.author = publicAuthorProfile(payload.author);
        this.articles = payload.articles || [];
      } catch (error) {
        console.error("Erro ao carregar autor:", error);
        this.author = publicAuthorProfile();
        this.articles = [];
      } finally {
        this.progress = false;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.author-page {
  background: #f7f9f8;
  min-height: inherit;
  padding: 24px;
}

.author-profile {
  margin: 0 auto;
  max-width: 980px;
}

.author-header {
  align-items: center;
  background: #ffffff;
  border: 1px solid #d8e1e5;
  display: grid;
  gap: 20px;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 22px;

  h1 {
    font-size: 2rem;
    line-height: 1.15;
    margin: 0;
  }

  p:not(.author-kicker) {
    color: #455a64;
    font-size: 1rem;
    line-height: 1.45;
    margin: 10px 0 0;
  }
}

.author-kicker {
  color: #607d8b;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.author-photo {
  align-items: center;
  background: #455a64;
  border-radius: 50%;
  color: #ffffff;
  display: flex;
  font-size: 1.4rem;
  font-weight: 700;
  height: 96px;
  justify-content: center;
  overflow: hidden;
  width: 96px;

  img {
    height: 100%;
    object-fit: cover;
    width: 100%;
  }
}

.author-articles {
  margin-top: 22px;

  h2 {
    font-size: 1.4rem;
    margin: 0 0 14px;
  }
}

.article-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.article-card {
  overflow: hidden;

  a {
    color: inherit;
    text-decoration: none;
  }

  img {
    aspect-ratio: 16 / 9;
    object-fit: cover;
    width: 100%;
  }

  h3 {
    font-size: 1rem;
    margin: 0 0 6px;
  }

  p {
    color: #607d8b;
    margin: 0;
  }
}

.empty-state {
  color: #607d8b;
}

@media (max-width: 640px) {
  .author-header {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
