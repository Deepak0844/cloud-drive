// Used by drizzle-kit CLI only (never imported at runtime).
//
// Commands:
//   npm run db:generate   →  generate a new migration from schema changes
//   npm run db:studio     →  open Drizzle Studio to inspect the DB

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: ["./src/db/schema/schema.js"],
  out: "./src/db/migrations",
  driver: "expo", // targets expo-sqlite (not better-sqlite3)
});
