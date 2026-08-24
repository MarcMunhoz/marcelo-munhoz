<template>
  <q-page class="pt-4">
    <q-card class="my-card" flat>
      <q-card-section horizontal class="about-introduction">
        <q-img class="about-image col-3 rounded-br-lg" :src="cloudinaryImg('me', 500)" />

        <q-card-section class="about-biography text-justify">
          <p>Eu sou uma pessoa simples, porém complexa.</p>
          <p>Sou um apixonado por futebol, mas detesto uma discussão de fã, esse papo de "se foi penalti a favor está certo, caso contrário não foi" é muito entediante pra mim. 🙄</p>
          <p>¡Hala MADRID y nada más! <img src="../assets/real_madrid.svg" class="inline-block w-[20px]" /></p>
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

<style lang="scss" scoped>
.social-links {
  flex-wrap: wrap;
}

@media (max-width: 700px) {
  .about-introduction {
    flex-direction: column;
  }

  .about-image {
    max-width: 100%;
    width: 100%;
  }

  .about-biography {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .social-links :deep(.q-btn) {
    flex: 0 0 auto;
  }
}
</style>
