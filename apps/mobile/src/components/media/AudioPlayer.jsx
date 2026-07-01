import React from "react";
import { View, Pressable } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Play, Pause } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Utils
import TokenStorage from "@utils/tokenStorage";

// Components
import Text from "@components/ui/text/Text";

function formatTime(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const paddedSeconds = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
}

export default function AudioPlayer({ uri = "" }) {
  const { colors } = useTheme();
  const player = useAudioPlayer({ uri, headers: TokenStorage.getAuthHeaders() });
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing ?? false;
  const position = status.currentTime ?? 0;
  const duration = status.duration ?? 0;
  const progress = duration > 0 ? position / duration : 0;
  const trackFillWidth = `${progress * 100}%`;

  function togglePlay() {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }

  return (
    <View className="flex-row items-center rounded-xl p-3 m-4 gap-3 bg-glass-modal-bg">
      <Pressable onPress={togglePlay} className="p-1">
        {isPlaying ? (
          <Pause size={28} color={colors.neutral.foreground} />
        ) : (
          <Play size={28} color={colors.neutral.foreground} />
        )}
      </Pressable>

      <View className="flex-1 gap-1">
        <View className="h-1 rounded-sm bg-neutral-foreground/30">
          <View className="h-1 rounded-sm bg-neutral-foreground" style={{ width: trackFillWidth }} />
        </View>
        <View className="flex-row justify-between">
          <Text size="xs" className="text-neutral-foreground/70">
            {formatTime(position)}
          </Text>
          <Text size="xs" className="text-neutral-foreground/70">
            {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}
