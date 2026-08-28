import vue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/**", "src-capacitor/**", "src-cordova/**", ".quasar/**", "node_modules/**"],
  },
  ...vue.configs["flat/essential"],
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        ga: "readonly",
        cordova: "readonly",
        __statics: "readonly",
        __QUASAR_SSR__: "readonly",
        __QUASAR_SSR_SERVER__: "readonly",
        __QUASAR_SSR_CLIENT__: "readonly",
        __QUASAR_SSR_PWA__: "readonly",
        process: "readonly",
        Capacitor: "readonly",
        chrome: "readonly",
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "prefer-promise-reject-errors": "off",
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='$q']",
          message: "Use declarative Quasar components or native browser APIs instead of the $q injection.",
        },
      ],
    },
  },
];
