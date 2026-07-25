import { useState, useEffect, useCallback } from "react";

// Db
import transfersRepository from "@db/repositories/transfersRepository";

// Hooks
import { useAppStateActive } from "@hooks/useAppStateActive";

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

  // The native engine emits an event on every state change on both platforms, so drive the badge
  // reactively off those events rather than polling.
  useEffect(() => {
    refreshStatus();
    return nativeTransfer.addTransferListener(refreshStatus);
  }, [refreshStatus]);

  // Events fired while backgrounded are missed (JS suspended), so re-count on foreground too.
  useAppStateActive(refreshStatus);

  const enqueue = useCallback(
    async (localUri, fileName, mimeType, folderId = null) => {
      await uploadQueue.enqueue(localUri, fileName, mimeType, folderId);
      refreshStatus();
    },
    [refreshStatus]
  );

  return { enqueue, queueStatus };
}
