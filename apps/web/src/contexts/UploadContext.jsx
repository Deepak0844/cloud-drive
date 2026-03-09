import React, { createContext, useContext, useState, useCallback } from "react";

// Services
import { useInitChunkedUploadMutation } from "@services/api/fileApi";

const CHUNK_SIZE = 10 * 1000 * 1000; // 10 MB
const UploadContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useUploadDetails() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUploadDetails must be used within an UploadProvider");
  }
  return context;
}

export function UploadProvider({ children }) {
  const [uploads, setUploads] = useState([]);
  const [initChunkedUpload] = useInitChunkedUploadMutation();

  const addUpload = useCallback(
    (file, folderId) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // For large files, pre-fire the init API using the standard mutation hook
      let initPromise = Promise.resolve(null);
      if (file.size > CHUNK_SIZE) {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const body = {
          fileName: file.name,
          fileSize: file.size,
          totalChunks,
          folderId: folderId || null,
        };

        // Mutation triggers return a promise with an .unwrap() method
        initPromise = initChunkedUpload(body).unwrap();
      }

      setUploads((prev) => [...prev, { id, file, folderId, initPromise }]);
    },
    [initChunkedUpload]
  );

  const removeUpload = useCallback((id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return <UploadContext.Provider value={{ uploads, addUpload, removeUpload }}>{children}</UploadContext.Provider>;
}
