import transfersRepository from "@db/repositories/transfersRepository";
import uploadQueue from "@lib/uploadQueue";
import backgroundTransfer from "@lib/backgroundTransfer";
import nativeTransfer from "@lib/nativeTransfer";

async function drainUploadQueue() {
  await uploadQueue.drainQueue();
}

/**
 * Reconciles "active" transfer rows against native in-flight state instead of blindly re-invoking —
 * the native engine survives backgrounding, so "active" usually just means still genuinely running.
 * Only a row native confirms it does NOT own gets re-invoked (e.g. the process was killed and the OS
 * restarted fresh). "paused" rows are excluded — auto-resuming them would defeat the Pause button.
 */
async function reconcileActiveTransfers() {
  const activeRows = await transfersRepository.getByStatus(["active"]);
  if (activeRows.length === 0) return;

  const nativeActiveTransferId = await nativeTransfer.getActiveTransferId();

  for (const row of activeRows) {
    if (row.id === nativeActiveTransferId) continue; // still genuinely running, leave it alone
    if (row.type === "upload") {
      backgroundTransfer
        .upload(row.id, row.dest, row.name, row.mimeType)
        .catch(() => transfersRepository.markFailed(row.id, (row.retryCount ?? 0) + 1));
    } else if (row.type === "download") {
      backgroundTransfer
        .download(row.fileId, row.url, row.name)
        .catch(() => transfersRepository.markFailed(row.id, (row.retryCount ?? 0) + 1));
    }
  }
}

async function resumeTransfers() {
  await reconcileActiveTransfers();
  await drainUploadQueue();
}

const syncService = { drainUploadQueue, resumeTransfers };

export default syncService;
