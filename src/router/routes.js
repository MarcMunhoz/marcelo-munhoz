const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("pages/IndexPage.vue"), meta: { title: "Home" } },
      { path: "/about", name: "Prefácio", component: () => import("pages/About.vue"), meta: { title: "About" } },
      {
        path: "/blog",
        name: "Meus Artigos",
        component: () => import("pages/Blog.vue"),
        meta: {
          title: "Artigos",
        },
      },
      {
        path: "/blog/:slug",
        name: "Artigo",
        component: () => import("components/BlogArticle.vue"),
      },
      {
        path: "/blog/tags/:tag",
        name: "Artigos Tags",
        component: () => import("components/ArticlesTags.vue"),
        meta: {
          title: "Artigos por tag",
        },
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
