import React, { createContext, useContext, useState, useCallback } from "react";
const CHUNK_SIZE = 10 * 1000 * 1000; // 10 MB
const UploadContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useUploadDetails = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUploadDetails must be used within an UploadProvider");
  }
  return context;
};

import HttpClientFactory from "@utils/httpClientFactory";

/**
 * Fire the init API immediately — before React even renders UploadItem.
 * Returns a promise that resolves to { uploadId, totalChunks }.
 */
async function preInitUpload(file, folderId, chunkSize) {
  const httpClient = HttpClientFactory.getInstance();
  const totalChunks = Math.ceil(file.size / chunkSize);

  const res = await httpClient.post(
    "/api/v1/files/upload/init",
    {},
    {
      fileName: file.name,
      fileSize: file.size,
      totalChunks,
      folderId: folderId || null,
    }
  );

  if (!res?.success) {
    throw new Error(res?.message || "Failed to initialize upload");
  }

  return res.data; // { uploadId, totalChunks }
}

export const UploadProvider = ({ children }) => {
  const [uploads, setUploads] = useState([]);

  const addUpload = useCallback((file, folderId) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // For small files no init needed — just queue normally
    // For large files, pre-fire the init API RIGHT NOW before any React rendering
    const initPromise = file.size > CHUNK_SIZE ? preInitUpload(file, folderId, CHUNK_SIZE) : Promise.resolve(null);

    setUploads((prev) => [...prev, { id, file, folderId, initPromise }]);
  }, []);

  const removeUpload = useCallback((id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return <UploadContext.Provider value={{ uploads, addUpload, removeUpload }}>{children}</UploadContext.Provider>;
};
