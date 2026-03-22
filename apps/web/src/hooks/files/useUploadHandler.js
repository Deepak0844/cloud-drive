// React core & third-party libraries
import { useRef, useCallback } from "react";

// Constants
import { ROOT_FOLDER_ID } from "@constants/serviceUrls";

export function useUploadHandler({ addUpload, currentFolderId, handleDragEnter, handleDragLeave, handleDrop }) {
  const uploadInputRef = useRef(null);

  function handleUploadClick() {
    if (uploadInputRef.current) {
      uploadInputRef.current.click();
    }
  }

  function handleFileChange(e) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      addUpload(file, currentFolderId === ROOT_FOLDER_ID ? null : currentFolderId);
    });

    // Clear the input so the same files can be selected again
    e.target.value = null;
  }

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleDrop(e);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        Array.from(files).forEach((file) => {
          addUpload(file, currentFolderId === ROOT_FOLDER_ID ? null : currentFolderId);
        });
      }
    },
    [addUpload, currentFolderId, handleDrop]
  );

  const dropzoneProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onDrop,
  };

  return { uploadInputRef, handleUploadClick, handleFileChange, dropzoneProps };
}
