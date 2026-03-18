import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        tasks: resolve(__dirname, "Tasks/tasks.html"),
        observations: resolve(__dirname, "Observations/Observations.html"),
        users: resolve(__dirname, "AccountCreation/users.html"),
      },
    },
  },
});