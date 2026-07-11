import React, { useState } from "react";
import { View } from "react-native";
import { FolderInput, Copy, Trash2, Download, X } from "lucide-react-native";
import * as Sharing from "expo-sharing";

// Rtk
import { useBulkDeleteMutation } from "@api/bulkApi";

// Lib
import backgroundTransfer, { MAX_ZIP_ITEMS } from "@lib/backgroundTransfer";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";

/**
 * Floating glass bar shown while selection mode has ≥1 item selected.
 * Move/Copy delegate to the caller (`onRequestMove`/`onRequestCopy`) — the
 * destination picker is owned by `FilesBrowserContent` so only one bottom
 * sheet is ever open at a time.
 *
 * @param {{id: string, type: string}[]} selectedItems
 * @param {(items) => void} onRequestMove
 * @param {(items) => void} onRequestCopy
 * @param {() => void} onDone - called after delete/zip-download completes (clears selection)
 * @param {() => void} onCancel - exit selection mode without acting
 */
export default function BulkActionsBar({
  selectedItems = [],
  onRequestMove = () => {},
  onRequestCopy = () => {},
  onDone = () => {},
  onCancel = () => {},
}) {
  const { colors } = useTheme();
  const [bulkDelete, { isLoading: isDeleting }] = useBulkDeleteMutation();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Zip is buffered in memory on-device — cap the selection.
  const zipDisabled = isZipping || selectedItems.length > MAX_ZIP_ITEMS;

  async function handleDownloadZip() {
    setIsZipping(true);
    try {
      const uri = await backgroundTransfer.downloadZip(selectedItems.map(({ id, type }) => ({ id, type })));
      await Sharing.shareAsync(uri);
      onDone();
    } finally {
      setIsZipping(false);
    }
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    try {
      await bulkDelete({ items: selectedItems.map(({ id, type }) => ({ id, type })) }).unwrap();
    } finally {
      onDone();
    }
  }

  return (
    <>
      <View className="absolute bottom-6 left-4 right-4 flex-row items-center gap-1 px-3 py-2 rounded-2xl bg-glass-modal-bg border border-glass-modal-border">
        <Text size="sm" bold className="flex-1 px-1">
          {selectedItems.length} selected
        </Text>
        <IconButton
          icon={<FolderInput size={18} color={colors.neutral.DEFAULT} />}
          onPress={() => onRequestMove(selectedItems)}
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon={<Copy size={18} color={colors.neutral.DEFAULT} />}
          onPress={() => onRequestCopy(selectedItems)}
          variant="ghost"
          size="sm"
        />
        <IconButton
          icon={<Download size={18} color={colors.neutral.DEFAULT} />}
          onPress={handleDownloadZip}
          variant="ghost"
          size="sm"
          disabled={zipDisabled}
        />
        <IconButton
          icon={<Trash2 size={18} color={colors.danger.DEFAULT} />}
          onPress={() => setShowDeleteConfirm(true)}
          variant="ghost"
          size="sm"
          disabled={isDeleting}
        />
        <IconButton
          icon={<X size={18} color={colors.neutral.DEFAULT} />}
          onPress={onCancel}
          variant="ghost"
          size="sm"
        />
      </View>

      <Dialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="md"
        title="Delete selected"
        contentClassName="bg-surface rounded-2xl p-2"
        footerClassName="gap-3 mt-2"
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        confirmLabel="Delete"
        confirmVariant="destructive"
      >
        <Text size="sm" className="text-secondary">
          {`Delete ${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"}? They move to trash.`}
        </Text>
      </Dialog>
    </>
  );
}
