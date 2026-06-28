import React, { useState, useEffect } from "react";
import { View, FlatList } from "react-native";
import { Search } from "lucide-react-native";

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
import Text from "@components/ui/text/Text";
import { InputField } from "@components/ui/input/Input";

// Sections
import FileListItem from "@screens/files/components/FileListItem";

export default function SearchScreen({ navigation = {} }) {
  const { colors } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading, isFetching } = useGetFilesQuery(
    { search: debouncedTerm },
    { skip: debouncedTerm.length < 2 }
  );

  const isIdle = debouncedTerm.length < 2;
  const showSpinner = !isIdle && (isLoading || isFetching);

  return (
    <ScreenLayout>
      <GlassHeader title="Search" />

      <View className="px-4 py-2 flex-row items-center gap-2 border-b border-border">
        <Search size={18} color={colors.neutral.DEFAULT} />
        <InputField
          className="flex-1 text-base"
          placeholder="Search files..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <Skeleton loading={showSpinner}>
        <FlatList
          data={isIdle ? [] : (data?.items ?? [])}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FileListItem
              item={item}
              onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { fileId: item.id })}
              onLongPress={() => {}}
            />
          )}
          ItemSeparatorComponent={() => <View className="h-px bg-border mx-4" />}
          ListEmptyComponent={
            showSpinner ? null : isIdle ? (
              <View className="flex-1 items-center justify-center px-4 pt-16">
                <Text size="sm" className="text-secondary text-center">
                  Type to search
                </Text>
              </View>
            ) : (
              <EmptyState message={`No results for "${debouncedTerm}"`} />
            )
          }
        />
      </Skeleton>
    </ScreenLayout>
  );
}
