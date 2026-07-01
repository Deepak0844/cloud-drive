import React, { useState, useEffect } from "react";
import { View, ScrollView, FlatList, TextInput } from "react-native";
import { useSelector } from "react-redux";
import { Search } from "lucide-react-native";

// Rtk
import { useGetFolderContentsQuery, useRenameFolderMutation } from "@api/folderApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Db
import itemsRepository from "@db/repositories/itemsRepository";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import OfflineBanner from "@components/offline/OfflineBanner";
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";
import Button, { ButtonSpinner, ButtonText } from "@components/ui/button/Button";
import { Dialog } from "@components/ui/alert-dialog/AlertDialog";
import FileListItem from "./components/FileListItem";
import FolderListItem from "./components/FolderListItem";
import FileActionSheet from "./components/FileActionSheet";
import UploadFab from "./components/UploadFab";
import UploadProgressSheet from "./components/UploadProgressSheet";

function SectionHeader({ title }) {
  return (
    <Text size="xs" className="text-secondary uppercase tracking-widest px-4 pt-4 pb-1 font-semibold">
      {title}
    </Text>
  );
}

function FolderActionSheet({ folder = null, onClose = () => {} }) {
  const [renameFolder, { isLoading: isRenaming }] = useRenameFolderMutation();
  const [showRenamePrompt, setShowRenamePrompt] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const { colors } = useTheme();

  if (!folder) return null;

  async function handleRenameConfirm() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      await renameFolder({ id: folder.id, name: trimmed });
    }
    setShowRenamePrompt(false);
    onClose();
  }

  return (
    <>
      <View className="p-4 gap-2">
        <Text size="sm" bold className="text-secondary mb-2 px-1">
          {folder.name}
        </Text>
        <Button
          variant="ghost"
          onPress={() => {
            setRenameValue(folder.name);
            setShowRenamePrompt(true);
          }}
          disabled={isRenaming}
        >
          {isRenaming ? <ButtonSpinner /> : null}
          <ButtonText>Rename</ButtonText>
        </Button>
      </View>

      <Dialog
        isOpen={showRenamePrompt}
        onClose={() => setShowRenamePrompt(false)}
        size="md"
        title="Rename folder"
        contentClassName="bg-surface-card rounded-2xl p-2"
        footerClassName="gap-3 mt-2"
        onCancel={() => setShowRenamePrompt(false)}
        onConfirm={handleRenameConfirm}
        confirmLabel="Save"
      >
        <TextInput
          value={renameValue}
          onChangeText={setRenameValue}
          selectTextOnFocus
          style={{
            borderWidth: 1,
            borderColor: colors.surface.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.neutral.DEFAULT,
            fontSize: 14,
          }}
        />
      </Dialog>
    </>
  );
}

export default function MyFilesScreen({ navigation = {} }) {
  const isOnline = useSelector((s) => s.offline.isOnline);
  const { data, isLoading, isFetching, refetch } = useGetFolderContentsQuery({ id: "root" });
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [offlineItems, setOfflineItems] = useState([]);
  const { colors } = useTheme();

  useEffect(() => {
    if (!isOnline) {
      itemsRepository.queryItems("root").then(setOfflineItems);
    }
  }, [isOnline]);

  const displayItems = isOnline ? (data?.items ?? []) : offlineItems;
  const folders = displayItems.filter((i) => i.type === "folder");
  const files = displayItems.filter((i) => i.type !== "folder");

  const headerRight = (
    <IconButton
      icon={<Search size={20} color={colors.neutral.DEFAULT} />}
      onPress={() => navigation.navigate(AppScreens.SEARCH)}
      variant="ghost"
      size="sm"
    />
  );

  return (
    <ScreenLayout>
      <GlassHeader title="My Files" right={headerRight} accentColor={colors.primary.DEFAULT} />
      <OfflineBanner />

      <Skeleton loading={isOnline && isLoading}>
        <ScrollView className="flex-1" contentContainerClassName="pb-4">
          {folders.length > 0 && (
            <>
              <SectionHeader title="Folders" />
              <FlatList
                data={folders}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FolderListItem
                    item={item}
                    onPress={() => navigation.navigate(AppScreens.FOLDER, { folderId: item.id, folderName: item.name })}
                    onLongPress={() => setSelectedFolder(item)}
                  />
                )}
                contentContainerClassName="gap-1 px-2"
              />
            </>
          )}

          {files.length > 0 && (
            <>
              <SectionHeader title="Files" />
              <FlatList
                data={files}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FileListItem
                    item={item}
                    onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: item.id })}
                    onLongPress={() => setSelectedFile(item)}
                  />
                )}
                refreshing={isOnline && isFetching && !isLoading}
                onRefresh={isOnline ? refetch : undefined}
                contentContainerClassName="gap-1 px-2"
              />
            </>
          )}

          {folders.length === 0 && files.length === 0 && !isLoading && <EmptyState message="No files yet" />}
        </ScrollView>
      </Skeleton>

      <UploadFab />
      <UploadProgressSheet />

      <GlassBottomSheet visible={!!selectedFile}>
        <FileActionSheet file={selectedFile} onClose={() => setSelectedFile(null)} />
      </GlassBottomSheet>

      <GlassBottomSheet visible={!!selectedFolder}>
        <FolderActionSheet folder={selectedFolder} onClose={() => setSelectedFolder(null)} />
      </GlassBottomSheet>
    </ScreenLayout>
  );
}
