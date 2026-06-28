import React from "react";
import { View, Image, ScrollView } from "react-native";
import { Download, Share2 } from "lucide-react-native";

// Rtk
import { useGetFilesQuery } from "@api/fileApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Skeleton from "@components/ui/skeleton/Skeleton";
import Text from "@components/ui/text/Text";
import Button, { ButtonText } from "@components/ui/button/Button";

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

  const { data, isLoading } = useGetFilesQuery(undefined, {
    selectFromResult: ({ data: result, ...rest }) => ({
      data: result?.items?.find((f) => f.id === fileId) ?? null,
      ...rest,
    }),
  });

  const isImage = data?.mimeType?.startsWith("image/");

  return (
    <ScreenLayout>
      <GlassHeader title={data?.name ?? "File"} onBack={() => navigation.goBack()} />

      <Skeleton loading={isLoading}>
        <ScrollView className="flex-1">
          {isImage && data?.previewUrl ? (
            <Image source={{ uri: data.previewUrl }} style={{ width: "100%", height: 240 }} resizeMode="contain" />
          ) : (
            <GlassCard className="m-4">
              <Text size="sm" className="text-secondary text-center">
                No preview available
              </Text>
            </GlassCard>
          )}

          <GlassCard className="m-4">
            <MetaRow label="Name" value={data?.name ?? "—"} />
            <MetaRow label="Size" value={formatBytes(data?.size)} />
            <MetaRow label="Type" value={data?.mimeType ?? "—"} />
          </GlassCard>

          <View className="px-4 gap-3 pb-4">
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
      </Skeleton>
    </ScreenLayout>
  );
}
