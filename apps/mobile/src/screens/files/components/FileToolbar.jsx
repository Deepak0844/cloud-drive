import React from "react";
import { View, Pressable } from "react-native";
import { List, LayoutGrid, ListChecks, X } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import { SORT_MODES } from "./fileSort";

const VIEW_MODES = [
  { key: "list", Icon: List },
  { key: "grid", Icon: LayoutGrid },
];

/**
 * Toolbar row under the header: sort cycle button, list/grid view toggle,
 * and a Select toggle that enters/exits multi-select mode explicitly
 * (independent of long-press, which can be unreliable on swipeable rows).
 */
export default function FileToolbar({
  sortKey = "date-desc",
  onSortChange = () => {},
  view = "list",
  onViewChange = () => {},
  selectionMode = false,
  onToggleSelectionMode = () => {},
}) {
  const { colors } = useTheme();

  const activeSortIndex = Math.max(
    SORT_MODES.findIndex((mode) => mode.key === sortKey),
    0
  );
  const activeSort = SORT_MODES[activeSortIndex];
  const SortIcon = activeSort.Icon;

  function cycleSort() {
    onSortChange(SORT_MODES[(activeSortIndex + 1) % SORT_MODES.length].key);
  }

  return (
    <View className="flex-row items-center justify-between px-4 py-2">
      <Pressable
        onPress={cycleSort}
        android_ripple={{ color: colors.ripple.glass }}
        className="flex-row items-center gap-1.5 px-3 h-9 rounded-xl bg-glass-surface-bg border border-glass-surface-border"
      >
        <SortIcon size={14} color={colors.neutral.DEFAULT} />
        <Text size="xs" bold className="text-secondary">
          {activeSort.label}
        </Text>
      </Pressable>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onToggleSelectionMode}
          android_ripple={{ color: colors.ripple.glass }}
          className={`flex-row items-center gap-1.5 px-3 h-9 rounded-xl border ${selectionMode ? "bg-primary-subtle border-primary" : "border-border"}`}
        >
          {selectionMode ? (
            <X size={14} color={colors.primary.light} />
          ) : (
            <ListChecks size={14} color={colors.neutral.DEFAULT} />
          )}
          <Text size="xs" bold className={selectionMode ? "text-primary-light" : "text-secondary"}>
            {selectionMode ? "Cancel" : "Select"}
          </Text>
        </Pressable>

        <View className="flex-row rounded-xl overflow-hidden border border-glass-surface-border">
          {VIEW_MODES.map(({ key, Icon }) => {
            const active = view === key;
            return (
              <Pressable
                key={key}
                onPress={() => onViewChange(key)}
                className={`w-9 h-9 items-center justify-center ${active ? "bg-primary-dark" : ""}`}
              >
                <Icon size={15} color={active ? colors.primary.foreground : colors.neutral.DEFAULT} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
