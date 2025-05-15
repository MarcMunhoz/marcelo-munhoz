<template>
  <div class="fullscreen bg-blue-grey-3 text-grey-2 text-center q-pa-md flex flex-center">
    <div>
      <div style="font-size: 30vh">404</div>

      <div class="text-h2" style="opacity: 0.4">Oops.<br />¯\_(ツ)_/¯</div>

      <q-btn class="q-mt-xl" color="white" text-color="grey-5" unelevated to="/" label="Go Home" no-caps />
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "ErrorNotFound",
});
</script>
