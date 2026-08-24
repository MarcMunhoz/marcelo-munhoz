<template>
  <q-page class="text-center">
    <picture class="home-hero">
      <img :src="cloudinaryImg('cover', 1875)" class="home-hero-image" />
    </picture>

    <p class="home-introduction my-4">Eu. Nascido em São Paulo, Brasil. Estou com {{ yearCount("1982-05-15") }} anos.</p>

    <p class="home-summary my-4 font-light">Estou há {{ yearCount("2004-06-04") }} anos trabalhando com web. HTML, CSS, JS e derivados.</p>

    <p class="home-summary my-4 font-light">Artes, games, literatura e cinema... Amo!</p>

    <q-separator />

    <section class="knowledge-grid mb-5">
      <h1 class="home-section-title">Conhecimentos</h1>
      <picture v-for="item in confortableWith" :key="item.index">
        <img :src="`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${item.imagePath}/${item.imageName}.svg`" height="30" width="40" />
        <q-tooltip>{{ item.tooltip }}</q-tooltip>
      </picture>
    </section>

    <q-separator />

    <section class="home-projects mb-6">
      <h1 class="home-section-title">Projetos (in)úteis</h1>
      <div class="home-project-chips">
      <q-chip
        v-for="project in sortAnything(projectsList, 'projectName')"
        :key="project.index"
        :icon="project.projectEmoji"
        clickable
        @click="onClickItem(project.projectUrl)"
        outline
        color="blue-grey-5"
        size="xl"
      >
        {{ project.projectName }}
        <q-tooltip v-if="project.projectTooltip">{{ project.projectTooltip }}</q-tooltip>
      </q-chip>
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
  },
});
</script>

<style lang="scss" scoped>
.home-hero {
  display: block;
  margin-inline: auto;
  max-height: 500px;
  max-width: 100%;
}

.home-hero-image {
  display: block;
  height: auto;
  max-width: 100%;
  object-fit: cover;
}

.home-introduction {
  font-size: clamp(2rem, 10vw, 4rem);
  line-height: 1.15;
}

.home-summary,
.home-section-title {
  font-size: clamp(1.6rem, 7vw, 3rem);
  line-height: 1.2;
}

.knowledge-grid {
  align-items: center;
  display: grid;
  gap: 1.5rem 2rem;
  grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
  justify-items: center;
  padding-inline: 1rem;
}

.knowledge-grid .home-section-title {
  grid-column: 1 / -1;
  margin: 0;
}

.home-projects {
  padding-inline: 1rem;
}

.home-project-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

@media (max-width: 700px) {
  .home-project-chips :deep(.q-chip) {
    height: auto;
    max-width: 100%;
    min-height: 2em;
  }

  .home-project-chips :deep(.q-chip__content) {
    overflow-wrap: anywhere;
    white-space: normal;
  }
}
</style>
