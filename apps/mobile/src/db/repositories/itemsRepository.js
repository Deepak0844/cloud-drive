import { File, Paths } from "expo-file-system/next";
import { eq } from "drizzle-orm";

// Db
import { db } from "@db/client";
import { items } from "@db/schema/schema";
import Config from "@config";

async function upsertItems(rows) {
  for (const row of rows) {
    await db.insert(items).values(row).onConflictDoUpdate({ target: items.id, set: row });
  }
}

function queryItems(parentId) {
  return db.select().from(items).where(eq(items.parentId, parentId));
}

function getMarkedFiles() {
  return db.select().from(items).where(eq(items.isOffline, 1));
}

function setOffline(id, val) {
  return db
    .update(items)
    .set({ isOffline: val ? 1 : 0 })
    .where(eq(items.id, id));
}

function clearAll() {
  return db.delete(items);
}

function getDbSizeBytes() {
  const file = new File(Paths.document, "SQLite", Config.DB_NAME);
  return file.exists ? file.size : 0;
}

const itemsRepository = { upsertItems, queryItems, getMarkedFiles, setOffline, clearAll, getDbSizeBytes };

export default itemsRepository;
