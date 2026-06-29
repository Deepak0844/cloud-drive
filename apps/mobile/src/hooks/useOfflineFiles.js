import { Directory, Paths } from "expo-file-system/next";
import { useCallback } from "react";
import { useDispatch } from "react-redux";

import { ErrorActions } from "@redux-slices/errorSlice";
import itemsRepository from "@db/repositories/itemsRepository";
import backgroundTransfer from "@lib/backgroundTransfer";

export function useOfflineFiles() {
  const dispatch = useDispatch();

  const getMarkedFiles = useCallback(() => itemsRepository.getMarkedFiles(), []);

  const markOffline = useCallback(
    async (file) => {
      try {
        const dir = new Directory(Paths.document, "offline", file.id);
        if (!dir.exists) {
          dir.create({ intermediates: true });
        }
        await backgroundTransfer.download(file.id, file.downloadUrl, file.name);
        await itemsRepository.setOffline(file.id, true);
      } catch {
        dispatch(ErrorActions.setError({ errorInfo: { message: `Failed to save "${file.name}" for offline use` } }));
      }
    },
    [dispatch]
  );

  const removeOffline = useCallback(
    async (id) => {
      try {
        const dir = new Directory(Paths.document, "offline", id);
        if (dir.exists) {
          dir.delete();
        }
        await itemsRepository.setOffline(id, false);
      } catch {
        dispatch(ErrorActions.setError({ errorInfo: { message: "Failed to remove offline file" } }));
      }
    },
    [dispatch]
  );

  return { getMarkedFiles, markOffline, removeOffline };
}
