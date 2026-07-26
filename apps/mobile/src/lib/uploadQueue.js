import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import uuid from "react-native-uuid";

// Db
import transfersRepository from "@db/repositories/transfersRepository";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";

// Single-flight guard: only one drain loop runs at a time. A trigger arriving mid-drain records that
// another pass is needed via drainRequested rather than being dropped.
let isDraining = false;
let drainRequested = false;

async function drainQueue() {
  if (isDraining) {
    // Record the request instead of no-op'ing: closes the window where a row committed just as the
    // loop's final empty query returned would otherwise wait for a later trigger (the "stranded at
    // 0%" TOCTOU). The outer do/while re-runs for it.
    drainRequested = true;
    return;
  }
  isDraining = true;
  try {
    do {
      drainRequested = false;
      // Re-query the next pending row after every upload rather than snapshotting once: the native
      // engine is single-slot, so a file enqueued mid-flight is rejected "busy" and reset to
      // "pending", and without this loop nothing would retry it (the "second upload stuck at 0%"
      // bug). "paused" is excluded — draining it would silently auto-resume and defeat the Pause
      // button. Oldest-first (createdAt) so the queue is FIFO in selection order.
      // eslint-disable-next-line no-constant-condition -- intentional loop, exited via the break below
      while (true) {
        const [row] = (await transfersRepository.getByStatus(["pending"]))
          .filter((r) => r.type === "upload")
          .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
        if (!row) break;

        try {
          await backgroundTransfer.upload(row.id, row.dest, row.name, row.mimeType);
        } catch {
          const next = (row.retryCount ?? 0) + 1;
          await transfersRepository.markFailed(row.id, next);
          await Notifications.scheduleNotificationAsync({
            content: { title: "Upload failed", body: row.name },
            trigger: null,
          });
          continue;
        }

        // A row still "pending" after upload() returned means the engine was busy with a different
        // transfer — every other outcome moves it off "pending". Break and let the next trigger
        // resume rather than spinning on the same row.
        const [after] = await transfersRepository.getById(row.id);
        if (after?.status === "pending") break;
      }
    } while (drainRequested);
  } finally {
    isDraining = false;
  }
}

// Strictly-increasing createdAt across enqueues, so files added within the same millisecond (a
// multi-select batch) still sort in insertion order — plain Date.now() would tie and break the
// FIFO drain sort. Only createdAt uses this; updatedAt keeps the plain wall-clock value.
let lastCreatedAtMs = 0;
function nextCreatedAt() {
  lastCreatedAtMs = Math.max(Date.now(), lastCreatedAtMs + 1);
  return new Date(lastCreatedAtMs).toISOString();
}

async function enqueue(localUri, fileName, mimeType, folderId = null) {
  const transferId = uuid.v4();

  // Picker libraries hand back a file under Caches — an OS-purgeable directory a paused upload can
  // outlive, silently breaking Resume. Copying into documentDirectory up front makes the source as
  // durable as the transfer row; the copy is deleted once the upload completes (see upload()).
  const destDir = `${FileSystem.documentDirectory}pending-uploads/${transferId}`;
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});
  const dest = `${destDir}/${fileName}`;
  await FileSystem.copyAsync({ from: localUri, to: dest });

  await transfersRepository.upsertTransfer({
    id: transferId,
    fileId: transferId,
    type: "upload",
    status: "pending",
    name: fileName,
    dest,
    mimeType,
    folderId,
    createdAt: nextCreatedAt(),
    updatedAt: new Date().toISOString(),
  });

  // Fire-and-forget: kick the drain without awaiting, so a multi-select batch inserts every row
  // promptly instead of blocking each enqueue on the previous upload. drainQueue is single-flight.
  drainQueue().catch(() => {});
}

const uploadQueue = { enqueue, drainQueue };

export default uploadQueue;
