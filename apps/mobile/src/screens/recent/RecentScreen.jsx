import React from "react";
import { SectionList, View } from "react-native";

// Rtk
import { useGetRecentFilesQuery } from "@api/fileApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import Text from "@components/ui/text/Text";
import DrawerMenuButton from "@components/ui/glass/DrawerMenuButton";
import FileListItem from "@screens/files/components/FileListItem";

function SectionHeader({ title }) {
  return (
    <Text size="xs" className="text-secondary uppercase tracking-widest px-4 pt-4 pb-1 font-semibold">
      {title}
    </Text>
  );
}

function groupByTime(items) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 864e5;
  const sections = [
    { title: "Today", data: [] },
    { title: "Yesterday", data: [] },
    { title: "Earlier", data: [] },
  ];
  for (const item of items) {
    const ts = new Date(item.updatedAt ?? item.createdAt ?? 0).getTime();
    if (ts >= todayStart) sections[0].data.push(item);
    else if (ts >= yesterdayStart) sections[1].data.push(item);
    else sections[2].data.push(item);
  }
  return sections.filter((s) => s.data.length > 0);
}

export default function RecentScreen({ navigation = {} }) {
  const { data, isLoading, isFetching, refetch } = useGetRecentFilesQuery();
  const sections = groupByTime(data?.items ?? []);

  return (
    <ScreenLayout>
      <GlassHeader title="Recent" left={<DrawerMenuButton navigation={navigation} />} accentColor="#fb923c" />

      <Skeleton loading={isLoading}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View className="px-4">
              <FileListItem
                item={item}
                onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { file: item })}
                onLongPress={() => {}}
              />
            </View>
          )}
          renderSectionHeader={({ section }) => <SectionHeader title={section.title} />}
          ItemSeparatorComponent={() => <View className="h-2" />}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          contentContainerClassName="pb-4"
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={isLoading ? null : <EmptyState message="No recent files" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
