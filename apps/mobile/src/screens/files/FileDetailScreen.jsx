import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { Download, Share2, Star } from "lucide-react-native";
import * as Sharing from "expo-sharing";

// Rtk
import { useGetFilesQuery, useToggleFileFavoriteMutation } from "@api/fileApi";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Skeleton from "@components/ui/skeleton/Skeleton";
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";
import Button, { ButtonText } from "@components/ui/button/Button";
import OfflineToggle from "@components/offline/OfflineToggle";
import ImageViewer from "@components/media/ImageViewer";
import VideoPlayer from "@components/media/VideoPlayer";
import AudioPlayer from "@components/media/AudioPlayer";

function MetaRow({ label = "", value = "" }) {
  return (
    <View className="flex-row justify-between py-2">
      <Text size="sm" className="text-secondary">
        {label}
      </Text>
      <Text size="sm" className="font-medium max-w-[60%] text-right" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(ts));
}

export default function FileDetailScreen({ navigation = {}, route = {} }) {
  const { fileId } = route.params ?? {};
  const { colors } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const { data, isLoading } = useGetFilesQuery(undefined, {
    selectFromResult: ({ data: result, ...rest }) => ({
      data: result?.items?.find((f) => f.id === fileId) ?? null,
      ...rest,
    }),
  });

  const [toggleFileFavorite] = useToggleFileFavoriteMutation();

  const isImage = data?.mimeType?.startsWith("image/");
  const isVideo = data?.mimeType?.startsWith("video/");
  const isAudio = data?.mimeType?.startsWith("audio/");
  const isFavourite = data?.isFavorite ?? false;

  // previewUrl serves the raw decrypted file with AES-CTR range support (206 + Content-Length).
  // ExoPlayer's DefaultExtractorsFactory sniffs content bytes and selects the right extractor
  // (MP4, Matroska, AVI, WebM, …) regardless of the Content-Type header.
  const videoUri = data?.previewUrl;

  async function onDownload() {
    if (!data?.downloadUrl) return;
    setDownloading(true);
    try {
      await backgroundTransfer.download(data.id, data.downloadUrl, data.name);
    } finally {
      setDownloading(false);
    }
  }

  async function onShare() {
    if (!data?.downloadUrl) return;
    setSharing(true);
    try {
      const uri = await backgroundTransfer.download(data.id, data.downloadUrl, data.name);
      await Sharing.shareAsync(uri);
    } finally {
      setSharing(false);
    }
  }

  async function handleToggleFavourite() {
    if (!data?.id) return;
    await toggleFileFavorite({ id: data.id }).unwrap();
  }

  const headerRight = (
    <View className="flex-row gap-1">
      <IconButton
        icon={
          <Star
            size={20}
            color={isFavourite ? colors.warning.DEFAULT : colors.neutral.DEFAULT}
            fill={isFavourite ? colors.warning.DEFAULT : "none"}
          />
        }
        onPress={handleToggleFavourite}
        variant="ghost"
        size="sm"
      />
      <OfflineToggle file={data} />
    </View>
  );

  function renderPreview() {
    if (isImage && data?.previewUrl) {
      return <ImageViewer uri={data.previewUrl} />;
    }
    if (isVideo && videoUri) {
      return <VideoPlayer uri={videoUri} fallbackUri={data?.hlsUrl} />;
    }
    if (isAudio && data?.downloadUrl) {
      return <AudioPlayer uri={data.downloadUrl} />;
    }
    return (
      <GlassCard className="m-4">
        <Text size="sm" className="text-secondary text-center">
          No preview available
        </Text>
      </GlassCard>
    );
  }

  return (
    <ScreenLayout>
      <GlassHeader title={data?.name ?? "File"} onBack={() => navigation.goBack()} right={headerRight} />

      <Skeleton loading={isLoading}>
        <ScrollView className="flex-1">
          {renderPreview()}

          <GlassCard className="m-4">
            <MetaRow label="Name" value={data?.name ?? "—"} />
            <MetaRow label="Size" value={NumberUtils.formatBytes(data?.size)} />
            <MetaRow label="Type" value={data?.mimeType ?? "—"} />
            <MetaRow label="Created" value={formatDate(data?.createdAt)} />
            <MetaRow label="Modified" value={formatDate(data?.updatedAt)} />
          </GlassCard>

          <View className="px-4 gap-3 pb-4">
            <Button size="lg" onPress={onDownload} disabled={downloading || !data}>
              <Download size={18} />
              <ButtonText>{downloading ? "Downloading…" : "Download"}</ButtonText>
            </Button>
            <Button variant="outline" size="lg" onPress={onShare} disabled={sharing || !data}>
              <Share2 size={18} />
              <ButtonText>{sharing ? "Preparing…" : "Share"}</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </Skeleton>
    </ScreenLayout>
  );
}
