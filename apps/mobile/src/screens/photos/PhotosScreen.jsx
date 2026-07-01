import React from "react";
import { SectionList, View } from "react-native";

// Rtk
import { useGetFilesQuery } from "@api/fileApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Hooks
import { useResponsive } from "@hooks/useResponsive";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import Text from "@components/ui/text/Text";
import FileGrid from "./components/FileGrid";

function SectionHeader({ title }) {
  return (
    <Text size="xs" className="text-secondary uppercase tracking-widest px-4 pt-4 pb-1 font-semibold">
      {title}
    </Text>
  );
}

function chunkItems(arr, size) {
  const rows = [];
  for (let i = 0; i < arr.length; i += size) {
    rows.push(arr.slice(i, i + size));
  }
  return rows;
}

function groupByMonth(items, columns) {
  const map = new Map();
  for (const item of items) {
    const d = new Date(item.createdAt ?? item.updatedAt ?? 0);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map.has(key)) {
      const label = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(d);
      map.set(key, { title: label, rawItems: [] });
    }
    map.get(key).rawItems.push(item);
  }
  return Array.from(map.values()).map(({ title, rawItems }) => ({
    title,
    data: chunkItems(rawItems, columns),
  }));
}

export default function PhotosScreen({ navigation = {} }) {
  const { columns } = useResponsive();
  const { colors } = useTheme();
  const { data, isLoading, isFetching, refetch } = useGetFilesQuery({ category: "image", recursive: true });
  const sections = groupByMonth(data?.items ?? [], columns);

  return (
    <ScreenLayout>
      <GlassHeader title="Photos" accentColor={colors.alt.DEFAULT} />

      <Skeleton loading={isLoading}>
        <SectionList
          sections={sections}
          keyExtractor={(row) => row[0]?.id ?? "row"}
          renderItem={({ item: row }) => (
            <View className="flex-row">
              {row.map((file) => (
                <FileGrid
                  key={file.id}
                  file={file}
                  onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: file.id })}
                />
              ))}
            </View>
          )}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={isLoading ? null : <EmptyState message="No photos yet" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
