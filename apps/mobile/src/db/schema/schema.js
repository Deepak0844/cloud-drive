import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// ─── app_meta ────────────────────────────────────────────────────────────────
// Minimal placeholder table so the SQLite + Drizzle + migration pipeline is
// wired and runnable. Replace with real domain tables as the app grows.
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: integer("updated_at"),
});
