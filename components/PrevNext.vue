<template>
  <div
    class="next-prev d-flex flex-row flex-wrap align-items-center justify-content-around border-top border-info mt-5 pt-4 text-uppercase font-weight-bold"
  >
    <NuxtLink
      v-if="prev"
      :to="{ name: 'blog-slug', params: { slug: prev.slug } }"
      class="font-bold hover:underline"
    >
      &#8617; {{ prev.title }}
    </NuxtLink>
    <NuxtLink
      v-if="next"
      :to="{ name: 'blog-slug', params: { slug: next.slug } }"
      class="font-bold hover:underline"
    >
      {{ next.title }} &#8618;
    </NuxtLink>
  </div>
</template>

<script>
export default {
  props: {
    prev: {
      type: Object,
      default: () => null
    },
    next: {
      type: Object,
      default: () => null
    }
  }
};
</script>
