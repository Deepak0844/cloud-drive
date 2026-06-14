import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  parentId: text("parent_id"),
  name: text("name").notNull(),
  type: text("type").notNull(),
  size: integer("size"),
  mimeType: text("mime_type"),
  updatedAt: text("updated_at"),
  isOffline: integer("is_offline").default(0),
  thumbnailPath: text("thumbnail_path"),
});

export const transfers = sqliteTable("transfers", {
  id: text("id").primaryKey(),
  fileId: text("file_id").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  url: text("url"),
  dest: text("dest"),
  name: text("name"),
  size: integer("size"),
  uploadId: text("upload_id"),
  uploadedChunks: integer("uploaded_chunks"),
  totalChunks: integer("total_chunks"),
  resumeData: text("resume_data"),
  progress: real("progress").default(0),
  retryCount: integer("retry_count").default(0),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});
