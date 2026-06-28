import React, { useState } from "react";
import { FlatList, View, Pressable } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";

// Rtk
import { useGetFolderContentsQuery } from "@api/folderApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import FileListItem from "./components/FileListItem";
import FolderListItem from "./components/FolderListItem";
import FileActionSheet from "./components/FileActionSheet";

export default function FolderScreen({ navigation = {}, route = {} }) {
  const { folderId, folderName = "Folder" } = route.params ?? {};
  const { colors } = useTheme();
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
    <SafeAreaView className="flex-1 bg-surface-DEFAULT" edges={["top"]}>
      <View className="flex-row items-center px-2 py-3 border-b border-border gap-1">
        <Pressable
          onPress={() => navigation.goBack()}
          android_ripple={{ color: colors.ripple.DEFAULT }}
          hitSlop={8}
          className="p-2"
        >
          <ChevronLeft size={22} color={colors.neutral.DEFAULT} />
        </Pressable>
        <Text size="2xl" bold numberOfLines={1} className="flex-1">
          {folderName}
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
                This folder is empty
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
