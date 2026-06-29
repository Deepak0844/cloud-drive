import React, { useState, useEffect } from "react";
import { FlatList } from "react-native";
import { useSelector } from "react-redux";

// Rtk
import { useGetFolderContentsQuery } from "@api/folderApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Db
import itemsRepository from "@db/repositories/itemsRepository";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import OfflineBanner from "@components/offline/OfflineBanner";
import FileListItem from "./components/FileListItem";
import FolderListItem from "./components/FolderListItem";
import FileActionSheet from "./components/FileActionSheet";
import UploadFab from "./components/UploadFab";
import UploadProgressSheet from "./components/UploadProgressSheet";

export default function FolderScreen({ navigation = {}, route = {} }) {
  const { folderId, folderName = "Folder" } = route.params ?? {};
  const isOnline = useSelector((s) => s.offline.isOnline);
  const { data, isLoading, isFetching, refetch } = useGetFolderContentsQuery({ id: folderId });
  const [selectedFile, setSelectedFile] = useState(null);
  const [offlineItems, setOfflineItems] = useState([]);

  useEffect(() => {
    if (!isOnline) {
      itemsRepository.queryItems(folderId).then(setOfflineItems);
    }
  }, [isOnline, folderId]);

  const displayItems = isOnline ? (data?.items ?? []) : offlineItems;

  function renderItem({ item }) {
    if (item.type === "folder") {
      return (
        <FolderListItem
          item={item}
          onPress={() => navigation.push(AppScreens.FOLDER, { folderId: item.id, folderName: item.name })}
        />
      );
    }
    return (
      <FileListItem
        item={item}
        onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: item.id })}
        onLongPress={() => setSelectedFile(item)}
      />
    );
  }

  return (
    <ScreenLayout>
      <GlassHeader title={folderName} onBack={() => navigation.goBack()} />
      <OfflineBanner />

      <Skeleton loading={isOnline && isLoading}>
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={isOnline && isFetching && !isLoading}
          onRefresh={isOnline ? refetch : undefined}
          contentContainerClassName="py-2 gap-1 px-2"
          ListEmptyComponent={isLoading ? null : <EmptyState message="This folder is empty" />}
        />
      </Skeleton>

      <UploadFab />
      <UploadProgressSheet />

      <GlassBottomSheet visible={!!selectedFile}>
        <FileActionSheet file={selectedFile} onClose={() => setSelectedFile(null)} />
      </GlassBottomSheet>
    </ScreenLayout>
  );
}
