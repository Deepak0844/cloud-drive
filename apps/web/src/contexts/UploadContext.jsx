import PropTypes from "prop-types";
import React, { createContext, useContext, useState, useCallback } from "react";
import { useDispatch } from "react-redux";

// Constants
import { UPLOAD_CHUNK_SIZE } from "@shared-constants/constants";
import { DEFAULT_CHUNK_SIZE } from "@constants/uiConstants";

// Services
import { useInitChunkedUploadMutation, fileApi } from "@services/api/fileApi";

// Utils
import UploadSessionStore from "@utils/uploadSessionStore";

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
  const dispatch = useDispatch();
  const [initChunkedUpload] = useInitChunkedUploadMutation();

  const addUpload = useCallback(
    (file, folderId) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const safeChunkSize = UPLOAD_CHUNK_SIZE || DEFAULT_CHUNK_SIZE;

      let initPromise = Promise.resolve(null);
      let fingerprint = null;

      if (file.size > safeChunkSize) {
        fingerprint = UploadSessionStore.getFileFingerprint(file);
        const totalChunks = Math.ceil(file.size / safeChunkSize);
        const savedSession = UploadSessionStore.loadUploadSession(fingerprint);

        if (savedSession) {
          // An interrupted session exists locally — verify the server still holds the chunks
          const fp = fingerprint; // capture for async closure
          initPromise = (async () => {
            try {
              const responseBody = await dispatch(
                fileApi.endpoints.getChunkUploadStatus.initiate(savedSession.uploadId, { forceRefetch: true })
              ).unwrap();
              const status = responseBody;
              // Only resume if server session totalChunks still matches what we saved
              if (status && status.totalChunks === savedSession.totalChunks) {
                return {
                  __resume: true,
                  uploadId: status.uploadId,
                  totalChunks: status.totalChunks,
                  uploadedChunks: status.uploadedChunks,
                };
              }
            } catch {
              // Server returned 404 or network error — session expired or gone, fall through
            }
            // Session expired on server: clear stale local record and start fresh
            UploadSessionStore.clearUploadSession(fp);
            const body = { fileName: file.name, fileSize: file.size, totalChunks, folderId: folderId || null };
            const data = await initChunkedUpload(body).unwrap();
            const { uploadId, totalChunks: tc } = data || {};
            if (uploadId) {
              UploadSessionStore.saveUploadSession(fp, {
                uploadId,
                totalChunks: tc,
                fileName: file.name,
                fileSize: file.size,
                folderId: folderId || null,
              });
            }
            return data;
          })();
        } else {
          // No saved session — kick off a fresh init and save it for future resume
          const fp = fingerprint;
          const body = { fileName: file.name, fileSize: file.size, totalChunks, folderId: folderId || null };
          initPromise = initChunkedUpload(body)
            .unwrap()
            .then((data) => {
              const { uploadId, totalChunks: tc } = data || {};
              if (uploadId) {
                UploadSessionStore.saveUploadSession(fp, {
                  uploadId,
                  totalChunks: tc,
                  fileName: file.name,
                  fileSize: file.size,
                  folderId: folderId || null,
                });
              }
              return data;
            });
        }
      }

      setUploads((prev) => [...prev, { id, file, folderId, initPromise, fingerprint }]);
    },
    [dispatch, initChunkedUpload]
  );

  const removeUpload = useCallback((id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  return <UploadContext.Provider value={{ uploads, addUpload, removeUpload }}>{children}</UploadContext.Provider>;
}

UploadProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
