<template>
  <q-page class="home-page">
    <section class="home-hero" aria-labelledby="home-title">
      <img
        class="home-hero-image"
        src="https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,q_auto,c_scale,w_1731/v1787690105/marcelo-munhoz-website/marcelomunhoz_hero.png"
        srcset="
          https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,q_auto,c_scale,w_480/v1787690105/marcelo-munhoz-website/marcelomunhoz_hero.png 480w,
          https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,q_auto,c_scale,w_960/v1787690105/marcelo-munhoz-website/marcelomunhoz_hero.png 960w,
          https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,q_auto,c_scale,w_1280/v1787690105/marcelo-munhoz-website/marcelomunhoz_hero.png 1280w,
          https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,q_auto,c_scale,w_1731/v1787690105/marcelo-munhoz-website/marcelomunhoz_hero.png 1731w,
          https://res.cloudinary.com/marcelo-munhoz/image/upload/f_auto,q_auto,c_scale,w_1920/v1787690105/marcelo-munhoz-website/marcelomunhoz_hero.png 1920w
        "
        sizes="min(100vw, 1295px, max(305px, calc(190.43svh - 22.85rem)))"
        width="1731"
        height="909"
        fetchpriority="high"
        decoding="async"
        alt="Marcelo Munhoz"
      />
    </section>

    <section class="home-intro" aria-labelledby="home-title">
      <p class="home-eyebrow">São Paulo · Brasil</p>
      <h1 id="home-title">Eu faço coisas para a web.</h1>
      <p class="home-lede">Sou Marcelo Munhoz, desenvolvedor web. Trabalho com interfaces, aplicações e experiências digitais desde 2004.</p>
      <p class="home-note">Entre código e cultura, gosto de explorar artes, games, literatura e cinema.</p>

      <dl class="home-facts" aria-label="Sobre Marcelo">
        <div class="home-fact">
          <dt>Local</dt>
          <dd>São Paulo, Brasil</dd>
        </div>
        <div class="home-fact">
          <dt>Experiência</dt>
          <dd>{{ yearCount("2004-06-04") }} anos na web</dd>
        </div>
        <div class="home-fact">
          <dt>Interesses</dt>
          <dd>Código + cultura</dd>
        </div>
      </dl>
    </section>

    <q-separator />

    <section class="home-section home-knowledge" aria-labelledby="knowledge-title">
      <div class="home-section-heading">
        <p class="home-eyebrow">Ferramentas do ofício</p>
        <h2 id="knowledge-title">Conhecimentos</h2>
      </div>
      <div class="knowledge-list">
        <span v-for="item in confortableWith" :key="item.index" class="knowledge-item">
          <img
            :src="`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${item.imagePath}/${item.imageName}.svg`"
            :alt="item.tooltip"
            height="30"
            width="30"
          />
          <span>{{ item.tooltip }}</span>
        </span>
      </div>
    </section>

    <q-separator />

    <section class="home-section home-projects" aria-labelledby="projects-title">
      <div class="home-section-heading">
        <p class="home-eyebrow">Pequenas experiências, grandes opiniões</p>
        <h2 id="projects-title">Projetos (in)úteis</h2>
      </div>
      <div class="project-list">
        <a
          v-for="project in sortAnything(projectsList, 'projectName')"
          :key="project.index"
          class="project-link"
          :href="project.projectUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          <q-icon :name="project.projectEmoji" size="1.5rem" aria-hidden="true" />
          <span class="project-copy">
            <strong>{{ project.projectName }}</strong>
            <small v-if="project.projectTooltip">{{ project.projectTooltip }}</small>
          </span>
          <q-icon name="north_east" size="1.1rem" aria-hidden="true" />
        </a>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import projectsList from "../utils/projectsList";
import confortableWith from "../utils/confortableWith";
import { sortAnything } from "../utils/homeMedia.js";

defineOptions({
  name: "IndexPage",
});

const yearCount = (initialDate) => {
  const countedDate = new Date(Date.now() - new Date(initialDate).getTime());

  return Math.abs(countedDate.getFullYear() - 1970);
};
</script>

<style lang="scss" scoped>
.home-page { color: #173042; width: 100%; }
.home-hero { background: #07141c; box-shadow: 0 14px 30px rgba(23, 48, 66, 0.2); display: flex; justify-content: center; margin-top: 1px; max-height: clamp(160px, calc(100svh - 12rem), 680px); overflow: hidden; position: relative; width: 100%; z-index: 0; }
.home-hero-image { display: block; height: auto; max-height: inherit; max-width: 100%; width: auto; }
.home-intro, .home-section { margin-inline: auto; max-width: 1280px; padding: 4rem clamp(1.25rem, 5vw, 5rem); }
.home-intro { max-width: 900px; text-align: left; }
.home-eyebrow { color: #52758a; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.12em; margin: 0 0 0.75rem; text-transform: uppercase; }
.home-intro h1, .home-section h2 { color: #173042; font-weight: 400; letter-spacing: -0.04em; line-height: 1; margin: 0; }
.home-intro h1 { font-size: clamp(2.75rem, 7vw, 6.5rem); max-width: 10ch; }
.home-lede, .home-note { font-size: clamp(1.2rem, 2.2vw, 1.7rem); line-height: 1.4; margin: 1.5rem 0 0; max-width: 42rem; }
.home-note { color: #52758a; margin-top: 0.5rem; }
.home-facts { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 3rem 0 0; }
.home-fact { border-top: 1px solid #b7c9d1; padding-top: 0.75rem; }
.home-fact dt { color: #52758a; font-size: 0.8rem; letter-spacing: 0.08em; text-transform: uppercase; }
.home-fact dd { font-size: 1.05rem; margin: 0.35rem 0 0; }
.home-section-heading { margin-bottom: 2rem; }
.home-section h2 { font-size: clamp(2.2rem, 5vw, 4rem); }
.knowledge-list { display: grid; gap: 0.75rem 1.25rem; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
.knowledge-item { align-items: center; border-bottom: 1px solid #d5e0e4; display: flex; gap: 0.65rem; min-height: 3rem; }
.knowledge-item img { flex: 0 0 auto; }
.project-list { display: grid; gap: 0.75rem; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.project-link { align-items: center; border: 1px solid #b7c9d1; color: #173042; display: flex; gap: 0.85rem; min-height: 5rem; padding: 1rem; text-decoration: none; transition: background-color 150ms ease, border-color 150ms ease; }
.project-link:hover, .project-link:focus-visible { background: #edf4f6; border-color: #52758a; }
.project-copy { display: flex; flex: 1; flex-direction: column; gap: 0.25rem; min-width: 0; }
.project-copy small { color: #52758a; line-height: 1.3; }
@media (max-width: 700px) {
  .home-intro, .home-section { padding: 2.75rem 1.25rem; }
  .home-intro h1 { font-size: clamp(2.75rem, 14vw, 5rem); }
  .home-lede, .home-note { font-size: 1.2rem; }
  .home-facts, .project-list { grid-template-columns: 1fr; }
  .knowledge-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
