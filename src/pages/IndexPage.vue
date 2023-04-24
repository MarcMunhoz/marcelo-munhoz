<template>
  <q-page class="text-center">
    <picture class="flex flex-nowrap justify-center max-h-[500px]">
      <img :src="cloudinaryImg('cover', 1875)" class="w-100 object-cover" />
    </picture>

    <p class="my-4 text-[5em]">Eu. Nascido em São Paulo, Brasil. Estou com {{ yearCount("1982-05-15") }} anos.</p>

    <p class="my-4 text-[3em] font-light">Estou há {{ yearCount("2004-06-04") }} anos trabalhando com web. HTML, CSS, JS e derivados.</p>

    <p class="my-4 text-[3em] font-light">Artes, games, literatura e cinema... Amo!</p>

    <q-separator />

    <section class="mb-6">
      <h1 class="text-[3em] font-bold">Projetos (in)úteis</h1>
      <q-chip v-for="project in sortAnything(projectsList, 'projectName')" :key="project.index" :icon="project.projectEmoji" clickable @click="onClickItem(project.projectUrl)" outline color="blue-grey-5" size="xl">{{ project.projectName }}</q-chip>
    </section>

    <q-separator />

    <h1 class="text-[3em] font-bold">Onde estou</h1>
    <ul class="toShare mt-5">
      <li class="toShare_item" v-for="social in filteredSocialList()" :key="social.index">
        <a :href="`${social.urlAccount}${social.userAccount}`" :title="capitalizeIt(social)">
          <q-icon :name="`${social.iconPrefix}-${social.nameAccount}`" color="blue-grey-5" size="8em" />
        </a>
      </li>
    </ul>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { Cloudinary } from "@cloudinary/url-gen";
import { fit } from "@cloudinary/url-gen/actions/resize";
import projectsList from "../utils/projectsList";
import socialNetwork from "../utils/socialNetwork";

const cld = new Cloudinary({
  cloud: {
    cloudName: "marcelo-munhoz",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
});

export default defineComponent({
  name: "IndexPage",
  data() {
    return {
      projectsList,
      socialNetwork,
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

<style lang="scss" scoped>
.toShare {
  display: grid;
  grid-gap: 3em;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  justify-items: center;
  list-style: none;

  .toShare_item {
    align-self: center;
    max-width: 200px;
    text-align: center;
    width: 100%;

    a {
      display: block;
      width: 100%;

      &:hover {
        color: lightgrey;
      }
    }
  }
}
</style>
