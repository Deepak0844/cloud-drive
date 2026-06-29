import transfersRepository from "@db/repositories/transfersRepository";
import uploadQueue from "@lib/uploadQueue";
import backgroundTransfer from "@lib/backgroundTransfer";

async function drainUploadQueue() {
  await uploadQueue.drainQueue();
}

async function resumeTransfers() {
  const active = await transfersRepository.getByStatus(["active", "paused"]);
  for (const row of active) {
    if (row.type === "download") {
      backgroundTransfer
        .download(row.fileId, row.url, row.name)
        .catch(() => transfersRepository.markFailed(row.id, (row.retryCount ?? 0) + 1));
    }
  }
  await drainUploadQueue();
}

const syncService = { drainUploadQueue, resumeTransfers };

export default syncService;
