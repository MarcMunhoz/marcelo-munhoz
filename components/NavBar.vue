<template>
  <nav class="navbar navbar-expand-lg px-5 navbar-light bg-light">
    <nuxt-link class="navbar-brand" to="/" v-on:click.native="active = false">Marcelo Munhoz</nuxt-link>
    <button
      class="navbar-toggler"
      type="button"
      data-toggle="collapse"
      data-target="#navbarNav"
      aria-controls="navbarNav"
      aria-expanded="false"
      aria-label="Toggle navigation"
      :aria-pressed="active ? 'true' : 'false'"
      @click="active = !active"
    >
      <span class="navbar-toggler-icon"></span>
    </button>
    <div :class="{ show: active }" class="collapse navbar-collapse justify-content-end" id="navbarNav">
      <ul class="navbar-nav ml-auto">
        <li class="nav-item">
          <nuxt-link class="nav-link" to="/about" :aria-pressed="active ? 'true' : 'false'" v-on:click.native="active = !active">About</nuxt-link>
        </li>
        <li class="nav-item">
          <nuxt-link class="nav-link" to="/blog" :aria-pressed="active ? 'true' : 'false'" v-on:click.native="active = !active">Blog</nuxt-link>
        </li>
      </ul>
    </div>
  </nav>
</template>

<script>
export default {
  name: "NavBar",
  data() {
    return {
      active: false,
    };
  },
};
</script>
