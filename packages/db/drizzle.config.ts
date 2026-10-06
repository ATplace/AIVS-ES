import { defineConfig } from "drizzle-kit";
import { PGLITE_DATA_DIR } from "./src/paths";

const url = process.env.DATABASE_URL?.trim();

export default defineConfig(
  url
    ? {
        dialect: "postgresql",
        schema: "./src/schema.ts",
        out: "./drizzle",
        dbCredentials: { url },
      }
    : {
        dialect: "postgresql",
        driver: "pglite",
        schema: "./src/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: PGLITE_DATA_DIR },
      },
);
