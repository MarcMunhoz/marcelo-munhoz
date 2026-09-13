import ga from "../../analytics.js";

export default ({ router }) => {
  router.afterEach((to) => {
    ga.logPage(to.path, to.name);
  });
};
