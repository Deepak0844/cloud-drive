import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { Download, Share2 } from "lucide-react-native";
import * as Sharing from "expo-sharing";

// Rtk
import { useGetFilesQuery } from "@api/fileApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Skeleton from "@components/ui/skeleton/Skeleton";
import Text from "@components/ui/text/Text";
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

export default function FileDetailScreen({ navigation = {}, route = {} }) {
  const { fileId } = route.params ?? {};
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useGetFilesQuery(undefined, {
    selectFromResult: ({ data: result, ...rest }) => ({
      data: result?.items?.find((f) => f.id === fileId) ?? null,
      ...rest,
    }),
  });

  const isImage = data?.mimeType?.startsWith("image/");
  const isVideo = data?.mimeType?.startsWith("video/");
  const isAudio = data?.mimeType?.startsWith("audio/");

  // previewUrl serves the raw decrypted file with AES-CTR range support (206 + Content-Length).
  // ExoPlayer's DefaultExtractorsFactory sniffs content bytes and selects the right extractor
  // (MP4, Matroska, AVI, WebM, …) regardless of the Content-Type header — all formats play
  // without transcoding lag.
  const videoUri = data?.previewUrl;

  async function onDownload() {
    if (!data?.downloadUrl) return;
    setDownloading(true);
    try {
      const uri = await backgroundTransfer.download(data.id, data.downloadUrl, data.name);
      await Sharing.shareAsync(uri);
    } finally {
      setDownloading(false);
    }
  }

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
      <GlassHeader
        title={data?.name ?? "File"}
        onBack={() => navigation.goBack()}
        right={<OfflineToggle file={data} />}
      />

      <Skeleton loading={isLoading}>
        <ScrollView className="flex-1">
          {renderPreview()}

          <GlassCard className="m-4">
            <MetaRow label="Name" value={data?.name ?? "—"} />
            <MetaRow label="Size" value={formatBytes(data?.size)} />
            <MetaRow label="Type" value={data?.mimeType ?? "—"} />
          </GlassCard>

          <View className="px-4 gap-3 pb-4">
            <Button size="lg" onPress={onDownload} disabled={downloading || !data}>
              <Download size={18} />
              <ButtonText>{downloading ? "Downloading…" : "Download"}</ButtonText>
            </Button>
            <Button variant="outline" size="lg" onPress={onDownload} disabled={downloading || !data}>
              <Share2 size={18} />
              <ButtonText>Share</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </Skeleton>
    </ScreenLayout>
  );
}
