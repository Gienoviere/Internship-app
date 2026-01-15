import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "postgresql://postgres:Gienoviere-27%24@localhost:5432/animalcare?schema=public",
  },
});