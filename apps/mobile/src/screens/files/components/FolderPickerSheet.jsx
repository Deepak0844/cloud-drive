import React, { useState, useMemo } from "react";
import { View, FlatList, Pressable } from "react-native";
import { Folder, ChevronLeft, ChevronRight, House } from "lucide-react-native";

// Rtk
import { useGetFoldersQuery } from "@api/folderApi";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";
import Button, { ButtonSpinner, ButtonText } from "@components/ui/button/Button";

function parentIdOf(folder) {
  const parent = folder.parentId ?? folder.parent ?? null;
  if (!parent) return null;
  return String(parent._id ?? parent);
}

/**
 * Destination picker content for move/copy. Drills down the folder tree from
 * root; confirming picks the folder currently being viewed (null = root).
 * Plain content — the caller supplies the bottom-sheet chrome.
 *
 * @param {string}   confirmLabel  - e.g. "Move here" / "Copy here"
 * @param {string[]} excludedIds   - folders that cannot be picked or entered
 *                                   (the item(s) being moved and, transitively, their subtree)
 * @param {(folderId: string|null) => void} onConfirm
 * @param {() => void} onClose
 * @param {boolean}  isLoading     - confirm in flight
 */
export default function FolderPickerSheet({
  confirmLabel = "Move here",
  excludedIds = [],
  onConfirm = () => {},
  onClose = () => {},
  isLoading = false,
}) {
  const { colors } = useTheme();
  const { data } = useGetFoldersQuery();
  // Path of {id, name} from root down to the current level; empty = root.
  const [path, setPath] = useState([]);

  const allFolders = useMemo(() => data?.items ?? [], [data]);

  // Exclude the moved folder's whole subtree so a folder can't be moved into itself.
  const blockedIds = useMemo(() => {
    const blocked = new Set(excludedIds.map(String));
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of allFolders) {
        const pid = parentIdOf(f);
        if (pid && blocked.has(pid) && !blocked.has(f.id)) {
          blocked.add(f.id);
          grew = true;
        }
      }
    }
    return blocked;
  }, [allFolders, excludedIds]);

  const currentId = path.length > 0 ? path[path.length - 1].id : null;
  const children = allFolders.filter((f) => parentIdOf(f) === currentId && !blockedIds.has(f.id));

  return (
    <View className="p-4 gap-3 max-h-[420px]">
      <View className="flex-row items-center gap-2">
        {path.length > 0 ? (
          <IconButton
            icon={<ChevronLeft size={18} color={colors.neutral.DEFAULT} />}
            onPress={() => setPath((prev) => prev.slice(0, -1))}
            variant="ghost"
            size="sm"
          />
        ) : (
          <House size={16} color={colors.neutral.DEFAULT} />
        )}
        <Text size="sm" bold numberOfLines={1} className="flex-1">
          {path.length > 0 ? path[path.length - 1].name : "My Files"}
        </Text>
      </View>

      <FlatList
        data={children}
        keyExtractor={(item) => item.id}
        className="max-h-60"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setPath((prev) => [...prev, { id: item.id, name: item.name }])}
            android_ripple={{ color: colors.ripple.glass }}
            className="flex-row items-center gap-3 py-3 px-2 rounded-xl"
          >
            <Folder size={18} color={colors.primary.DEFAULT} />
            <Text size="sm" className="flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            <ChevronRight size={16} color={colors.neutral.light} />
          </Pressable>
        )}
        ListEmptyComponent={
          <Text size="xs" className="text-secondary text-center py-4">
            No subfolders
          </Text>
        }
      />

      <View className="flex-row gap-2">
        <Button variant="outline" className="flex-1" onPress={onClose} disabled={isLoading}>
          <ButtonText>Cancel</ButtonText>
        </Button>
        <Button className="flex-1" onPress={() => onConfirm(currentId)} disabled={isLoading}>
          {isLoading ? <ButtonSpinner /> : null}
          <ButtonText>{confirmLabel}</ButtonText>
        </Button>
      </View>
    </View>
  );
}
