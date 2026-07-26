import React, { useState, useEffect, useCallback } from "react";
import { View, Alert } from "react-native";
import * as Sharing from "expo-sharing";

// Rtk
import { useToggleFileFavoriteMutation } from "@api/fileApi";

// Utils
import { NumberUtils } from "@shared-utils/utils";

// Db
import transfersRepository from "@db/repositories/transfersRepository";

// Lib
import backgroundTransfer from "@lib/backgroundTransfer";
import nativeTransfer, { BusyError } from "@lib/nativeTransfer";
import haptics from "@lib/haptics";

// Hooks
import { useAppStateActive } from "@hooks/useAppStateActive";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import Text from "@components/ui/text/Text";
import EmptyState from "@components/ui/empty-state/EmptyState";
import MediaPager from "./components/MediaPager";
import MediaViewerOverlay from "./components/MediaViewerOverlay";

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

export default function MediaViewerScreen({ navigation = {}, route = {} }) {
  const { files: filesParam = [], index: indexParam = 0 } = route.params ?? {};

  // Local mutable copy so the optimistic favourite toggle has somewhere to write the flipped
  // value before the mutation resolves — mirrors what this screen did with a single `file` before.
  const [items, setItems] = useState(filesParam);
  const [currentIndex, setCurrentIndex] = useState(indexParam);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [infoVisible, setInfoVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [activeDownloadRow, setActiveDownloadRow] = useState(null);

  const [toggleFileFavorite] = useToggleFileFavoriteMutation();

  const file = items[currentIndex] ?? null;
  const isImage = file?.mimeType?.startsWith("image/");
  const isVideo = file?.mimeType?.startsWith("video/");
  const isFavourite = file?.isFavorite ?? false;
  const locationName = file?.folder?.name ?? null;

  // Tracks this file's in-progress download row (if any) so the overlay's pause/resume/stop
  // controls can target it — the dependency on file?.id re-subscribes automatically whenever
  // currentIndex moves to a different file.
  const refreshDownloadRow = useCallback(async () => {
    if (!file?.id) return;
    const rows = await transfersRepository.getByStatus(["active", "paused"]);
    const row = rows.find((r) => r.fileId === file.id && r.type === "download");
    setActiveDownloadRow(row ?? null);
  }, [file?.id]);

  useEffect(() => {
    refreshDownloadRow();
    const unsubscribe = nativeTransfer.addTransferListener(refreshDownloadRow);
    return unsubscribe;
  }, [refreshDownloadRow]);

  // Native events fired while backgrounded are missed (JS suspended), so re-query on foreground.
  useAppStateActive(refreshDownloadRow);

  function handlePauseDownload() {
    if (activeDownloadRow) nativeTransfer.pause(activeDownloadRow.id);
  }

  function handleStopDownload() {
    if (activeDownloadRow) nativeTransfer.cancel(activeDownloadRow.id);
  }

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
      } else if (ex instanceof BusyError) {
        Alert.alert(
          "Transfer in progress",
          "Another upload or download is already running — try again once it finishes."
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
    } catch (ex) {
      if (ex instanceof BusyError) {
        Alert.alert(
          "Transfer in progress",
          "Another upload or download is already running — try again once it finishes."
        );
      } else {
        Alert.alert("Share failed", "This file may no longer be available.");
      }
    } finally {
      setSharing(false);
    }
  }

  function setFavouriteAt(idx, value) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, isFavorite: value } : item)));
  }

  async function handleToggleFavourite() {
    if (!file?.id) return;
    const targetIndex = currentIndex;
    haptics.success();
    setFavouriteAt(targetIndex, !isFavourite);
    try {
      await toggleFileFavorite({ id: file.id }).unwrap();
    } catch {
      setFavouriteAt(targetIndex, isFavourite);
    }
  }

  function handleTap() {
    setOverlayVisible((prev) => !prev);
  }

  if (!file) {
    return (
      <ScreenLayout>
        <GlassHeader title="File" onBack={() => navigation.goBack()} />
        <EmptyState message="File details unavailable" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={[]}>
      <MediaPager
        items={items}
        index={currentIndex}
        onIndexChange={setCurrentIndex}
        controlsVisible={overlayVisible}
        onTap={handleTap}
      />

      <MediaViewerOverlay
        visible={overlayVisible}
        index={currentIndex}
        total={items.length}
        onBack={() => navigation.goBack()}
        onInfo={() => setInfoVisible(true)}
        file={file}
        isFavourite={isFavourite}
        onToggleFavourite={handleToggleFavourite}
        downloading={downloading}
        sharing={sharing}
        activeDownloadRow={activeDownloadRow}
        onDownload={onDownload}
        onShare={onShare}
        onPauseDownload={handlePauseDownload}
        onStopDownload={handleStopDownload}
      />

      <GlassBottomSheet visible={infoVisible} onClose={() => setInfoVisible(false)}>
        <View className="px-6">
          <MetaRow label="Name" value={file.name ?? "—"} />
          <MetaRow label="Size" value={NumberUtils.formatBytes(file.size)} />
          <MetaRow label="Type" value={file.mimeType ?? "—"} />
          <MetaRow label="Created" value={formatDate(file.createdAt)} />
          <MetaRow label="Modified" value={formatDate(file.updatedAt)} />
          {locationName ? <MetaRow label="Location" value={locationName} /> : null}
        </View>
      </GlassBottomSheet>
    </ScreenLayout>
  );
}
