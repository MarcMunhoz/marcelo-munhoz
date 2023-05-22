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
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { Cloudinary } from "@cloudinary/url-gen";
import { fit } from "@cloudinary/url-gen/actions/resize";
import projectsList from "../utils/projectsList";

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
    yearCount(initialDate) {
      const countedDate = new Date(Date.now() - new Date(initialDate).getTime());
      return Math.abs(countedDate.getFullYear() - 1970);
    },
    sortAnything(thing, thingProperty) {
      return thing.slice().sort((a, b) => {
        return a[thingProperty].localeCompare(b[thingProperty]);
      });
    },
  },
});
</script>
