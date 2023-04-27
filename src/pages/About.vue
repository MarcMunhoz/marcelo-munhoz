<template>
  <q-page class="pt-4">
    <q-card class="my-card" flat bordered>
      <q-card-section horizontal>
        <q-img class="col-3 rounded-br-lg" :src="cloudinaryImg('me', 500)" />

        <q-card-section class="text-justify">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Nobis autem assumenda ut repudiandae quibusdam dolore magnam officiis, aliquam aut cupiditate illo iusto distinctio eveniet delectus consequatur fugit debitis saepe ipsam deleniti. Iusto, asperiores molestiae quae accusantium quasi voluptate consectetur quam ducimus, veritatis numquam laboriosam earum rem? Ratione eligendi corrupti maxime ad rerum esse eveniet, repellat facere veniam ex? Culpa dolorem at, delectus perspiciatis, incidunt dignissimos asperiores omnis voluptatibus obcaecati, iure ipsam numquam modi aperiam? Officia aliquam saepe officiis ducimus totam voluptates iusto debitis itaque quasi alias. Quidem neque ipsa nisi, mollitia consequatur ex? Vitae, repellendus qui quod aut dicta sunt incidunt porro
          voluptates quia, libero quibusdam esse fuga rem! Assumenda deleniti et totam animi debitis distinctio earum nam quisquam nisi asperiores, laboriosam quae deserunt quo sed saepe accusamus sapiente maiores minus provident culpa quas vitae odit? Modi suscipit voluptas perferendis ex blanditiis magnam, voluptatibus tempore odio sapiente, saepe minima exercitationem.
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
