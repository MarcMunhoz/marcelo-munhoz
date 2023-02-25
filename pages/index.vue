<template>
  <div class="container-fluid mt-4">
    <picture class="home-cover d-flex justify-content-center">
      <img :src="`${cloudinaryImg('marcelo-munhoz-website', 'cover', 1875)}.jpg`" alt="" class="w-100" />
    </picture>

    <p class="my-4 display-3 text-center">Eu. Nascido em São Paulo, Brasil. Estou com {{ age() }} anos.</p>

    <p class="my-4 display-4 text-center">Quase 2 décadas trabalhando com web. HTML, CSS, JS e derivados.</p>

    <p class="my-4 display-4 text-center">Artes, games, literatura e cinema... Amo!</p>

    <div class="projects mt-5 border-top pt-4">
      <h1 class="text-center">Pequenos projetos</h1>

      <ul class="list-unstyled d-flex justify-content-around mt-5 mx-auto w-50">
        <li v-for="project in sortAnything(ProjectsList, 'projectName')" :key="project.index" class="p-2 text-center">
          <a :href="project.projectUrl" target="project" class="font-weight-bold text-primary">
            {{ project.projectName }}
          </a>
          <emoji :name="`${computedEmoji(project.projectEmoji)}`" />
        </li>
      </ul>
    </div>

    <div class="onde mt-5 border-top pt-4">
      <h1 class="text-center">Onde estou</h1>

      <ul class="toShare mt-5">
        <li class="toShare_item" v-for="social in filteredSocialList()" :key="social.index">
          <a :href="`${social.urlAccount}${social.userAccount}`" :title="capitalizeIt(social)">
            <font-awesome-icon :icon="[social.iconPrefix, social.nameAccount]" size="9x" />
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import SocialNetwork from "@/utils/socialNetwork";
import ProjectsList from "@/utils/projectsList";
import Emoji from "vuejs-emojis";

export default {
  layout: "default",
  data() {
    return {
      SocialNetwork,
      ProjectsList,
    };
  },
  components: {
    Emoji,
  },
  methods: {
    age() {
      const birth = new Date("1982-05-15");
      const ageDate = new Date(Date.now() - birth.getTime());

      return Math.abs(ageDate.getUTCFullYear() - 1970);
    },
    sortAnything(thing, thingProperty) {
      return thing.slice().sort((a, b) => {
        return a[thingProperty].localeCompare(b[thingProperty]);
      });
    },
    filteredSocialList() {
      return this.sortAnything(this.SocialNetwork, "nameAccount").filter((social) => social.useItOn.includes("where"));
    },
    capitalizeIt: function (stringToCapitalize) {
      return stringToCapitalize.nameAccount.charAt(0).toUpperCase() + stringToCapitalize.nameAccount.slice(1);
    },
    cloudinaryImg: function (imgPath, imgName, imgWidth) {
      return this.$cloudinary.image.url(`${imgPath}/${imgName}`, {
        crop: "fit",
        width: imgWidth,
      });
    },
    computedEmoji: function (projectEmoji) {
      return projectEmoji;
    },
  },
};
</script>

<style lang="scss" scoped>
@import "@/assets/scss/variables";

.home-cover {
  max-height: 500px;

  img {
    object-fit: cover;
  }
}

.toShare {
  display: grid;
  grid-gap: 3em;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  justify-items: center;
  list-style: none;

  @media #{$small-screens} {
    padding-left: 0;
  }

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
