import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: ["./src/db/schema/schema.js"],
  out: "./src/db/migrations",
  dbCredentials: {
    url: "src/db/app.db",
  },
});
