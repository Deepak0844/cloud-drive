import React from "react";
import { Pressable, Dimensions } from "react-native";
import { File as FileIcon } from "lucide-react-native";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import ImageViewer from "@components/media/ImageViewer";
import VideoPlayer from "@components/media/VideoPlayer";
import AudioPlayer from "@components/media/AudioPlayer";

const { width, height } = Dimensions.get("window");

/**
 * One page of the media pager: switches on the file's mimeType, same as the metadata-heavy
 * screen this replaces did, but rendered edge-to-edge instead of inside a scroll view.
 */
export default function MediaViewerPage({
  file = null,
  isActive = false,
  controlsVisible = true,
  onTap = () => {},
  onZoomChange = () => {},
}) {
  const { colors } = useTheme();

  const isImage = file?.mimeType?.startsWith("image/");
  const isVideo = file?.mimeType?.startsWith("video/");
  const isAudio = file?.mimeType?.startsWith("audio/");

  if (isImage && file?.previewUrl) {
    return <ImageViewer uri={file.previewUrl} isActive={isActive} onTap={onTap} onZoomChange={onZoomChange} />;
  }

  if (isVideo && file?.previewUrl) {
    return (
      <Pressable onPress={onTap} style={{ width, height }} className="bg-black">
        {isActive ? (
          <VideoPlayer
            uri={file.previewUrl}
            fallbackUri={file?.hlsUrl}
            extension={file?.mimeType?.split("/")[1]}
            controlsVisible={controlsVisible}
          />
        ) : null}
      </Pressable>
    );
  }

  if (isAudio && file?.downloadUrl) {
    return (
      <Pressable onPress={onTap} style={{ width, height }} className="bg-black items-center justify-center">
        {isActive ? <AudioPlayer uri={file.downloadUrl} /> : null}
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onTap} style={{ width, height }} className="bg-black items-center justify-center gap-3 px-8">
      <FileIcon size={48} color={colors.neutral.foreground} />
      <Text className="text-neutral-foreground font-medium text-center" numberOfLines={2}>
        {file?.name ?? "Unavailable"}
      </Text>
      <Text size="sm" className="text-neutral-foreground/60">
        {file?.size ? NumberUtils.formatBytes(file.size) : "No preview available"}
      </Text>
    </Pressable>
  );
}
