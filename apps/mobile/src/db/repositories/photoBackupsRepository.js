import { eq } from "drizzle-orm";

import { db } from "@db/client";
import { photoBackups } from "@db/schema/schema";

async function upsertAsset(asset) {
  await db.insert(photoBackups).values(asset).onConflictDoUpdate({ target: photoBackups.assetId, set: asset });
}

function getPendingAssets() {
  return db.select().from(photoBackups).where(eq(photoBackups.status, "pending"));
}

function markBackedUp(assetId, cloudFileId) {
  return db
    .update(photoBackups)
    .set({ status: "backed_up", cloudFileId, backedUpAt: new Date().toISOString() })
    .where(eq(photoBackups.assetId, assetId));
}

function markFailed(assetId) {
  return db.update(photoBackups).set({ status: "failed" }).where(eq(photoBackups.assetId, assetId));
}

async function isAlreadyBacked(assetId) {
  const rows = await db.select().from(photoBackups).where(eq(photoBackups.assetId, assetId));
  return rows.length > 0 && rows[0].status === "backed_up";
}

function clearAll() {
  return db.delete(photoBackups);
}

const photoBackupsRepository = { upsertAsset, getPendingAssets, markBackedUp, markFailed, isAlreadyBacked, clearAll };

export default photoBackupsRepository;
