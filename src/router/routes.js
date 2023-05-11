import { route } from "quasar/wrappers";

const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("pages/IndexPage.vue") },
      { path: "/about", name: "Prefácio", component: () => import("pages/About.vue") },
      {
        path: "/blog",
        name: "Meus Artigos",
        component: () => import("pages/Blog.vue"),
      },
      {
        path: "/blog/:slug",
        name: "Artigo",
        component: () => import("components/BlogArticle.vue"),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
