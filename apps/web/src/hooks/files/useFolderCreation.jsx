import { useState } from "react";
import { toast } from "sonner";
import { useCreateFolderMutation } from "@services/api/folderApi";
import { ROOT_FOLDER_ID } from "@constants/serviceUrls";

export function useFolderCreation({ currentFolderId }) {
  const [createFolder] = useCreateFolderMutation();
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  function handleCreateFolderClick() {
    setNewFolderName("");
    setIsFolderModalOpen(true);
  }

  async function handleCreateFolderConfirm() {
    const name = newFolderName.trim();
    if (!name) return;

    try {
      await createFolder({
        name,
        parent: currentFolderId === ROOT_FOLDER_ID ? null : currentFolderId,
      }).unwrap();
      toast.success("Folder created");
      setIsFolderModalOpen(false);
    } catch (err) {
      toast.error(err.data?.message || "Failed to create folder");
    }
  }

  return {
    isFolderModalOpen,
    setIsFolderModalOpen,
    newFolderName,
    setNewFolderName,
    handleCreateFolderClick,
    handleCreateFolderConfirm,
  };
}
