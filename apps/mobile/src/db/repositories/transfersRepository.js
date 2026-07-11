import { eq, inArray } from "drizzle-orm";

// Db
import { db } from "@db/client";
import { transfers } from "@db/schema/schema";

function upsertTransfer(transfer) {
  return db.insert(transfers).values(transfer).onConflictDoUpdate({
    target: transfers.id,
    set: transfer,
  });
}

function getByStatus(statuses) {
  return db.select().from(transfers).where(inArray(transfers.status, statuses));
}

function getById(id) {
  return db.select().from(transfers).where(eq(transfers.id, id));
}

function updateProgress(id, progress, resumeData = null) {
  return db
    .update(transfers)
    .set({ progress, resumeData, updatedAt: new Date().toISOString() })
    .where(eq(transfers.id, id));
}

function updateUploadChunks(id, uploadedChunks) {
  return db.update(transfers).set({ uploadedChunks, updatedAt: new Date().toISOString() }).where(eq(transfers.id, id));
}

function markComplete(id) {
  return db
    .update(transfers)
    .set({ status: "complete", resumeData: null, uploadedChunks: null, updatedAt: new Date().toISOString() })
    .where(eq(transfers.id, id));
}

function markFailed(id, retryCount) {
  return db
    .update(transfers)
    .set({ status: "failed", retryCount, updatedAt: new Date().toISOString() })
    .where(eq(transfers.id, id));
}

function clearCompleted() {
  return db.delete(transfers).where(eq(transfers.status, "complete"));
}

const transfersRepository = {
  upsertTransfer,
  getByStatus,
  getById,
  updateProgress,
  updateUploadChunks,
  markComplete,
  markFailed,
  clearCompleted,
};

export default transfersRepository;
