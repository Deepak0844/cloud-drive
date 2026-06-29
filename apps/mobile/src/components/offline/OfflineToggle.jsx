import React from "react";
import { CloudDownload, CloudCheck } from "lucide-react-native";

// Hooks
import { useTheme } from "@theme/useTheme";
import { useOfflineFiles } from "@hooks/useOfflineFiles";

// Components
import IconButton from "@components/ui/icon-button/IconButton";

export default function OfflineToggle({ file = null }) {
  const { colors } = useTheme();
  const { markOffline, removeOffline } = useOfflineFiles();

  if (!file) return null;

  if (file.isOffline) {
    return (
      <IconButton
        icon={<CloudCheck size={20} color={colors.primary.DEFAULT} />}
        onPress={() => removeOffline(file.id)}
      />
    );
  }

  return (
    <IconButton icon={<CloudDownload size={20} color={colors.neutral.DEFAULT} />} onPress={() => markOffline(file)} />
  );
}
