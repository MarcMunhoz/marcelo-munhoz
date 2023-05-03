<template>
  <q-page class="q-pa-md row items-start">
    <BlogIndex :data-articles="articles" />
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { createClient } from "contentful";
import BlogIndex from "../components/BlogIndex.vue";

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_DELIVERY,
  environment: "articles",
});

export default defineComponent({
  name: "BlogPage",
  created() {
    client
      .getEntries({ content_type: "article", order: "-fields.createAt" })
      .then((res) => {
        res.items.forEach((e) => {
          this.articles.push(e);
        });
      })
      .catch((err) => console.error(err));
  },
  data() {
    return {
      articles: [],
    };
  },
  components: {
    BlogIndex,
  },
});
</script>
