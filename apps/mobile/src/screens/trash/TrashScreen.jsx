import React, { useState } from "react";
import { SectionList, View } from "react-native";
import { Folder, File, RotateCcw, Trash2, TriangleAlert } from "lucide-react-native";

// Rtk
import {
  useGetTrashQuery,
  useRestoreItemsMutation,
  usePermanentlyDeleteItemsMutation,
  useEmptyTrashMutation,
} from "@api/trashApi";

// Utils
import { NumberUtils } from "@shared-utils/utils";

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
import DrawerMenuButton from "@components/ui/glass/DrawerMenuButton";

function SectionHeader({ title }) {
  return (
    <Text size="xs" className="text-secondary uppercase tracking-widest px-4 pt-4 pb-1 font-semibold">
      {title}
    </Text>
  );
}

function formatDeletedDate(ts) {
  if (!ts) return null;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(ts));
}

function TrashItemRow({ item = {}, onRestore = () => {}, onDelete = () => {} }) {
  const { colors } = useTheme();
  const isFolder = item.type === "folder";
  const deletedAt = formatDeletedDate(item.deleted_at ?? item.deletedAt);
  const meta = [item.size > 0 ? NumberUtils.formatBytes(item.size) : null, deletedAt ? `Deleted ${deletedAt}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <GlassCard className="mx-4 my-1">
      <View className="flex-row items-center gap-3">
        <View
          className={`w-10 h-10 rounded-xl items-center justify-center ${isFolder ? "bg-primary/10" : "bg-neutral/10"}`}
        >
          {isFolder ? (
            <Folder size={20} color={colors.primary.DEFAULT} />
          ) : (
            <File size={20} color={colors.neutral.DEFAULT} />
          )}
        </View>
        <View className="flex-1">
          <Text size="sm" bold numberOfLines={1}>
            {item.name}
          </Text>
          {meta.length > 0 ? (
            <Text size="xs" className="text-secondary">
              {meta}
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

export default function TrashScreen({ navigation = {} }) {
  const { colors } = useTheme();
  const { data, isLoading, isFetching, refetch } = useGetTrashQuery();
  const [restoreItems] = useRestoreItemsMutation();
  const [permanentlyDelete] = usePermanentlyDeleteItemsMutation();
  const [emptyTrash, { isLoading: isEmptying }] = useEmptyTrashMutation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const folders = data?.folders ?? [];
  const files = data?.files ?? [];
  const sections = [
    ...(folders.length > 0 ? [{ title: "Folders", data: folders }] : []),
    ...(files.length > 0 ? [{ title: "Files", data: files }] : []),
  ];
  const isEmpty = folders.length === 0 && files.length === 0;

  async function handleConfirmEmpty() {
    try {
      await emptyTrash().unwrap();
    } finally {
      setConfirmOpen(false);
    }
  }

  async function handleConfirmDeleteItem() {
    const target = itemToDelete;
    setItemToDelete(null);
    if (target) {
      await permanentlyDelete({ items: [{ id: target.id, type: target.type }] });
    }
  }

  const totalItems = folders.length + files.length;

  const emptyAllButton =
    totalItems > 0 ? (
      <Button variant="destructive" size="sm" onPress={() => setConfirmOpen(true)} disabled={isEmptying}>
        {isEmptying ? <ButtonSpinner /> : null}
        <ButtonText>Empty Trash</ButtonText>
      </Button>
    ) : null;

  return (
    <ScreenLayout>
      <GlassHeader
        titleElement={
          <View className="flex-1">
            <Text size="xl" bold className="text-danger-light">
              Trash
            </Text>
            {totalItems > 0 ? (
              <Text size="xs" className="text-secondary">
                {totalItems} item{totalItems === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
        }
        left={<DrawerMenuButton navigation={navigation} />}
        right={emptyAllButton}
        accentColor={colors.danger.DEFAULT}
      />

      {totalItems > 0 ? (
        <View className="flex-row items-center gap-2.5 mx-4 mt-3 px-3.5 py-2.5 rounded-xl border bg-warning/10 border-warning/20">
          <TriangleAlert size={16} color={colors.warning.DEFAULT} />
          <Text size="xs" className="flex-1 text-warning-light">
            Items are permanently deleted after 30 days
          </Text>
        </View>
      ) : null}

      <Skeleton loading={isLoading}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrashItemRow
              item={item}
              onRestore={() => restoreItems({ items: [{ id: item.id, type: item.type }] })}
              onDelete={() => setItemToDelete(item)}
            />
          )}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          contentContainerClassName="pb-2"
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={!isLoading && isEmpty ? <EmptyState message="Trash is empty" /> : null}
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
        confirmDisabled={isEmptying}
        confirmLoading={isEmptying}
      >
        <Text size="sm" className="text-secondary">
          All items will be permanently deleted. This cannot be undone.
        </Text>
      </Dialog>

      <Dialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Delete permanently"
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleConfirmDeleteItem}
        confirmLabel="Delete"
        confirmVariant="destructive"
      >
        <Text size="sm" className="text-secondary">
          {`Permanently delete "${itemToDelete?.name ?? ""}"? This cannot be undone.`}
        </Text>
      </Dialog>
    </ScreenLayout>
  );
}
