<template>
  <q-page class="pt-4">
    <q-card class="my-card" flat>
      <q-card-section horizontal>
        <q-img class="col-3 rounded-br-lg" :src="cloudinaryImg('me', 500)" />

        <q-card-section class="text-justify">
          <p>Eu sou uma pessoa simples, porém complexa.</p>
          <p>Sou um apixonado por futebol, mas detesto uma discussão de fã, esse papo de "se foi penalti a favor está certo, caso contrário não foi" é muito entediante pra mim. 🙄</p>
          <p>¡Hala MADRID y nada más! <img src="https://camo.githubusercontent.com/9af8b4cfe52ad3ba18253dd014331a3058ecc4f15c28296ba53f939ceeb240b4/68747470733a2f2f75706c6f61642e77696b696d656469612e6f72672f77696b6970656469612f73636f2f352f35362f5265616c5f4d61647269645f43462e737667" width="20" data-canonical-src="https://upload.wikimedia.org/wikipedia/sco/5/56/Real_Madrid_CF.svg" class="inline-block w-[20px]" /></p>
          <p>Música: dark wave, synth-eletronic, hip hop, blues, heavy metal</p>
        </q-card-section>
      </q-card-section>

      <q-card-actions align="center" class="social-links">
        <q-btn flat round :icon="`${social.iconPrefix}-${social.nameAccount}`" v-for="social in filteredSocialList()" :key="social.index" @click="onClickItem(`${social.urlAccount}${social.userAccount}`)" size="xl" color="blue-grey-5" />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import cloudinaryImg from "../pages/IndexPage.vue";
import sortAnything from "../pages/IndexPage.vue";

export default defineComponent({
  name: "AboutPage",
  mixins: [cloudinaryImg, sortAnything],
  methods: {
    filteredSocialList() {
      // sortAnything method require the socialNetwork data that comes from its component
      return this.sortAnything(this.socialNetwork, "nameAccount").filter((social) => social.useItOn.includes("where"));
    },
  },
  mounted() {
    const icons = document.querySelectorAll(".social-links i");

    icons.forEach((e) => {
      e.addEventListener("mouseover", (e) => {
        e.target.classList.add("fa-flip");
      });
      e.addEventListener("mouseleave", (e) => {
        e.target.classList.remove("fa-flip");
      });
    });
  },
});
</script>
