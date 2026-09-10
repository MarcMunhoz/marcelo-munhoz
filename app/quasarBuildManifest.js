export const quasarBuildEnvironment = {};
export const quasarDevServerAllowedHosts = ["test-frontend"];

export const createQuasarDevServerProxy = (target = "http://localhost:3000") => ({
  "/api/admin/contentful": {
    target,
    changeOrigin: true,
  },
  "/api": {
    target,
    changeOrigin: true,
    pathRewrite: { "^/api": "/api" },
  },
});

export const quasarDevServerProxy = createQuasarDevServerProxy(process.env.API_PROXY_TARGET);
