import {
  BellOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { App, Avatar, Badge, Layout, Tooltip, Typography } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// hooks
import { useAuth } from "@hooks/useAuth";
import { useCurrentUser } from "@hooks/useCurrentUser";

// constants
import { STORAGE_KEYS, TIMEOUTS, NotificationTypes } from "@shared-constants/constants";
import PageUrls from "@constants/pageUrls";

// utils
import LocalStorage from "@utils/localStorageUtils";

// api
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "@services/api/notificationApi";

// components
import Button from "@shared-components/components/button";
import Dropdown from "@shared-components/components/dropdown";

dayjs.extend(relativeTime);

const { Header } = Layout;
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

function Navbar({ isMobile, setDrawerVisible, collapsed, setCollapsed }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { logout } = useAuth();
  const { user: serverUser } = useCurrentUser();

  // Prefer server-authoritative data; fall back to localStorage during initial load
  const localUser = LocalStorage.get(STORAGE_KEYS.USER);
  const displayName = serverUser?.name ?? localUser?.name ?? "User";
  const displayEmail = serverUser?.email ?? localUser?.email ?? "";

  // Real notification data from API
  const { data: notificationsData, isLoading: notificationsLoading } = useGetNotificationsQuery(undefined, {
    // Poll every 60 seconds to keep notifications fresh
    pollingInterval: TIMEOUTS.NOTIFICATION_POLL_MS,
    skip: !notificationOpen && false, // always fetch so badge count is accurate
  });
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  const notifications = notificationsData?.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleLogout() {
    try {
      await logout();
      message.success("Logged out successfully!");
    } catch {
      // Errors handled by hook
    }
  }

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

  const menuItems = [
    {
      key: "profile",
      label: "My Profile",
      icon: <UserOutlined />,
      className: "font-semibold rounded-lg",
      onClick: () => navigate(PageUrls.SettingsPage),
    },
    {
      key: "settings",
      label: "Settings",
      icon: <SettingOutlined />,
      className: "font-semibold rounded-lg",
      onClick: () => navigate(PageUrls.SettingsPage),
    },
    { type: "divider" },
    {
      key: "logout",
      label: "Sign Out",
      icon: <LogoutOutlined />,
      danger: true,
      className: "font-semibold rounded-lg",
      onClick: handleLogout,
    },
  ];

  return (
    <Header
      className="backdrop-blur-md sticky top-0 z-40 w-full px-5 sm:px-8 flex justify-between items-center border-b border-line h-16 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all text-label"
      style={{ backgroundColor: "var(--bg-glass)", paddingInline: 0 }}
    >
      <div className="flex items-center gap-4 sm:gap-6">
        {isMobile ? (
          <Button
            type="text"
            icon={<MenuOutlined className="text-xl" />}
            onClick={() => setDrawerVisible(true)}
            className="flex items-center justify-center w-10 h-10 hover:bg-surface-alt rounded-xl transition-all"
          />
        ) : (
          <Button
            type="text"
            icon={
              collapsed ? (
                <MenuUnfoldOutlined className="text-xl text-label-secondary hover:text-primary transition-all delay-75" />
              ) : (
                <MenuFoldOutlined className="text-xl text-label-secondary hover:text-primary transition-all delay-75" />
              )
            }
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-10 h-10 hover:bg-surface-alt rounded-xl transition-all border border-transparent"
          />
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
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
                icon={
                  <BellOutlined className={`text-xl ${notificationOpen ? "text-primary" : "text-label-secondary"}`} />
                }
                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${notificationOpen ? "bg-primary-light" : "hover:bg-surface-alt"}`}
              />
            </Badge>
          </div>
        </Dropdown>

        <div className="w-px h-6 bg-border-base mx-1 hidden sm:block"></div>

        <Tooltip
          title={
            <div className="px-2 py-1">
              <p className="font-bold text-sm mb-0">{displayName}</p>
              <p className="text-[10px] opacity-80">{displayEmail}</p>
            </div>
          }
          open={dropdownOpen ? false : undefined}
          placement="bottomRight"
          arrow={false}
          color="#1e293b"
        >
          <Dropdown
            menu={{ items: menuItems }}
            placement="bottomRight"
            trigger={["click"]}
            onOpenChange={setDropdownOpen}
            align={{ offset: [0, 12] }}
            classNames={{ root: "min-w-[200px] premium-dropdown p-1" }}
          >
            <div className="group flex items-center gap-2 cursor-pointer hover:bg-surface-dim/80 p-1.5 rounded-2xl transition-all duration-300 border border-transparent hover:border-line-base active:scale-95">
              <Avatar
                size={isMobile ? "default" : "large"}
                icon={<UserOutlined />}
                className="bg-linear-to-tr from-primary to-secondary text-on-primary border-2 border-surface shadow-md shrink-0 group-hover:scale-105 transition-transform"
              />
            </div>
          </Dropdown>
        </Tooltip>
      </div>
    </Header>
  );
}

export default Navbar;
