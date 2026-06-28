import React from "react";
import { FlatList, Image, Pressable, useWindowDimensions } from "react-native";

// Rtk
import { useGetFilesQuery } from "@api/fileApi";

// Theme
import { useTheme } from "@theme/useTheme";

// Constants
import { AppScreens } from "@constants/appScreens";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";

const NUM_COLUMNS = 3;
const GAP = 2;

function PhotoGridCell({ item, cellSize, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ width: cellSize, height: cellSize, margin: GAP / 2 }}
      android_ripple={{ color: colors.ripple.glass }}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={{ width: cellSize, height: cellSize }} resizeMode="cover" />
    </Pressable>
  );
}

export default function PhotosScreen({ navigation = {} }) {
  const { width } = useWindowDimensions();
  const cellSize = Math.floor((width - GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS);

  const { data, isLoading, isFetching, refetch } = useGetFilesQuery({
    category: "image",
    recursive: true,
  });

  return (
    <ScreenLayout>
      <GlassHeader title="Photos" />

      <Skeleton loading={isLoading}>
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          renderItem={({ item }) => (
            <PhotoGridCell
              item={item}
              cellSize={cellSize}
              onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: item.id })}
            />
          )}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ padding: GAP / 2 }}
          ListEmptyComponent={isLoading ? null : <EmptyState message="No photos yet" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
