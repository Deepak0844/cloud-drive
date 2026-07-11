import React, { useState, useEffect, useMemo } from "react";
import { View, FlatList, Pressable } from "react-native";
import { Search, SlidersHorizontal, X } from "lucide-react-native";
import { useSelector } from "react-redux";

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
import { Input, InputField, InputSlot } from "@components/ui/input/Input";

// Sections
import FileListItem from "@screens/files/components/FileListItem";
import SearchFiltersPanel from "./components/SearchFiltersPanel";
import { FILE_CATEGORIES, DATE_PRESETS } from "./components/searchFilters";

const MB = 1024 * 1024;

function activeFilterChips(filters) {
  const chips = [];
  if (filters.category) {
    chips.push({
      key: "category",
      label: FILE_CATEGORIES.find((c) => c.key === filters.category)?.label ?? filters.category,
    });
  }
  if (filters.datePreset) {
    chips.push({
      key: "datePreset",
      label: DATE_PRESETS.find((p) => p.key === filters.datePreset)?.label ?? filters.datePreset,
    });
  }
  if (filters.minSize) chips.push({ key: "minSize", label: `> ${Math.round(filters.minSize / MB)} MB` });
  if (filters.maxSize) chips.push({ key: "maxSize", label: `< ${Math.round(filters.maxSize / MB)} MB` });
  return chips;
}

export default function SearchScreen({ navigation = {} }) {
  const { colors } = useTheme();
  const isOnline = useSelector((state) => state.offline.isOnline);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset paging whenever the query changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedTerm, filters]);

  const queryParams = useMemo(() => {
    const { datePreset: _datePreset, ...serverFilters } = filters;
    return { search: debouncedTerm, recursive: true, pg: page, ...serverFilters };
  }, [debouncedTerm, filters, page]);

  const hasFilters = Object.keys(filters).length > 0;
  const isIdle = debouncedTerm.length < 2 && !hasFilters;

  const { data, isLoading, isFetching } = useGetFilesQuery(queryParams, { skip: isIdle || !isOnline });

  const showSpinner = !isIdle && isOnline && (isLoading || (isFetching && page === 1));
  const chips = activeFilterChips(filters);
  const total = data?.pagination?.total;
  const hasNext = data?.pagination?.hasNext;

  function removeFilter(key) {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      if (key === "datePreset") {
        delete next.startDate;
        delete next.endDate;
      }
      return next;
    });
  }

  function handleEndReached() {
    if (hasNext && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }

  return (
    <ScreenLayout>
      <GlassHeader title="Search" onBack={navigation.goBack ? () => navigation.goBack() : null} />

      <View className="px-4 py-2 flex-row items-center gap-2">
        <Input className="flex-1 rounded-xl">
          <InputSlot className="pl-3">
            <Search size={16} color={colors.neutral.DEFAULT} />
          </InputSlot>
          <InputField
            placeholder="Search files..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </Input>
        <Pressable
          onPress={() => setPanelOpen((prev) => !prev)}
          className={`flex-row items-center gap-1 h-8 px-2.5 rounded-full border ${panelOpen || hasFilters ? "bg-primary-subtle border-primary" : "border-border"}`}
        >
          <SlidersHorizontal
            size={14}
            color={panelOpen || hasFilters ? colors.primary.light : colors.neutral.DEFAULT}
          />
          {chips.length > 0 ? (
            <View className="w-4 h-4 rounded-full bg-primary items-center justify-center">
              <Text size="2xs" bold className="text-primary-foreground">
                {chips.length}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <SearchFiltersPanel
        visible={panelOpen}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setPanelOpen(false);
        }}
        onClear={() => {
          setFilters({});
          setPanelOpen(false);
        }}
      />

      {chips.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 px-4 py-2">
          {chips.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => removeFilter(key)}
              className="h-7 px-2.5 rounded-full border flex-row items-center gap-1 bg-primary-subtle border-primary"
            >
              <Text size="2xs" bold className="text-primary-light">
                {label}
              </Text>
              <X size={11} color={colors.primary.light} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {!isIdle && typeof total === "number" ? (
        <Text size="xs" className="text-secondary px-4 py-1">
          {total} result{total === 1 ? "" : "s"}
        </Text>
      ) : null}

      <Skeleton loading={showSpinner}>
        <FlatList
          data={isIdle ? [] : (data?.items ?? [])}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FileListItem
              item={item}
              onPress={() => navigation.navigate(AppScreens.FILE_DETAIL, { file: item })}
              onLongPress={() => {}}
            />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ItemSeparatorComponent={() => <View className="h-px bg-border mx-4" />}
          ListEmptyComponent={
            showSpinner ? null : !isOnline ? (
              <View className="flex-1 items-center justify-center px-4 pt-16">
                <Text size="sm" className="text-secondary text-center">
                  Search requires an internet connection
                </Text>
              </View>
            ) : isIdle ? (
              <View className="flex-1 items-center justify-center px-4 pt-16">
                <Text size="sm" className="text-secondary text-center">
                  Type to search
                </Text>
              </View>
            ) : (
              <EmptyState message={debouncedTerm ? `No results for "${debouncedTerm}"` : "No matching files"} />
            )
          }
        />
      </Skeleton>
    </ScreenLayout>
  );
}
