<template>
  <div class="container-fluid mt-4 px-4">
    <h1 class="text-center">Blog - Página {{ pageNo }}</h1>
    <ul class="list-unstyled">
      <li v-for="post of posts" :key="post.slug" class="mt-5">
        <NuxtLink
          :to="{ name: 'blog-slug', params: { slug: post.slug } }"
          class="text-info text-decoration-none"
        >
          <img
            v-if="post.thumb"
            :src="require(`@/assets/images/${post.thumb}`)"
          />
          <div>
            <h2>{{ post.title }}</h2>
            <cite class="small">by {{ post.author.name }}</cite>
            <p>{{ post.description }}</p>
          </div>
        </NuxtLink>
      </li>
    </ul>

    <section
      class="next-prev d-flex flex-row flex-wrap align-items-center justify-content-around border-top border-info mt-5 pt-4 text-uppercase font-weight-bold"
    >
      <nuxt-link class="text-decoration-none" :to="prevLink"
        >Página anterior [ {{ pageNo - 1 }} ]</nuxt-link
      >
      <nuxt-link
        class="text-decoration-none"
        v-if="nextPage"
        :to="`/blog/page/${pageNo + 1}`"
        >Próxima página [ {{ pageNo + 1 }} ]</nuxt-link
      >
    </section>
  </div>
</template>

<script>
export default {
  async asyncData({ $content, params, error }) {
    const pageNo = parseInt(params.number);
    const articles = await $content("articles")
      .only(["title", "description", "img", "slug", "author"])
      .sortBy("createdAt", "desc")
      .where({ draft: false })
      .limit(5)
      .skip(4 * (pageNo - 1))
      .fetch();

    if (!articles.length) {
      return error({ statusCode: 404, message: "No posts found!" });
    }

    const nextPage = articles.length === 5;
    const posts = nextPage ? articles.slice(0, -1) : articles;
    return { nextPage, posts, pageNo };
  },
  computed: {
    prevLink() {
      return this.pageNo === 2 ? "/blog/" : `/blog/page/${this.pageNo - 1}`;
    }
  }
};
</script>
