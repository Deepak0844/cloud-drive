import React, { useState } from "react";
import { FlatList, View } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { SafeAreaView } from "react-native-safe-area-context";

// Rtk
import { useGetFolderContentsQuery } from "@api/folderApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Components
import Text from "@components/ui/text/Text";
import FileListItem from "./components/FileListItem";
import FolderListItem from "./components/FolderListItem";
import FileActionSheet from "./components/FileActionSheet";

export default function MyFilesScreen({ navigation = {} }) {
  const { data, isLoading, isFetching, refetch } = useGetFolderContentsQuery({ id: "root" });
  const [selectedFile, setSelectedFile] = useState(null);

  function renderItem({ item }) {
    if (item.type === "folder") {
      return (
        <FolderListItem
          item={item}
          onPress={() => navigation.navigate(AppScreens.FOLDER, { folderId: item.id, folderName: item.name })}
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
    <SafeAreaView className="flex-1 bg-surface-DEFAULT" edges={["top"]}>
      <View className="px-4 py-3 border-b border-border">
        <Text size="2xl" bold>
          My Files
        </Text>
      </View>

      <SkeletonPlaceholder enabled={isLoading} borderRadius={4}>
        <FlatList
          data={isLoading ? Array(8).fill({}) : (data?.items ?? [])}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center mt-20">
              <Text size="sm" className="text-secondary">
                No files yet
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View className="h-px bg-border mx-4" />}
        />
      </SkeletonPlaceholder>

      {selectedFile ? (
        <View className="absolute bottom-0 left-0 right-0 bg-surface-card rounded-t-2xl shadow-lg">
          <FileActionSheet file={selectedFile} onClose={() => setSelectedFile(null)} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
