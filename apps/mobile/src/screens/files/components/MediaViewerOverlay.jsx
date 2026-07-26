import React from "react";
import { View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Star, Download, Share2, Info, Pause, Play, X } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";
import GlassHeader from "@components/ui/header/GlassHeader";
import OfflineToggle from "@components/offline/OfflineToggle";

const FADE_DURATION = 180;

/**
 * Floating, auto-hiding chrome for the immersive media viewer: a top `GlassHeader`
 * (back, "n / total" counter, info) and a bottom glass icon bar (favourite, download
 * with inline pause/resume/stop, share, offline). Both fade together, driven by `visible`.
 */
export default function MediaViewerOverlay({
  visible = true,
  index = 0,
  total = 0,
  onBack = () => {},
  onInfo = () => {},
  file = null,
  isFavourite = false,
  onToggleFavourite = () => {},
  downloading = false,
  sharing = false,
  activeDownloadRow = null,
  onDownload = () => {},
  onShare = () => {},
  onPauseDownload = () => {},
  onStopDownload = () => {},
}) {
  const { colors, glass = {} } = useTheme();
  const { blurIntensity, tint } = glass.bar;
  const insets = useSafeAreaInsets();

  const topStyle = useAnimatedStyle(() => ({ opacity: withTiming(visible ? 1 : 0, { duration: FADE_DURATION }) }));
  const bottomStyle = useAnimatedStyle(() => ({ opacity: withTiming(visible ? 1 : 0, { duration: FADE_DURATION }) }));

  const counter = total > 0 ? <Text size="sm" className="font-medium">{`${index + 1} / ${total}`}</Text> : null;

  function renderDownloadSlot() {
    if (!activeDownloadRow) {
      return (
        <IconButton
          icon={<Download size={20} color={colors.neutral.foreground} />}
          onPress={onDownload}
          disabled={downloading}
        />
      );
    }
    const isPaused = activeDownloadRow.status === "paused";
    return (
      <View className="flex-row items-center gap-2">
        <IconButton
          icon={
            isPaused ? (
              <Play size={18} color={colors.neutral.foreground} />
            ) : (
              <Pause size={18} color={colors.neutral.foreground} />
            )
          }
          onPress={isPaused ? onDownload : onPauseDownload}
        />
        <Text size="xs" className="text-neutral-foreground font-medium">
          {Math.round(activeDownloadRow.progress ?? 0)}%
        </Text>
        <IconButton icon={<X size={18} color={colors.neutral.foreground} />} onPress={onStopDownload} />
      </View>
    );
  }

  return (
    <>
      <Animated.View
        className="absolute inset-x-0 top-0 z-10"
        style={topStyle}
        pointerEvents={visible ? "box-none" : "none"}
      >
        <View style={{ paddingTop: insets.top }}>
          <GlassHeader
            onBack={onBack}
            titleElement={<View className="flex-1 items-center">{counter}</View>}
            right={
              <IconButton
                icon={<Info size={20} color={colors.neutral.foreground} />}
                onPress={onInfo}
                variant="ghost"
                size="sm"
              />
            }
          />
        </View>
      </Animated.View>

      <Animated.View
        className="absolute inset-x-0 bottom-0 z-10"
        style={bottomStyle}
        pointerEvents={visible ? "box-none" : "none"}
      >
        <BlurView intensity={blurIntensity} tint={tint} className="border-t border-glass-bar-border">
          <View
            className="flex-row items-center justify-center gap-8 py-3"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <IconButton
              icon={
                <Star
                  size={20}
                  color={isFavourite ? colors.warning.DEFAULT : colors.neutral.foreground}
                  fill={isFavourite ? colors.warning.DEFAULT : "none"}
                />
              }
              onPress={onToggleFavourite}
            />
            {renderDownloadSlot()}
            <IconButton
              icon={<Share2 size={20} color={colors.neutral.foreground} />}
              onPress={onShare}
              disabled={sharing}
            />
            {file ? <OfflineToggle file={file} /> : null}
          </View>
        </BlurView>
      </Animated.View>
    </>
  );
}
