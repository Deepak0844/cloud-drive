import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, Dimensions, ActivityIndicator } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Play, Pause, Maximize } from "lucide-react-native";

// Utils
import TokenStorage from "@utils/tokenStorage";

// Components
import Text from "@components/ui/text/Text";

// Theme
import { useTheme } from "@theme/useTheme";

const { width, height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatTime(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  const paddedSeconds = String(Math.floor(seconds % 60)).padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
}

export default function VideoPlayer({ uri = "", fallbackUri = "", extension = "", controlsVisible = true }) {
  const { colors } = useTheme();
  const headers = TokenStorage.getAuthHeaders();

  const player = useVideoPlayer({ uri, headers }, (playerInstance) => {
    playerInstance.loop = false;
    playerInstance.timeUpdateEventInterval = 0.5;
    playerInstance.bufferOptions = {
      preferredForwardBufferDuration: 20,
      minBufferForPlayback: 3,
      prioritizeTimeOverSizeThreshold: true,
    };
  });

  const fallbackTriggered = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const fallbackUriRef = useRef(fallbackUri);
  fallbackUriRef.current = fallbackUri;
  const headersRef = useRef(headers);
  headersRef.current = headers;

  useEffect(() => {
    const playingSub = player.addListener("playingChange", ({ isPlaying: playing }) => {
      setIsPlaying(playing);
    });
    const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
      setPosition(currentTime ?? 0);
      if (player.duration > 0) setDuration(player.duration);
    });
    const statusSub = player.addListener("statusChange", ({ status }) => {
      setIsBuffering(status === "loading");
      if (status === "readyToPlay" && player.duration > 0) setDuration(player.duration);
      if (status === "error" && fallbackUriRef.current && !fallbackTriggered.current) {
        fallbackTriggered.current = true;
        setIsBuffering(true);
        setPosition(0);
        setDuration(0);
        player.replaceAsync({ uri: fallbackUriRef.current, headers: headersRef.current }).catch(() => {});
      }
    });
    return () => {
      playingSub.remove();
      timeSub.remove();
      statusSub.remove();
      player.release();
    };
  }, [player]);

  function togglePlay() {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }

  return (
    <View className="bg-black" style={{ width, height: SCREEN_HEIGHT }}>
      <VideoView player={player} style={{ width, height: SCREEN_HEIGHT }} contentFit="contain" nativeControls={false} />

      {duration > 0 && controlsVisible && (
        <View className="absolute top-14 left-3 px-2 py-0.5 rounded-md bg-black/55">
          <Text size="xs" className="text-neutral-foreground">
            {formatTime(duration)}
            {extension ? ` · ${extension.toUpperCase()}` : ""}
          </Text>
        </View>
      )}

      {isBuffering && (
        <View
          className="absolute inset-x-0 top-0 items-center justify-center bg-black/40"
          style={{ height: SCREEN_HEIGHT }}
        >
          <ActivityIndicator size="large" color={colors.neutral.foreground} />
        </View>
      )}

      {controlsVisible && (
        <View className="absolute inset-x-0 bottom-24 flex-row items-center px-3 gap-2.5 h-10 bg-glass-bar-bg">
          <Pressable onPress={togglePlay} className="p-1">
            {isPlaying ? (
              <Pause size={22} color={colors.neutral.foreground} />
            ) : (
              <Play size={22} color={colors.neutral.foreground} />
            )}
          </Pressable>

          <Text size="xs" className="flex-1 text-center text-neutral-foreground">
            {formatTime(position)} / {formatTime(duration)}
          </Text>

          <Pressable onPress={() => player.enterFullscreen?.()} className="p-1">
            <Maximize size={18} color={colors.neutral.foreground} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
