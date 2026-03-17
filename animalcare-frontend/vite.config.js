import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        inventory: resolve(__dirname, "src/inventory/index.html"),
      },
    },
  },
});