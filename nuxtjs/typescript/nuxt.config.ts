import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  // Nitro bundles server routes with Rollup, which does not understand `.vue`
  // files. Adding the Vue plugin lets server routes import single-file
  // components, so email templates are real SFCs shared with the pages.
  nitro: {
    rollupConfig: {
      // Nitro's Rollup types and Vite's plugin types differ; the Vue plugin
      // works at runtime, which is what compiles the SFC email templates.
      plugins: [vue() as never],
    },
  },
  css: ["~/assets/css/main.css"],
  app: {
    head: {
      htmlAttrs: { class: "dark" },
      title: "mxRaven Nuxt examples",
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
