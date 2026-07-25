import React, { useState } from "react";
import { View } from "react-native";
import { useDispatch } from "react-redux";
import { Upload, FolderOpen, FolderPlus, Camera, Image as ImageIcon } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

// Actions
import { ErrorActions } from "@redux-slices/errorSlice";

// Hooks
import { useUploadQueue } from "@hooks/useUploadQueue";

// Lib
import haptics from "@lib/haptics";

// Components
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import IconButton from "@components/ui/icon-button/IconButton";
import MenuSheetRow from "@components/ui/menu-sheet-row/MenuSheetRow";
import Text from "@components/ui/text/Text";
import Divider from "@components/ui/divider/Divider";
import Button, { ButtonText } from "@components/ui/button/Button";

export default function UploadFab({ folderId = null, onCreateFolder = null }) {
  const dispatch = useDispatch();
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const { enqueue, queueStatus } = useUploadQueue();

  const activeCount = queueStatus.pending + queueStatus.active;

  function reportUploadError(name) {
    dispatch(ErrorActions.setError({ errorInfo: { message: `Could not queue "${name}" for upload` } }));
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setCameraDenied(true);
      return;
    }
    // Sheet closes only after the native camera UI has fully resolved — closing it first would
    // unmount GlassBottomSheet's RN Modal (~220ms close animation) while the camera is still
    // presented on top of it, tearing down the camera's parent view controller mid-presentation
    // and freezing the app (the camera's completion callback is orphaned, its promise never
    // resolves, and the view hierarchy is left corrupted).
    const result = await ImagePicker.launchCameraAsync();
    setShowPickerSheet(false);
    if (!result.canceled && result.assets?.[0]) {
      const { uri, fileName, mimeType } = result.assets[0];
      const name = fileName ?? `photo-${Date.now()}.jpg`;
      haptics.success();
      try {
        await enqueue(uri, name, mimeType ?? "image/jpeg", folderId);
      } catch {
        reportUploadError(name);
      }
    }
  }

  async function pickFile() {
    // See takePhoto's comment — sheet closes only after the picker resolves, not before.
    // multiple: several files can be selected at once; each is enqueued and the queue drains them
    // one at a time (see uploadQueue.js).
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    setShowPickerSheet(false);
    if (!result.canceled) {
      for (const asset of result.assets ?? []) {
        const { uri, name, mimeType } = asset;
        try {
          await enqueue(uri, name, mimeType ?? "application/octet-stream", folderId);
        } catch {
          reportUploadError(name);
        }
      }
    }
  }

  async function pickPhoto() {
    // See takePhoto's comment — sheet closes only after the picker resolves, not before.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
    });
    setShowPickerSheet(false);
    if (!result.canceled) {
      const assets = result.assets ?? [];
      for (let i = 0; i < assets.length; i++) {
        const { uri, type, fileName, mimeType } = assets[i];
        // mediaTypes includes videos, so the fallback name/mime must be media-aware — a video
        // without a fileName would otherwise be stored as .jpg / image/jpeg, breaking thumbnailing
        // and playback. The index keeps each row's dest path distinct within a multi-select batch.
        const isVideo = type === "video" || mimeType?.startsWith("video/");
        const name = fileName ?? `${isVideo ? "video" : "photo"}-${Date.now()}-${i}.${isVideo ? "mp4" : "jpg"}`;
        const resolvedMime = mimeType ?? (isVideo ? "video/mp4" : "image/jpeg");
        try {
          await enqueue(uri, name, resolvedMime, folderId);
        } catch {
          reportUploadError(name);
        }
      }
    }
  }

  return (
    <>
      <View className="absolute bottom-8 right-6">
        {activeCount > 0 ? (
          <View className="absolute -top-2 -right-2 bg-primary rounded-full min-w-5 h-5 px-1 items-center justify-center border-2 border-background">
            <Text size="xs" className="text-white font-bold">
              {activeCount}
            </Text>
          </View>
        ) : null}
        <IconButton
          icon={<Upload size={22} color="white" />}
          variant="primary"
          size="lg"
          onPress={() => setShowPickerSheet(true)}
        />
      </View>

      <GlassBottomSheet visible={showPickerSheet} onClose={() => setShowPickerSheet(false)}>
        <View className="p-4 gap-2">
          <Text size="sm" bold className="text-secondary mb-2 px-1">
            Upload
          </Text>
          <View className="gap-1">
            <MenuSheetRow icon={FolderOpen} label="Pick file" tint="alt" onPress={pickFile} />
            <MenuSheetRow icon={ImageIcon} label="Pick photo or video" tint="primary" onPress={pickPhoto} />
            <MenuSheetRow icon={Camera} label="Take photo" tint="success" onPress={takePhoto} />
          </View>
          {cameraDenied ? (
            <Text size="xs" className="text-danger px-1">
              Camera permission denied — enable it in system settings
            </Text>
          ) : null}
          {onCreateFolder ? (
            <>
              <Divider spacingSize="sm" />
              <MenuSheetRow
                icon={FolderPlus}
                label="New folder"
                tint="neutral"
                onPress={() => {
                  setShowPickerSheet(false);
                  onCreateFolder();
                }}
              />
            </>
          ) : null}
          <Button variant="ghost" onPress={() => setShowPickerSheet(false)}>
            <ButtonText>Cancel</ButtonText>
          </Button>
        </View>
      </GlassBottomSheet>
    </>
  );
}
