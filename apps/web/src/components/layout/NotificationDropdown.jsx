// React core & third-party libraries
import React, { useState } from "react";
import { App, Badge, Typography } from "antd";
import {
  BellOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Constants
import { NotificationTypes, TIMEOUTS } from "@shared-constants/constants";

// Services (RTK Query hooks)
import {
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
} from "@services/api/notificationApi";

// Components
import Button from "@shared-components/components/button";
import Dropdown from "@shared-components/components/dropdown";

dayjs.extend(relativeTime);

const { Text } = Typography;

function getNotificationIcon(type) {
  switch (type) {
    case NotificationTypes.STORAGE_ALERT:
      return <CloudServerOutlined className="text-warning" />;
    case NotificationTypes.SECURITY_ALERT:
      return <WarningOutlined className="text-error" />;
    case NotificationTypes.QUOTA_APPROVED:
      return <CheckCircleOutlined className="text-success" />;
    case NotificationTypes.QUOTA_REJECTED:
      return <WarningOutlined className="text-error" />;
    case NotificationTypes.QUOTA_CHANGE:
    case NotificationTypes.QUOTA_REQUEST:
      return <CloudServerOutlined className="text-info" />;
    case NotificationTypes.TRASH_CLEANUP:
      return <DeleteOutlined className="text-secondary" />;
    case NotificationTypes.SYSTEM_ALERT:
    default:
      return <InfoCircleOutlined className="text-primary" />;
  }
}

export default function NotificationDropdown() {
  // Local state
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Custom & shared hooks
  const { message } = App.useApp();

  // RTK Query hooks
  const { data: notificationsData, isLoading: notificationsLoading } = useGetNotificationsQuery(undefined, {
    pollingInterval: TIMEOUTS.NOTIFICATION_POLL_MS,
    skip: !notificationOpen && false,
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  // Derived / computed variables
  const notifications = notificationsData?.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Event handlers
  async function handleNotificationClick(item) {
    if (!item.is_read) {
      try {
        await markAsRead({ id: item._id }).unwrap();
      } catch {
        // Silently fail — the UI will refetch
      }
    }
    setNotificationOpen(false);
  }

  async function handleMarkAllRead() {
    try {
      await markAllAsRead().unwrap();
      message.success("All notifications marked as read");
    } catch {
      message.error("Failed to mark all as read");
    }
  }

  // Render
  const notificationMenu = (
    <div className="w-80 bg-surface rounded-2xl shadow-xl border border-line overflow-hidden p-2">
      <div className="p-4 border-b border-line flex justify-between items-center bg-surface-dim/50">
        <Text strong className="text-base text-label">
          Notifications
        </Text>
        {unreadCount > 0 && (
          <Button
            type="text"
            size="small"
            className="text-xs font-bold text-primary hover:bg-primary-light rounded-lg px-2"
            onClick={handleMarkAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notificationsLoading ? (
          <div className="p-6 text-center text-label-tertiary">
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface-dim rounded-xl" />
              ))}
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-label-tertiary">
            <BellOutlined className="text-3xl mb-3 opacity-30" />
            <p className="text-sm font-medium">No new notifications</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item._id}
              className={`px-3 py-3 hover:bg-surface-dim cursor-pointer transition-all border-b border-line last:border-0 flex gap-3 items-start ${!item.is_read ? "bg-primary-light/20" : ""}`}
              onClick={() => handleNotificationClick(item)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleNotificationClick(item);
              }}
              role="button"
              tabIndex={0}
            >
              <div
                className={`flex-none w-10 h-10 rounded-xl flex items-center justify-center ${!item.is_read ? "bg-surface shadow-sm border border-primary-light" : "bg-surface-alt border border-transparent"}`}
              >
                {getNotificationIcon(item.type)}
              </div>
              <div className="grow min-w-0">
                <div className="flex justify-between items-start w-full">
                  <Text
                    strong={!item.is_read}
                    className={`text-sm truncate mr-2 ${!item.is_read ? "text-label" : "text-label-secondary"}`}
                  >
                    {item.title}
                  </Text>
                  <Text className="flex-none text-[10px] text-label-tertiary font-medium">
                    {dayjs(item.createdAt).fromNow()}
                  </Text>
                </div>
                <div className="flex flex-col">
                  <Text className="text-xs text-label-secondary line-clamp-2 mt-0.5">{item.message}</Text>
                  {!item.is_read && <Badge status="processing" className="mt-1" />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <Dropdown
      popupRender={() => notificationMenu}
      trigger={["click"]}
      open={notificationOpen}
      onOpenChange={setNotificationOpen}
      placement="bottomRight"
      classNames={{ root: "premium-dropdown" }}
    >
      <div className="relative cursor-pointer">
        <Badge count={unreadCount} size="small" offset={[-8, 8]}>
          <Button
            type="text"
            icon={<BellOutlined className={`text-xl ${notificationOpen ? "text-primary" : "text-label-secondary"}`} />}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${notificationOpen ? "bg-primary-light" : "hover:bg-surface-alt"}`}
          />
        </Badge>
      </div>
    </Dropdown>
  );
}
