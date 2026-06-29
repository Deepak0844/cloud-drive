import uuid from "react-native-uuid";

// Db
import transfersRepository from "@db/repositories/transfersRepository";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";

async function drainQueue() {
  const pending = (await transfersRepository.getByStatus(["pending", "paused"])).filter((r) => r.type === "upload");
  for (const row of pending) {
    try {
      await backgroundTransfer.upload(row.id, row.dest, row.name, row.mimeType);
    } catch {
      const next = (row.retryCount ?? 0) + 1;
      await transfersRepository.markFailed(row.id, next);
    }
  }
}

async function enqueue(localUri, fileName, mimeType) {
  const transferId = uuid.v4();
  await transfersRepository.upsertTransfer({
    id: transferId,
    fileId: transferId,
    type: "upload",
    status: "pending",
    name: fileName,
    dest: localUri,
    mimeType,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await drainQueue();
}

const uploadQueue = { enqueue, drainQueue };

export default uploadQueue;
