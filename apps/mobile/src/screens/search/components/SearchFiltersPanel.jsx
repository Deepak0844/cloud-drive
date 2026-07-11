import React, { useState, useEffect, useRef } from "react";
import { View, Pressable, TextInput } from "react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import Button, { ButtonText } from "@components/ui/button/Button";
import { FILE_CATEGORIES, DATE_PRESETS, presetToRange } from "./searchFilters";

const MB = 1024 * 1024;

function SectionLabel({ children }) {
  return (
    <Text size="2xs" bold className="text-secondary uppercase tracking-widest mb-2">
      {children}
    </Text>
  );
}

function Pill({ label, selected = false, onPress = () => {} }) {
  return (
    <Pressable
      onPress={onPress}
      className={`h-8 px-3 rounded-full border items-center justify-center ${selected ? "bg-primary-subtle border-primary" : "border-border"}`}
    >
      <Text size="xs" bold className={selected ? "text-primary-light" : "text-secondary"}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Collapsible advanced-filter panel for the search screen.
 * Draft state lives here; `onApply` receives server-ready params:
 * { category?, startDate?, endDate?, minSize?, maxSize? } (sizes in bytes).
 */
export default function SearchFiltersPanel({ visible = false, filters = {}, onApply = () => {}, onClear = () => {} }) {
  const { colors } = useTheme();
  const [category, setCategory] = useState(filters.category ?? null);
  const [datePreset, setDatePreset] = useState(filters.datePreset ?? null);
  const [minMb, setMinMb] = useState(filters.minSize ? String(filters.minSize / MB) : "");
  const [maxMb, setMaxMb] = useState(filters.maxSize ? String(filters.maxSize / MB) : "");
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Re-seed the draft when the panel opens with different applied filters.
  useEffect(() => {
    if (visible) {
      setCategory(filtersRef.current.category ?? null);
      setDatePreset(filtersRef.current.datePreset ?? null);
      setMinMb(filtersRef.current.minSize ? String(filtersRef.current.minSize / MB) : "");
      setMaxMb(filtersRef.current.maxSize ? String(filtersRef.current.maxSize / MB) : "");
    }
  }, [visible]);

  if (!visible) return null;

  function handleApply() {
    const next = {};
    if (category) next.category = category;
    if (datePreset) {
      next.datePreset = datePreset;
      Object.assign(next, presetToRange(datePreset));
    }
    const min = parseFloat(minMb);
    const max = parseFloat(maxMb);
    if (!Number.isNaN(min) && min > 0) next.minSize = Math.round(min * MB);
    if (!Number.isNaN(max) && max > 0) next.maxSize = Math.round(max * MB);
    onApply(next);
  }

  const sizeInputClassName = "border border-border rounded-md px-md py-sm text-sm text-neutral flex-1";

  return (
    <View className="px-4 py-3 border-b border-border gap-4">
      <View>
        <SectionLabel>File Type</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {FILE_CATEGORIES.map(({ key, label }) => (
            <Pill
              key={key}
              label={label}
              selected={category === key}
              onPress={() => setCategory((prev) => (prev === key ? null : key))}
            />
          ))}
        </View>
      </View>

      <View>
        <SectionLabel>Date Range</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {DATE_PRESETS.map(({ key, label }) => (
            <Pill
              key={key}
              label={label}
              selected={datePreset === key}
              onPress={() => setDatePreset((prev) => (prev === key ? null : key))}
            />
          ))}
        </View>
      </View>

      <View>
        <SectionLabel>File Size (MB)</SectionLabel>
        <View className="flex-row items-center gap-2">
          <TextInput
            value={minMb}
            onChangeText={setMinMb}
            placeholder="Min"
            placeholderTextColor={colors.surface.textDisabled}
            keyboardType="numeric"
            className={sizeInputClassName}
          />
          <Text size="sm" className="text-secondary">
            —
          </Text>
          <TextInput
            value={maxMb}
            onChangeText={setMaxMb}
            placeholder="Max"
            placeholderTextColor={colors.surface.textDisabled}
            keyboardType="numeric"
            className={sizeInputClassName}
          />
        </View>
      </View>

      <View className="flex-row gap-2">
        <Button variant="outline" className="flex-1" onPress={onClear}>
          <ButtonText>Clear all</ButtonText>
        </Button>
        <Button className="flex-[2]" onPress={handleApply}>
          <ButtonText>Apply Filters</ButtonText>
        </Button>
      </View>
    </View>
  );
}
