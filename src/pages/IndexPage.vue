<template>
  <q-page class="text-center">
    <picture class="flex flex-nowrap justify-center max-h-[500px]">
      <img :src="cloudinaryImg('cover', 1875)" class="w-100 object-cover" />
    </picture>

    <p class="my-4 text-[4em]">Eu. Nascido em São Paulo, Brasil. Estou com {{ yearCount("1982-05-15") }} anos.</p>

    <p class="my-4 text-[3em] font-light">Estou há {{ yearCount("2004-06-04") }} anos trabalhando com web. HTML, CSS, JS e derivados.</p>

    <p class="my-4 text-[3em] font-light">Artes, games, literatura e cinema... Amo!</p>

    <q-separator />

    <section class="mb-5 flex justify-center gap-8">
      <h1 class="w-full text-[3em] font-bold">Confortável com</h1>
      <picture v-for="item in confortableWith" :key="item.index">
        <img :src="`https://raw.githubusercontent.com/MarcMunhoz/devicon/master/icons/${item.imagePath}/${item.imageName}.svg`" height="30" width="40" />
        <q-tooltip>{{ item.tooltip }}</q-tooltip>
      </picture>
    </section>

    <q-separator />

    <section class="mb-6">
      <h1 class="text-[3em] font-bold">Projetos (in)úteis</h1>
      <q-chip v-for="project in sortAnything(projectsList, 'projectName')" :key="project.index" :icon="project.projectEmoji" clickable @click="onClickItem(project.projectUrl)" outline color="blue-grey-5" size="xl">{{ project.projectName }}</q-chip>
    </section>

    <q-separator />

    <section>
      <h1 class="text-[3em] font-bold">Encontre-me</h1>
      <div class="row">
        <q-btn rounded :icon="`${social.iconPrefix}-${social.nameAccount}`" v-for="social in filteredSocialList()" :key="social.index" @click="onClickItem(`${social.urlAccount}${social.userAccount}`)" size="xl" color="blue-grey-5" class="col my-2.5 mx-4" />
      </div>
    </section>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import cld from "../utils/coudinaryGallery";
import { fit } from "@cloudinary/url-gen/actions/resize";
import projectsList from "../utils/projectsList";
import socialNetwork from "../utils/socialNetwork";
import confortableWith from "../utils/confortableWith";

export default defineComponent({
  name: "IndexPage",
  data() {
    return {
      projectsList,
      socialNetwork,
      confortableWith,
    };
  },
  methods: {
    cloudinaryImg: function (imgName, imgWidth) {
      const image = cld.image(`marcelo-munhoz-website/${imgName}`);

      return image.resize(fit().width(imgWidth)).toURL();
    },
    onClickItem(link) {
      return window.open(link, "project");
    },
    capitalizeIt: function (stringToCapitalize) {
      return stringToCapitalize.nameAccount.charAt(0).toUpperCase() + stringToCapitalize.nameAccount.slice(1);
    },
    yearCount(initialDate) {
      const countedDate = new Date(Date.now() - new Date(initialDate).getTime());
      return Math.abs(countedDate.getFullYear() - 1970);
    },
    sortAnything(thing, thingProperty) {
      return thing.slice().sort((a, b) => {
        return a[thingProperty].localeCompare(b[thingProperty]);
      });
    },
    filteredSocialList() {
      return this.sortAnything(this.socialNetwork, "nameAccount").filter((social) => social.useItOn.includes("where"));
    },
  },
});
</script>
