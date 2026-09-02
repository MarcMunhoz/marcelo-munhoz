export const quasarBuildEnvironment = {};

export const quasarDevServerProxy = {
  "/api/admin/contentful": {
    target: "http://localhost:3000",
    changeOrigin: true,
  },
  "/api": {
    target: "http://localhost:3000",
    changeOrigin: true,
    pathRewrite: { "^/api": "/api" },
  },
};
