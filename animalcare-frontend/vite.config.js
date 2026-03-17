import { defineConfig } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      minify: false,
      pages: [
        {
          entry: "src/inventory/main.js",
          filename: "inventory/index.html",
          template: "src/inventory/index.html",
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        inventory: resolve(__dirname, "src/inventory/index.html"),
      },
    },
  },
});