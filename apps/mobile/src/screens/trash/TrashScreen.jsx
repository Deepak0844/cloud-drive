import React, { useState } from "react";
import { View, FlatList } from "react-native";
import { RotateCcw, Trash2 } from "lucide-react-native";

// Rtk
import {
  useGetTrashQuery,
  useRestoreItemsMutation,
  usePermanentlyDeleteItemsMutation,
  useEmptyTrashMutation,
} from "@api/trashApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";
import Button, { ButtonText, ButtonSpinner } from "@components/ui/button/Button";
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";

function TrashItemRow({ item = {}, onRestore = () => {}, onDelete = () => {} }) {
  const { colors } = useTheme();
  return (
    <GlassCard className="mx-4 my-1">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1">
          <Text size="sm" bold numberOfLines={1}>
            {item.name}
          </Text>
          {item.size > 0 ? (
            <Text size="xs" className="text-secondary">
              {formatBytes(item.size)}
            </Text>
          ) : null}
        </View>
        <View className="flex-row gap-1">
          <IconButton
            icon={<RotateCcw size={16} color={colors.success.DEFAULT} />}
            onPress={onRestore}
            variant="ghost"
            size="sm"
          />
          <IconButton
            icon={<Trash2 size={16} color={colors.danger.DEFAULT} />}
            onPress={onDelete}
            variant="ghost"
            size="sm"
          />
        </View>
      </View>
    </GlassCard>
  );
}

export default function TrashScreen() {
  const { data, isLoading, isFetching, refetch } = useGetTrashQuery();
  const [restoreItems] = useRestoreItemsMutation();
  const [permanentlyDelete] = usePermanentlyDeleteItemsMutation();
  const [emptyTrash, { isLoading: isEmptying }] = useEmptyTrashMutation();

  const [emptyingAll, setEmptyingAll] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirmEmpty() {
    setEmptyingAll(true);
    try {
      await emptyTrash().unwrap();
    } finally {
      setEmptyingAll(false);
      setConfirmOpen(false);
    }
  }

  const emptyAllButton = (
    <Button variant="destructive" size="sm" onPress={() => setConfirmOpen(true)} disabled={isEmptying || emptyingAll}>
      {emptyingAll ? <ButtonSpinner /> : null}
      <ButtonText>Empty All</ButtonText>
    </Button>
  );

  return (
    <ScreenLayout>
      <GlassHeader title="Trash" rightSlot={emptyAllButton} />

      <Skeleton loading={isLoading}>
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item._id ?? item.id}
          renderItem={({ item }) => (
            <TrashItemRow
              item={item}
              onRestore={() => restoreItems({ items: [{ id: item._id ?? item.id, type: item.type }] })}
              onDelete={() => permanentlyDelete({ items: [{ id: item._id ?? item.id, type: item.type }] })}
            />
          )}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          contentContainerClassName="py-2"
          ListEmptyComponent={isLoading ? null : <EmptyState message="Trash is empty" />}
        />
      </Skeleton>

      <Dialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Empty Trash"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmEmpty}
        confirmLabel="Delete All"
        confirmVariant="destructive"
        confirmDisabled={emptyingAll}
        confirmLoading={emptyingAll}
      >
        <Text size="sm" className="text-secondary">
          All items will be permanently deleted. This cannot be undone.
        </Text>
      </Dialog>
    </ScreenLayout>
  );
}
