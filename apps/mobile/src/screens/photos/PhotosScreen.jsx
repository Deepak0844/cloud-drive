import React from "react";
import { FlatList } from "react-native";

// Api
import { useGetFilesQuery } from "@api/fileApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Hooks
import { useResponsive } from "@hooks/useResponsive";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import FileGrid from "./components/FileGrid";

export default function PhotosScreen({ navigation = {} }) {
  const { columns } = useResponsive();
  const { data, isLoading, isFetching, refetch } = useGetFilesQuery({ category: "image", recursive: true });

  return (
    <ScreenLayout>
      <GlassHeader title="Photos" />

      <Skeleton loading={isLoading}>
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          key={columns}
          renderItem={({ item }) => (
            <FileGrid file={item} onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: item.id })} />
          )}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ padding: 1 }}
          ListEmptyComponent={isLoading ? null : <EmptyState message="No photos yet" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
