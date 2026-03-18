import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: new URL("./index.html", import.meta.url).pathname,
        tasks: new URL("./Tasks/tasks.html", import.meta.url).pathname,
        observations: new URL("./Observations/Observations.html", import.meta.url).pathname,
        users: new URL("./AccountCreation/users.html", import.meta.url).pathname,
      },
    },
  },
});