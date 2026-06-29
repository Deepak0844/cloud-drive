import { useState, useEffect, useCallback } from "react";

// Db
import transfersRepository from "@db/repositories/transfersRepository";
import uploadQueue from "@lib/uploadQueue";

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
    const interval = setInterval(refreshStatus, 1500);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  const enqueue = useCallback(
    async (localUri, fileName, mimeType) => {
      await uploadQueue.enqueue(localUri, fileName, mimeType);
      refreshStatus();
    },
    [refreshStatus]
  );

  return { enqueue, queueStatus };
}
