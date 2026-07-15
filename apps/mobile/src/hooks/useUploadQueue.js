import { useState, useEffect, useCallback } from "react";

// Db
import transfersRepository from "@db/repositories/transfersRepository";

// Lib
import uploadQueue from "@lib/uploadQueue";
import nativeTransfer from "@lib/nativeTransfer";

export function useUploadQueue() {
  const [queueStatus, setQueueStatus] = useState({ pending: 0, active: 0, paused: 0 });

  const refreshStatus = useCallback(async () => {
    const rows = await transfersRepository.getByStatus(["pending", "active", "paused"]);
    const uploads = rows.filter((r) => r.type === "upload");
    setQueueStatus({
      pending: uploads.filter((r) => r.status === "pending").length,
      active: uploads.filter((r) => r.status === "active").length,
      paused: uploads.filter((r) => r.status === "paused").length,
    });
  }, []);

  useEffect(() => {
    refreshStatus();

    // Android: native engine emits an event on every state change, so refresh reactively
    // instead of polling. iOS has no native module yet (Phase 4) — falls back to polling.
    if (nativeTransfer.isAndroidNativeAvailable) {
      return nativeTransfer.addTransferListener(refreshStatus);
    }

    const interval = setInterval(refreshStatus, 1500);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const enqueue = useCallback(
    async (localUri, fileName, mimeType, folderId = null) => {
      await uploadQueue.enqueue(localUri, fileName, mimeType, folderId);
      refreshStatus();
    },
    [refreshStatus]
  );

  return { enqueue, queueStatus };
}
