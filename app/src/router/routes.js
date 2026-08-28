const routes = [
  {
    path: "/",
    component: () => import("@/layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("@/pages/IndexPage.vue"), meta: { title: "Home" } },
      { path: "/about", name: "Prefácio", component: () => import("@/pages/About.vue"), meta: { title: "About" } },
      {
        path: "/blog",
        name: "Meus Artigos",
        component: () => import("@/pages/Blog.vue"),
        meta: {
          title: "Artigos",
        },
      },
      {
        path: "/blog/:slug",
        name: "Artigo",
        component: () => import("@/components/BlogArticle.vue"),
      },
      {
        path: "/blog/authors/:slug",
        name: "Author",
        component: () => import("@/pages/AuthorProfile.vue"),
        meta: {
          title: "Author",
        },
      },
      {
        path: "/blog/tags/:tag",
        redirect: (to) => ({ name: "Meus Artigos", query: { tag: to.params.tag } }),
      },
      {
        path: "/admin",
        name: "Admin",
        component: () => import("@/pages/Admin.vue"),
        meta: {
          title: "Admin",
          requiresAdmin: true,
        },
      },
      {
        path: "/admin/articles/new",
        name: "Admin Article New",
        component: () => import("@/pages/AdminArticleEditor.vue"),
        meta: {
          title: "New Article",
          requiresAdmin: true,
        },
      },
      {
        path: "/admin/articles/:entryId/edit",
        name: "Admin Article Edit",
        component: () => import("@/pages/AdminArticleEditor.vue"),
        meta: {
          title: "Edit Article",
          requiresAdmin: true,
        },
      },
      {
        path: "/admin/profile",
        name: "Author Profile",
        component: () => import("@/pages/AdminProfile.vue"),
        meta: {
          title: "Author Profile",
          requiresAdmin: true,
        },
      },
      {
        path: "/admin/tags",
        name: "Admin Tags",
        component: () => import("@/pages/AdminTags.vue"),
        meta: {
          title: "Tag management",
          requiresAdmin: true,
          requiresOwner: true,
        },
      },
    ],
  },
  {
    path: "/:catchAll(.*)",
    component: () => import("@/pages/ErrorNotFound.vue"),
  },
];

export default routes;
