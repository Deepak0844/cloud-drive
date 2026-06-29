import React, { useState } from "react";
import { FlatList } from "react-native";

// Rtk
import { useGetFolderContentsQuery } from "@api/folderApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import FileListItem from "./components/FileListItem";
import FolderListItem from "./components/FolderListItem";
import FileActionSheet from "./components/FileActionSheet";
import UploadFab from "./components/UploadFab";
import UploadProgressSheet from "./components/UploadProgressSheet";

export default function FolderScreen({ navigation = {}, route = {} }) {
  const { folderId, folderName = "Folder" } = route.params ?? {};
  const { data, isLoading, isFetching, refetch } = useGetFolderContentsQuery({ id: folderId });
  const [selectedFile, setSelectedFile] = useState(null);

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

      <Skeleton loading={isLoading}>
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
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
