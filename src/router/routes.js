import { route } from "quasar/wrappers";

const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("pages/IndexPage.vue") },
      { path: "/about", name: "prefácio", component: () => import("pages/About.vue") },
      {
        path: "/blog",
        name: "meus artigos",
        component: () => import("pages/Blog.vue"),
      },
      {
        path: "/blog/:article",
        name: "artigo",
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
