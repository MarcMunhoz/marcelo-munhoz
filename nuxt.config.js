export default {
  /*
   ** Headers of the page
   */
  head: {
    title: "Marcelo Munhoz Website",
    meta: [
      { charset: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "Marcelo Munhoz <me@marcelomunhoz.com>" },
      { hid: "description", name: "description", content: "Some brief histories of my past-present development experience. The life, the universe and everything about a tech life" },
      { name: "keywords", content: "blog,personal,pessoal,developer,NuxtJS,coding,webtech,tips,dicas" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    link: [{ rel: "icon", type: "image/x-icon", href: "/favicon.ico" }],
  },
  server: {
    host: "0",
    port: 4242, // default: 3000
  },
  target: "static",
  /*
   ** Customize the progress-bar color
   */
  loading: { color: "#fff" },
  /*
   ** Global CSS
   */
  css: [
    // SCSS file in the project
    "@/assets/scss/main.scss",
  ],
  components: true,
  content: {
    nestedProperties: ["author.name"],
    markdown: {
      remarkPlugins: ["remark-emoji"],
    },
  },
  buildModules: ["@nuxtjs/dotenv", "@nuxtjs/fontawesome", "@nuxtjs/google-analytics"],
  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://bootstrap-vue.js.org
    "bootstrap-vue/nuxt",
    // Doc: https://axios.nuxtjs.org/usage
    "@nuxtjs/axios",
    // Darkmode
    ["nuxtjs-darkmode-js-module", { label: "🌓" }],
    "@nuxt/content",
    "@nuxtjs/cloudinary",
    "vue-social-sharing/nuxt",
  ],
  cloudinary: {
    cloudName: "marcelo-munhoz",
    apikey: process.env.CLODINARY_APIKEY,
    apiSecret: process.env.CLODINARY_APIKEYSECRET,
  },
  fontawesome: {
    icons: {
      solid: true,
      brands: true,
    },
  },
  googleAnalytics: {
    id: process.env.GOOGLE_USERID,
  },
};
