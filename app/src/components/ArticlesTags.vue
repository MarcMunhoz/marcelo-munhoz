<template>
  <q-page class="q-pa-md row items-center">
    <q-circular-progress v-if="progress === true" indeterminate rounded size="50px" color="blue-grey-5" class="q-ma-md text-[10em] m-auto" />
    <section class="row gap-4 justify-center w-full" :class="progress && 'hidden'">
      <section class="tags w-full">
        <ul class="flex flex-row gap-4 justify-center max-h-[74px] overflow-y-auto overscroll-y-contain">
          <li class="cursor-pointer font-bold p-1 bg-blue-grey-1 text-blue-grey-3"><router-link :to="{ name: 'Meus Artigos' }">TUDO</router-link></li>
          <li
            v-for="tag in allTags"
            :key="tag.id"
            class="cursor-pointer font-bold p-1"
            :class="$route.params.tag === tag.sys.id ? 'bg-blue-grey-4 text-blue-grey-1' : 'bg-blue-grey-1 text-blue-grey-3'"
          >
            <router-link :to="{ name: 'Artigos Tags', params: { tag: tag.sys.id } }">#{{ tag.sys.id }}</router-link>
          </li>
        </ul>
      </section>

      <q-card class="w-[350px]" v-for="article in articlesTag" :key="article.id">
        <router-link :to="{ name: 'Artigo', params: { slug: article.fields.slug } }">
          <img v-if="article.fields.cloudinary" :src="`https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/${article.fields.cloudinary[0].public_id}`" />
          <img v-else src="https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/marcelo-munhoz-website/no-thumbnail.jpg" />

          <q-card-section>
            <div class="text-h6">{{ article.fields.title }}</div>
            <div class="text-subtitle2">by {{ article.fields.author.fields.name }}</div>
          </q-card-section>

          <q-card-section class="q-pt-none">{{ article.fields.description }}</q-card-section>
        </router-link>
      </q-card>
    </section>
    <q-pagination v-model="currentPage" :max="maxPages" @click="setData" direction-links flat color="blue-grey-3" active-color="blue-grey-5" class="w-full justify-center mt-6" />
  </q-page>
</template>

<script>
import { defineComponent, ref } from "vue";
import displayedArticles from "../pages/Blog.vue";
import calculatePagesCount from "../pages/Blog.vue";

export default defineComponent({
  name: "ArticlesTags",
  created() {
    const tag = this.$router.currentRoute.value.params.tag;

    if (tag) {
      this.currentTag = tag;
    } else {
      this.currentTag = null;
    }

    this.setTags();
    this.setData();
  },
  data() {
    return {
      articlesTag: Array,
      allTags: Array,
      currentTag: String,
      maxPages: 0,
      currentPage: ref(1),
      skipArticles: Number,
      progress: true,
    };
  },
  methods: {
    async setData() {
      this.progress = true;

      try {
        const res = await fetch(`/api/contentful/tagged?page=${this.currentPage}&tag=${this.currentTag}`);
        const data = await res.json();

        this.articlesTag = data.items;
        this.maxPages = this.calculatePagesCount(data.total);

        const headerTags = document.querySelector(".header-title");
        headerTags.innerHTML = `#${this.currentTag}`;
      } catch (err) {
        console.error("Erro ao carregar artigos com tag:", err);
      } finally {
        this.progress = false;
      }
    },

    async setTags() {
      try {
        const res = await fetch("/api/contentful/tags");
        const data = await res.json();
        this.allTags = data.items;
      } catch (err) {
        console.error("Erro ao carregar tags:", err);
      }
    },

    calculatePagesCount(totalCount) {
      const maxArticles = 3;
      return totalCount < maxArticles ? 1 : Math.ceil(totalCount / maxArticles);
    },

    displayedArticles() {
      return this.currentPage > 1 ? (this.skipArticles = 3 * this.currentPage - 3) : (this.skipArticles = 0);
    },
  },
});
</script>

<style lang="scss" scoped>
.tags ul {
  scrollbar-width: thin;
  scrollbar-color: $blue-grey-3 $blue-grey-1;
}

/* Chrome, Edge, and Safari */
*::-webkit-scrollbar {
  width: 15px;
}

*::-webkit-scrollbar-track {
  background: $blue-grey-1;
  border-radius: 5px;
}

*::-webkit-scrollbar-thumb {
  background-color: $blue-grey-3;
  border-radius: 14px;
  border: 3px solid $blue-grey-1;
}
</style>
