import React, { useState, useMemo } from "react";
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
import DrawerMenuButton from "@components/ui/glass/DrawerMenuButton";
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
  const [imagePage, setImagePage] = useState(1);
  const [videoPage, setVideoPage] = useState(1);

  const {
    data: imageData,
    isLoading: imagesLoading,
    isFetching: imagesFetching,
    refetch: refetchImages,
  } = useGetFilesQuery({ category: "image", recursive: true, pg: imagePage });
  const {
    data: videoData,
    isLoading: videosLoading,
    isFetching: videosFetching,
    refetch: refetchVideos,
  } = useGetFilesQuery({ category: "video", recursive: true, pg: videoPage });
  const isLoading = imagesLoading || videosLoading;
  const isFetching = imagesFetching || videosFetching;

  const merged = useMemo(() => {
    const items = [...(imageData?.items ?? []), ...(videoData?.items ?? [])];
    return items.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
  }, [imageData, videoData]);

  const sections = groupByMonth(merged, columns);

  function handleRefresh() {
    if (imagePage === 1) {
      refetchImages();
    } else {
      setImagePage(1);
    }
    if (videoPage === 1) {
      refetchVideos();
    } else {
      setVideoPage(1);
    }
  }

  function handleEndReached() {
    if (isFetching) return;
    // Advance whichever feeds still have pages; a drained query no-ops.
    if (imageData?.pagination?.hasNext) {
      setImagePage((prev) => prev + 1);
    }
    if (videoData?.pagination?.hasNext) {
      setVideoPage((prev) => prev + 1);
    }
  }

  return (
    <ScreenLayout>
      <GlassHeader
        title="Photos"
        left={<DrawerMenuButton navigation={navigation} />}
        accentColor={colors.alt.DEFAULT}
      />

      <Skeleton loading={isLoading}>
        <SectionList
          sections={sections}
          keyExtractor={(row) => row[0]?.id ?? "row"}
          renderItem={({ item: row }) => (
            <View className="flex-row px-4">
              {row.map((file) => (
                <FileGrid
                  key={file.id}
                  file={file}
                  onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { file })}
                />
              ))}
            </View>
          )}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
          refreshing={isFetching && !isLoading}
          onRefresh={handleRefresh}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={isLoading ? null : <EmptyState message="No photos yet" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
