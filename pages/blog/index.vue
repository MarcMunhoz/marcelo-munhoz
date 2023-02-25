<template>
  <div class="container-fluid mt-4 px-4">
    <h1 class="text-center">Blog</h1>
    <ul class="list-unstyled">
      <li v-for="post of posts" :key="post.slug" class="mt-5 border p-4">
        <NuxtLink :to="{ name: 'blog-slug', params: { slug: post.slug } }" class="text-secondary text-decoration-none">
          <div>
            <h2>{{ post.title }}</h2>
            <cite class="small">
              <template v-if="post.lang === 'en-US'">by</template>
              <template v-else>por</template>
              {{ post.author.name }}
            </cite>
            <p class="mb-0">{{ post.description }}</p>
          </div>
        </NuxtLink>
      </li>
    </ul>

    <section class="next-prev d-flex flex-row flex-wrap align-items-center justify-content-around border-top border-info mt-5 pt-4 text-uppercase font-weight-bold" v-if="nextPage">
      <nuxt-link class="text-decoration-none" to="/blog/page/2"> Próxima página [ 2 ] </nuxt-link>
    </section>
  </div>
</template>

<script>
export default {
  layout: "default",
  async asyncData({ $content, params }) {
    const articles = await $content("articles").only(["title", "description", "slug", "lang", "author"]).sortBy("createdAt", "desc").where({ draft: false }).limit(5).fetch();

    const nextPage = articles.length === 5;
    const posts = nextPage ? articles.slice(0, -1) : articles;

    return {
      nextPage,
      posts,
    };
  },
  methods: {
    cloudinaryImg: function (imgName) {
      return this.$cloudinary.image.url(`marcelo-munhoz-website/${imgName}`, { crop: "fill", height: 300, width: 900 });
    },
  },
};
</script>

<style lang="scss" scoped>
.border {
  border-style: dashed !important;
}
</style>
