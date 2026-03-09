import { useRef } from "react";
import { ItemTypes } from "@shared-constants/constants";

export function useUploadHandler({ addUpload, currentFolderId, handleDragEnter, handleDragLeave, handleDrop }) {
  const uploadRef = useRef(null);

  function handleUploadClick() {
    if (uploadRef.current) {
      const uploadInput = uploadRef.current.querySelector('input[type="file"]');
      if (uploadInput) uploadInput.click();
    }
  }

  const uploadProps = {
    name: ItemTypes.FILE,
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      // By returning false, we completely disable Antd's default XHR POST
      // and natively pipe the individual file directly into our Custom Upload Context
      addUpload(file, currentFolderId === "root" ? null : currentFolderId);
      return false;
    },
    openFileDialogOnClick: false,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  return { uploadRef, handleUploadClick, uploadProps };
}
