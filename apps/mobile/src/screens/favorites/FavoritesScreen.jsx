import React from "react";
import { View, FlatList } from "react-native";

// Rtk
import { useGetFilesQuery } from "@api/fileApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import DrawerMenuButton from "@components/ui/glass/DrawerMenuButton";
import FileListItem from "@screens/files/components/FileListItem";

export default function FavoritesScreen({ navigation = {} }) {
  const { colors } = useTheme();
  const { data, isLoading, isFetching, refetch } = useGetFilesQuery({ isFavorite: true });

  return (
    <ScreenLayout>
      <GlassHeader
        title="Favourites"
        left={<DrawerMenuButton navigation={navigation} />}
        accentColor={colors.warning.DEFAULT}
      />

      <Skeleton loading={isLoading}>
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4 mt-3">
              <FileListItem
                item={item}
                onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { file: item })}
                onLongPress={() => {}}
              />
            </View>
          )}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          ItemSeparatorComponent={() => <View className="h-2" />}
          ListEmptyComponent={isLoading ? null : <EmptyState message="No favourites yet" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
