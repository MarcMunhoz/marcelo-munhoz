<template>
  <div class="m-auto">
    <section class="flex gap-4 justify-center">
      <q-card class="w-[350px]" v-for="article in dataArticles" :key="article.id">
        <img v-if="article.fields.cloudinary" :src="`https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/${article.fields.cloudinary[0].public_id}`" />
        <img v-else src="https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,w_350,h_233,c_fill/marcelo-munhoz-website/no-thumbnail.jpg" />

        <q-card-section>
          <div class="text-h6">{{ article.fields.title }}</div>
          <div class="text-subtitle2">by {{ article.fields.author.fields.name }}</div>
        </q-card-section>

        <q-card-section class="q-pt-none">{{ article.fields.description }}</q-card-section>
      </q-card>
    </section>

    <q-pagination v-model="current" max="5" direction-links flat color="grey" active-color="primary" class="justify-center mt-5" />

    <p>HELLO {{ totalArticles }}</p>
  </div>
</template>

<script>
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "BlogIndex",
  props: {
    dataArticles: {
      type: Array,
    },
    totalArticles: {
      type: Number,
    },
  },
  data() {
    return {
      current: ref(1),
    };
  },
});
</script>
