// React core & third-party libraries
import { toast } from "sonner";

// Services (RTK Query hooks)
import { useToggleFileFavoriteMutation } from "@services/api/fileApi";
import { useToggleFolderFavoriteMutation } from "@services/api/folderApi";

export function useFavoriteActions() {
  const [toggleFileFavorite, { isLoading: isFileFavoriting }] = useToggleFileFavoriteMutation();
  const [toggleFolderFavorite, { isLoading: isFolderFavoriting }] = useToggleFolderFavoriteMutation();

  async function handleToggleFileFavorite({ id }) {
    try {
      await toggleFileFavorite({ id }).unwrap();
    } catch {
      toast.error("Failed to update favorite");
    }
  }

  async function handleToggleFolderFavorite({ id }) {
    try {
      await toggleFolderFavorite({ id }).unwrap();
    } catch {
      toast.error("Failed to update favorite");
    }
  }

  return {
    handleToggleFileFavorite,
    handleToggleFolderFavorite,
    isFileFavoriting,
    isFolderFavoriting,
  };
}
