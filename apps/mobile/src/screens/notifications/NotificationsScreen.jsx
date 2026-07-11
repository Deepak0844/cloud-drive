import React from "react";
import { View, FlatList, Pressable } from "react-native";
import { Bell, CheckCheck } from "lucide-react-native";

// Rtk
import { useGetNotificationsQuery, useMarkReadMutation, useMarkAllReadMutation } from "@api/notificationApi";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Skeleton from "@components/ui/skeleton/Skeleton";
import EmptyState from "@components/ui/empty-state/EmptyState";
import Text from "@components/ui/text/Text";
import Button, { ButtonSpinner, ButtonText } from "@components/ui/button/Button";

function formatRelativeTime(ts) {
  if (!ts) return "";
  const diffMs = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(ts));
}

function NotificationRow({ item = {}, onPress = () => {} }) {
  const { colors } = useTheme();
  const id = String(item._id ?? item.id);
  const unread = item.is_read === false;

  return (
    <Pressable onPress={() => onPress(id, unread)} android_ripple={{ color: colors.ripple.glass }}>
      <GlassCard className="mx-4 my-1">
        <View className="flex-row items-start gap-3">
          <View
            className={`w-9 h-9 rounded-xl items-center justify-center ${unread ? "bg-primary/10" : "bg-neutral-subtle"}`}
          >
            <Bell size={16} color={unread ? colors.primary.light : colors.neutral.DEFAULT} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text size="sm" bold={unread} numberOfLines={1} className="flex-1">
                {item.title}
              </Text>
              {unread ? <View className="w-2 h-2 rounded-full bg-primary" /> : null}
            </View>
            <Text size="xs" className="text-secondary mt-0.5" numberOfLines={2}>
              {item.message}
            </Text>
            <Text size="2xs" className="text-secondary mt-1">
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

export default function NotificationsScreen({ navigation = {} }) {
  const { data, isLoading, isFetching, refetch } = useGetNotificationsQuery();
  const [markRead] = useMarkReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] = useMarkAllReadMutation();

  const items = Array.isArray(data) ? data : [];
  const hasUnread = items.some((n) => n.is_read === false);

  function handleRowPress(id, unread) {
    if (unread) {
      markRead({ id });
    }
  }

  const markAllButton = hasUnread ? (
    <Button variant="ghost" size="sm" onPress={() => markAllRead()} disabled={isMarkingAll}>
      {isMarkingAll ? <ButtonSpinner /> : <CheckCheck size={16} />}
      <ButtonText>Mark all read</ButtonText>
    </Button>
  ) : null;

  return (
    <ScreenLayout>
      <GlassHeader title="Notifications" onBack={() => navigation.goBack()} right={markAllButton} />

      <Skeleton loading={isLoading}>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item._id ?? item.id)}
          renderItem={({ item }) => <NotificationRow item={item} onPress={handleRowPress} />}
          refreshing={isFetching && !isLoading}
          onRefresh={refetch}
          contentContainerClassName="py-2"
          ListEmptyComponent={isLoading ? null : <EmptyState message="No notifications" />}
        />
      </Skeleton>
    </ScreenLayout>
  );
}
