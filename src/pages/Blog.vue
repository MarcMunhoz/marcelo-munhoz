<template>
  <q-page class="pt-4">
    <ul>
      <li v-for="article in articles" :key="article.id" class="text-lg">{{ article.fields.title }}</li>
    </ul>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { createClient } from "contentful";

const client = createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_DELIVERY,
  environment: "articles",
});

export default defineComponent({
  name: "BlogPage",
  created() {
    client
      .getEntries()
      .then((res) => {
        const articles = res.items;

        articles.forEach((e) => {
          if (e.sys.contentType.sys.id === "article") {
            this.articles.push(e);
          }
        });

        console.log(this.articles);
      })
      .catch((err) => console.log(err));
  },
  data() {
    return {
      articles: [],
    };
  },
});
</script>
