import React from "react";
import { View, FlatList } from "react-native";

// Constants
import { AppScreens } from "@constants/appScreens";

// Rtk
import { useGetFilesQuery } from "@api/fileApi";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";

// Sections
import FileListItem from "@screens/files/components/FileListItem";

export default function FavoritesScreen({ navigation = {} }) {
  const { data, isLoading, isFetching, refetch } = useGetFilesQuery({ isFavorite: true });

  return (
    <ScreenLayout>
      <GlassHeader title="Favourites" />

      <Skeleton loading={isLoading}>
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FileListItem
              item={item}
              onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: item.id })}
              onLongPress={() => {}}
            />
          )}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          ItemSeparatorComponent={() => <View className="h-px bg-border mx-4" />}
          ListEmptyComponent={isLoading ? null : <EmptyState message="No favourites yet" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
