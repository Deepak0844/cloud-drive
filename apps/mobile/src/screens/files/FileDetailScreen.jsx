import React from "react";
import { View, Image, Pressable, ScrollView } from "react-native";
import SkeletonPlaceholder from "react-native-skeleton-placeholder";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Download, Share2 } from "lucide-react-native";

// Rtk
import { useGetFilesQuery } from "@api/fileApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import Button, { ButtonText } from "@components/ui/button/Button";

function MetaRow({ label = "", value = "" }) {
  return (
    <View className="flex-row justify-between py-3 border-b border-border">
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
  const { colors } = useTheme();

  const { data, isLoading } = useGetFilesQuery(undefined, {
    selectFromResult: ({ data: result, ...rest }) => ({
      data: result?.items?.find((f) => f.id === fileId) ?? null,
      ...rest,
    }),
  });

  const isImage = data?.mimeType?.startsWith("image/");

  return (
    <SafeAreaView className="flex-1 bg-surface-DEFAULT" edges={["top"]}>
      <View className="flex-row items-center px-2 py-3 border-b border-border gap-1">
        <Pressable
          onPress={() => navigation.goBack()}
          android_ripple={{ color: colors.ripple.DEFAULT }}
          hitSlop={8}
          className="p-2"
        >
          <ChevronLeft size={22} color={colors.neutral.DEFAULT} />
        </Pressable>
        <Text size="2xl" bold numberOfLines={1} className="flex-1">
          {data?.name ?? "File"}
        </Text>
      </View>

      <SkeletonPlaceholder enabled={isLoading} borderRadius={4}>
        <ScrollView className="flex-1">
          {isImage && data?.previewUrl ? (
            <Image
              source={{ uri: data.previewUrl }}
              style={{ width: "100%", height: 240 }}
              resizeMode="contain"
              className="bg-surface-card"
            />
          ) : (
            <View className="h-40 bg-surface-card items-center justify-center">
              <Text size="sm" className="text-secondary">
                No preview available
              </Text>
            </View>
          )}

          <View className="px-4 py-2">
            <MetaRow label="Name" value={data?.name ?? "—"} />
            <MetaRow label="Size" value={formatBytes(data?.size)} />
            <MetaRow label="Type" value={data?.mimeType ?? "—"} />
          </View>

          <View className="px-4 pt-2 gap-3">
            <Button size="lg" disabled>
              <Download size={18} />
              <ButtonText>Download (Phase 5)</ButtonText>
            </Button>
            <Button variant="outline" size="lg" disabled>
              <Share2 size={18} />
              <ButtonText>Share (Phase 5)</ButtonText>
            </Button>
          </View>
        </ScrollView>
      </SkeletonPlaceholder>
    </SafeAreaView>
  );
}
