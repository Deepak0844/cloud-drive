import React, { useState, useEffect, useRef } from "react";
import { View, Pressable } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { File, Star, Trash2 } from "lucide-react-native";

// Rtk
import { useToggleFileFavoriteMutation } from "@api/fileApi";

// DB
import transfersRepository from "@db/repositories/transfersRepository";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Lib
import haptics from "@lib/haptics";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import AuthImage from "@components/media/AuthImage";
import Text from "@components/ui/text/Text";
import GlassCard from "@components/ui/glass/GlassCard";
import FileMoreButton from "./FileMoreButton";

function TransferProgressBar({ fileId }) {
  const [pct, setPct] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      const rows = await transfersRepository.getByStatus(["active", "pending", "paused"]);
      const match = rows.find((r) => r.fileId === fileId);
      if (mounted) setPct(match ? (match.progress ?? 0) : null);
    }

    poll();
    const interval = setInterval(poll, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [fileId]);

  if (pct === null) return null;

  return (
    <View className="h-1 bg-neutral-subtle rounded-full overflow-hidden mt-1">
      <View className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
    </View>
  );
}

function RowBody({ item = {}, onPress = () => {}, onLongPress = () => {}, onOpenMenu = null }) {
  const { colors } = useTheme();

  // The tap area and the three-dot button are siblings, not nested Pressables
  // — a Pressable inside another Pressable reliably loses its own touch
  // responder to the outer one on Android, so the inner one never fires.
  return (
    <GlassCard>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          android_ripple={{ color: colors.ripple.glass }}
          className="flex-1 flex-row items-center gap-3"
        >
          <View className="w-10 h-10 rounded-xl bg-neutral-subtle overflow-hidden items-center justify-center">
            {item.thumbnailUrl ? (
              <AuthImage uri={item.thumbnailUrl} className="w-full h-full" contentFit="cover" />
            ) : (
              <File size={20} color={colors.neutral.DEFAULT} />
            )}
          </View>
          <View className="flex-1">
            <Text size="md" className="font-medium" numberOfLines={1}>
              {item.name}
            </Text>
            <Text size="xs" className="text-secondary">
              {item.size != null ? NumberUtils.formatBytes(item.size) : ""}
            </Text>
            <TransferProgressBar fileId={item.id} />
          </View>
        </Pressable>
        {onOpenMenu ? <FileMoreButton onPress={onOpenMenu} /> : null}
      </View>
    </GlassCard>
  );
}

/**
 * File row. When `onRequestDelete` is provided (files browsing screens) the
 * row is swipeable, revealing favorite/delete quick actions, and shows a
 * three-dot button (`onOpenMenu`) as the primary way to open the action
 * sheet — a normal tap, so it doesn't depend on long-press racing the row's
 * own swipe gesture. Other screens (Home, Recent, Favorites, Search) render
 * the plain row with neither.
 *
 * @param {boolean} swipeDisabled - disables swiping while selection mode is active
 */
export default function FileListItem({
  item = {},
  onPress = () => {},
  onLongPress = () => {},
  onRequestDelete = null,
  onOpenMenu = null,
  swipeDisabled = false,
}) {
  const { colors } = useTheme();
  const [toggleFileFavorite] = useToggleFileFavoriteMutation();
  const swipeRef = useRef(null);

  if (!onRequestDelete) {
    return <RowBody item={item} onPress={onPress} onLongPress={onLongPress} onOpenMenu={onOpenMenu} />;
  }

  async function handleFavorite() {
    swipeRef.current?.close();
    haptics.success();
    await toggleFileFavorite({ id: item.id });
  }

  function handleDelete() {
    swipeRef.current?.close();
    haptics.warning();
    onRequestDelete(item);
  }

  function renderRightActions() {
    return (
      <View className="flex-row items-center gap-1 px-2">
        <Pressable onPress={handleFavorite} className="w-11 h-11 rounded-xl items-center justify-center bg-warning/10">
          <Star size={18} color={colors.warning.DEFAULT} fill={item.isFavorite ? colors.warning.DEFAULT : "none"} />
        </Pressable>
        <Pressable onPress={handleDelete} className="w-11 h-11 rounded-xl items-center justify-center bg-danger/10">
          <Trash2 size={18} color={colors.danger.DEFAULT} />
        </Pressable>
      </View>
    );
  }

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      enabled={!swipeDisabled}
      overshootRight={false}
    >
      <RowBody item={item} onPress={onPress} onLongPress={onLongPress} onOpenMenu={onOpenMenu} />
    </ReanimatedSwipeable>
  );
}
