import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── app_meta ────────────────────────────────────────────────────────────────
// Minimal placeholder table so the SQLite + Drizzle + migration pipeline is
// wired and runnable. Replace with real domain tables as the app grows.
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: integer("updated_at"),
});

// ─── transfers ───────────────────────────────────────────────────────────────
export const transfers = sqliteTable("transfers", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  type: text("type").notNull(), // 'upload' | 'download'
  status: text("status").notNull(), // 'pending' | 'active' | 'paused' | 'complete' | 'failed'
  name: text("name").notNull(),
  url: text("url"),
  dest: text("dest"),
  mimeType: text("mime_type"),
  progress: real("progress"),
  resumeData: text("resume_data"),
  uploadId: text("upload_id"),
  uploadedChunks: integer("uploaded_chunks"),
  totalChunks: integer("total_chunks"),
  retryCount: integer("retry_count").default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─── items ────────────────────────────────────────────────────────────────────
export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'file' | 'folder'
  size: integer("size"),
  mimeType: text("mime_type"),
  updatedAt: text("updated_at"),
  isOffline: integer("is_offline").default(0),
});
