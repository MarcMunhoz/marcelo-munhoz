<template>
  <div class="author">
    <NuxtLink
      :to="`/blog/author/${author.name}`"
      class="d-flex flex-row flex-wrap justify-content-center"
    >
      <img
        v-if="author.image"
        :src="author.image"
        class="rounded-circle mr-4"
      />
      <div>
        <h4>Author</h4>
        <p>{{ author.name }}</p>
        <p>{{ bioMaxLength() }}</p>
      </div>
    </NuxtLink>
  </div>
</template>

<script>
export default {
  props: {
    author: {
      type: Object,
      required: true
    }
  },
  methods: {
    bioMaxLength() {
      const rawBio = this.author.bio;

      if (rawBio.length > 10) {
        return rawBio.substring(0, 10) + "...";
      } else {
        return rawBio;
      }
    }
  }
};
</script>
