import * as FileSystem from "expo-file-system/legacy";
import * as Notifications from "expo-notifications";
import uuid from "react-native-uuid";

// Db
import transfersRepository from "@db/repositories/transfersRepository";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";

// Single-flight guard: only one drain loop runs at a time. A trigger (another enqueue, a
// foreground/sync event, the photo-backup listener) that arrives while a drain is in progress
// records that another pass is needed via drainRequested, rather than being dropped.
let isDraining = false;
let drainRequested = false;

async function drainQueue() {
  if (isDraining) {
    // Record the request instead of no-op'ing: closes the window where a row committed just as the
    // loop's final empty getByStatus query returned would otherwise wait for an unrelated later
    // trigger (the "stranded at 0%" TOCTOU). The outer do/while below re-runs for it.
    drainRequested = true;
    return;
  }
  isDraining = true;
  try {
    do {
      drainRequested = false;
      // Re-query the next pending row after every upload rather than snapshotting the list once:
      // the native engine is single-slot, so a file enqueued while an earlier upload is already in
      // flight is rejected as "busy" and reset to "pending" (see backgroundTransfer.js's
      // _uploadViaNative), and without this loop nothing would ever retry it — the "second upload
      // stuck at 0%" bug. "paused" is deliberately excluded — pausing is an explicit user action,
      // and draining it here would silently auto-resume on every trigger, defeating the Pause
      // button. Oldest-first (createdAt) so the queue is FIFO in selection order.
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

        // A row still "pending" after upload() returned means the native engine was busy with a
        // different transfer (e.g. an active download holds the single slot) — every other outcome
        // moves it off "pending" (complete/failed/paused/cancelled). Break and let the next trigger
        // resume, rather than spinning on the same row in a tight loop.
        const [after] = await transfersRepository.getById(row.id);
        if (after?.status === "pending") break;
      }
    } while (drainRequested);
  } finally {
    isDraining = false;
  }
}

// Strictly-increasing createdAt across enqueues, so files added within the same wall-clock
// millisecond (a multi-select batch) still sort in insertion order — Date.now()'s ms precision
// alone ties, and drainQueue's createdAt sort would then not be FIFO. Only the row's createdAt
// uses this; updatedAt keeps the plain wall-clock value.
let lastCreatedAtMs = 0;
function nextCreatedAt() {
  lastCreatedAtMs = Math.max(Date.now(), lastCreatedAtMs + 1);
  return new Date(lastCreatedAtMs).toISOString();
}

async function enqueue(localUri, fileName, mimeType, folderId = null) {
  const transferId = uuid.v4();

  // Picker libraries (expo-image-picker/expo-document-picker) hand back a file under Caches — an
  // OS-purgeable, non-backed-up directory. A paused upload can easily outlive that file (a
  // reinstall, or the OS reclaiming space under pressure), silently breaking Resume with no
  // visible error. Copying into documentDirectory up front makes the source file as durable as
  // the transfer row itself; the copy is deleted once the upload completes (see
  // backgroundTransfer.js's upload()).
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

  // Fire-and-forget: kick the drain but don't await it, so enqueuing several files in a row
  // (multi-select) inserts every row promptly instead of blocking each enqueue on the previous
  // file's full upload. drainQueue is single-flight, so the first call drives the loop and the
  // rest are no-ops.
  drainQueue().catch(() => {});
}

const uploadQueue = { enqueue, drainQueue };

export default uploadQueue;
