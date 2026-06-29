import React, { useState } from "react";
import { View } from "react-native";
import { Plus, FolderOpen, Image as ImageIcon } from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

// Hooks
import { useUploadQueue } from "@hooks/useUploadQueue";

// Components
import GlassBottomSheet from "@components/ui/glass/GlassBottomSheet";
import IconButton from "@components/ui/icon-button/IconButton";
import Text from "@components/ui/text/Text";
import Button, { ButtonText } from "@components/ui/button/Button";

export default function UploadFab() {
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const { enqueue, queueStatus } = useUploadQueue();

  const activeCount = queueStatus.pending + queueStatus.active;

  async function pickFile() {
    setShowPickerSheet(false);
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      const { uri, name, mimeType } = result.assets[0];
      await enqueue(uri, name, mimeType ?? "application/octet-stream");
    }
  }

  async function pickPhoto() {
    setShowPickerSheet(false);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"] });
    if (!result.canceled && result.assets?.[0]) {
      const { uri, fileName, mimeType } = result.assets[0];
      await enqueue(uri, fileName ?? "photo.jpg", mimeType ?? "image/jpeg");
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

      <GlassBottomSheet visible={showPickerSheet}>
        <View className="p-4 gap-2">
          <Text size="sm" bold className="text-secondary mb-2 px-1">
            Upload
          </Text>
          <Button variant="ghost" onPress={pickFile}>
            <FolderOpen size={18} />
            <ButtonText>Pick file</ButtonText>
          </Button>
          <Button variant="ghost" onPress={pickPhoto}>
            <ImageIcon size={18} />
            <ButtonText>Pick photo or video</ButtonText>
          </Button>
          <Button variant="ghost" onPress={() => setShowPickerSheet(false)}>
            <ButtonText>Cancel</ButtonText>
          </Button>
        </View>
      </GlassBottomSheet>
    </>
  );
}
