import { App, Input, Modal } from "antd";
import { useCreateFolderMutation } from "@services/api/folderApi";

export function useFolderCreation({ currentFolderId }) {
  const { message } = App.useApp();
  const [createFolder] = useCreateFolderMutation();

  function handleCreateFolder() {
    Modal.confirm({
      title: "New Folder",
      content: (
        <Input
          id="new-folder-name"
          placeholder="Folder name"
          className="rounded-xl h-10 mt-2"
          onPressEnter={() => {}}
        />
      ),
      onOk: async () => {
        const input = document.getElementById("new-folder-name");
        const name = input?.value?.trim();
        if (!name) return;

        try {
          await createFolder({
            name,
            parent: currentFolderId === "root" ? null : currentFolderId,
          }).unwrap();
          message.success("Folder created");
        } catch (err) {
          message.error(err.data?.message || "Failed to create folder");
        }
      },
      className: "premium-modal",
      centered: true,
      okText: "Create",
    });
  }

  return { handleCreateFolder };
}
