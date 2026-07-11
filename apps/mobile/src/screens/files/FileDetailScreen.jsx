import React, { useState } from "react";
import { View, ScrollView, Alert } from "react-native";
import { Download, Share2, Star } from "lucide-react-native";
import * as Sharing from "expo-sharing";

// Rtk
import { useToggleFileFavoriteMutation } from "@api/fileApi";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";
import haptics from "@lib/haptics";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Text from "@components/ui/text/Text";
import IconButton from "@components/ui/icon-button/IconButton";
import Button, { ButtonText } from "@components/ui/button/Button";
import EmptyState from "@components/ui/empty-state/EmptyState";
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
  const { file: fileParam = null } = route.params ?? {};
  const { colors } = useTheme();

  // The full item travels via route params (web passes the file object the same
  // way); favorite state is kept locally so the toggle reflects immediately.
  const [file, setFile] = useState(fileParam);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [toggleFileFavorite] = useToggleFileFavoriteMutation();

  const isImage = file?.mimeType?.startsWith("image/");
  const isVideo = file?.mimeType?.startsWith("video/");
  const isAudio = file?.mimeType?.startsWith("audio/");
  const isFavourite = file?.isFavorite ?? false;
  const locationName = file?.folder?.name ?? null;

  // previewUrl serves the raw decrypted file with AES-CTR range support (206 + Content-Length).
  // ExoPlayer's DefaultExtractorsFactory sniffs content bytes and selects the right extractor
  // (MP4, Matroska, AVI, WebM, …) regardless of the Content-Type header.
  const videoUri = file?.previewUrl;

  async function onDownload() {
    if (!file?.downloadUrl) return;
    setDownloading(true);
    try {
      const uri = await backgroundTransfer.download(file.id, file.downloadUrl, file.name);
      if (!uri) return;
      if (isImage || isVideo) {
        await backgroundTransfer.saveToGallery(uri, file.mimeType);
      }
    } catch (ex) {
      if (ex.message === "MEDIA_LIBRARY_PERMISSION_DENIED") {
        Alert.alert(
          "Permission required",
          "Go to Settings → Privacy → Photos and grant access to save downloads to your Gallery."
        );
      } else {
        Alert.alert("Download failed", "This file may no longer be available.");
      }
    } finally {
      setDownloading(false);
    }
  }

  async function onShare() {
    if (!file?.downloadUrl) return;
    setSharing(true);
    try {
      const uri = await backgroundTransfer.download(file.id, file.downloadUrl, file.name);
      if (!uri) return;
      await Sharing.shareAsync(uri);
    } catch {
      Alert.alert("Share failed", "This file may no longer be available.");
    } finally {
      setSharing(false);
    }
  }

  async function handleToggleFavourite() {
    if (!file?.id) return;
    haptics.success();
    setFile((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    try {
      await toggleFileFavorite({ id: file.id }).unwrap();
    } catch {
      setFile((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  }

  const headerRight = file ? (
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
      <OfflineToggle file={file} />
    </View>
  ) : null;

  if (!file) {
    return (
      <ScreenLayout>
        <GlassHeader title="File" onBack={() => navigation.goBack()} />
        <EmptyState message="File details unavailable" />
      </ScreenLayout>
    );
  }

  function renderPreview() {
    if (isImage && file?.previewUrl) {
      return <ImageViewer uri={file.previewUrl} />;
    }
    if (isVideo && videoUri) {
      return <VideoPlayer uri={videoUri} fallbackUri={file?.hlsUrl} extension={file?.mimeType?.split("/")[1]} />;
    }
    if (isAudio && file?.downloadUrl) {
      return <AudioPlayer uri={file.downloadUrl} />;
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
      <GlassHeader title={file.name ?? "File"} onBack={() => navigation.goBack()} right={headerRight} />

      <ScrollView className="flex-1">
        {renderPreview()}

        <GlassCard className="m-4">
          <MetaRow label="Name" value={file.name ?? "—"} />
          <MetaRow label="Size" value={NumberUtils.formatBytes(file.size)} />
          <MetaRow label="Type" value={file.mimeType ?? "—"} />
          <MetaRow label="Created" value={formatDate(file.createdAt)} />
          <MetaRow label="Modified" value={formatDate(file.updatedAt)} />
          {locationName ? <MetaRow label="Location" value={locationName} /> : null}
        </GlassCard>

        <View className="px-4 gap-3 pb-4">
          <Button size="lg" onPress={onDownload} disabled={downloading}>
            <Download size={18} />
            <ButtonText>{downloading ? "Downloading…" : "Download"}</ButtonText>
          </Button>
          <Button variant="outline" size="lg" onPress={onShare} disabled={sharing}>
            <Share2 size={18} />
            <ButtonText>{sharing ? "Preparing…" : "Share"}</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
}
