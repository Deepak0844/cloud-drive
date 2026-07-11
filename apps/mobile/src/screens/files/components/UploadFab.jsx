import React, { useState } from "react";
import { View } from "react-native";
import { useDispatch } from "react-redux";
import { Plus, FolderOpen, FolderPlus, Camera, Image as ImageIcon } from "lucide-react-native";
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
    setShowPickerSheet(false);
    const result = await ImagePicker.launchCameraAsync();
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
    setShowPickerSheet(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      const { uri, name, mimeType } = result.assets[0];
      try {
        await enqueue(uri, name, mimeType ?? "application/octet-stream", folderId);
      } catch {
        reportUploadError(name);
      }
    }
  }

  async function pickPhoto() {
    setShowPickerSheet(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"] });
    if (!result.canceled && result.assets?.[0]) {
      const { uri, fileName, mimeType } = result.assets[0];
      const name = fileName ?? "photo.jpg";
      try {
        await enqueue(uri, name, mimeType ?? "image/jpeg", folderId);
      } catch {
        reportUploadError(name);
      }
    }
  }

  return (
    <>
      <View className="absolute bottom-6 right-6">
        {activeCount > 0 ? (
          <View className="absolute -top-2 -right-2 z-10 bg-primary rounded-full w-5 h-5 items-center justify-center">
            <Text size="xs" className="text-white font-bold">
              {activeCount}
            </Text>
          </View>
        ) : null}
        <IconButton
          icon={<Plus size={24} color="white" />}
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
