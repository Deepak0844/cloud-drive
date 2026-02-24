import {
  BellOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
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

// hooks
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// constants
import { STORAGE_KEYS } from "@/constants/generalConstants";

// utils
import LocalStorage from "@/utils/localStorageUtils";

// components
import Button from "@shared-components/components/button";
import Dropdown from "@shared-components/components/dropdown";

const { Header } = Layout;
const { Text } = Typography;

// Mock Notifications
const initialNotifications = [
  {
    id: 1,
    title: "Storage Alert",
    description: "You have used 85% of your storage quota.",
    time: "10 min ago",
    read: false,
    type: "warning",
    icon: <WarningOutlined className="text-warning" />,
  },
  {
    id: 2,
    title: "File Uploaded",
    description: "Project_Specs.pdf uploaded successfully.",
    time: "1 hour ago",
    read: false,
    type: "success",
    icon: <CheckCircleOutlined className="text-success" />,
  },
  {
    id: 3,
    title: "New Login",
    description: "New login detected from Mac OS Chrome.",
    time: "2 hours ago",
    read: true,
    type: "info",
    icon: <InfoCircleOutlined className="text-primary" />,
  },
  {
    id: 4,
    title: "Quota Requested",
    description: "Your request for 5GB increase is pending approval.",
    time: "3 hours ago",
    read: false,
    type: "info",
    icon: <CloudServerOutlined className="text-info" />,
  },
  {
    id: 5,
    title: "System Update",
    description: "NAS system successfully updated to v2.4.0.",
    time: "5 hours ago",
    read: true,
    type: "success",
    icon: <CheckCircleOutlined className="text-success" />,
  },
];

function Navbar({ isMobile, setDrawerVisible, collapsed, setCollapsed }) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { logout } = useAuth();
  const { user: serverUser } = useCurrentUser();

  // Prefer server-authoritative data; fall back to localStorage during initial load
  const localUser = LocalStorage.get(STORAGE_KEYS.USER);
  const displayName = serverUser?.name ?? localUser?.name ?? "User";
  const displayEmail = serverUser?.email ?? localUser?.email ?? "";

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleLogout() {
    try {
      await logout();
      message.success("Logged out successfully!");
    } catch {
      // Errors handled by hook
    }
  }

  function markAsRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function handleNotificationClick(item) {
    markAsRead(item.id);
    message.info(`Opening: ${item.title}`);
    setNotificationOpen(false);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    message.success("All notifications marked as read");
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
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`px-3 py-3 hover:bg-surface-dim cursor-pointer transition-all border-b border-line last:border-0 flex gap-3 items-start ${!item.read ? "bg-primary-light/20" : ""}`}
            onClick={() => handleNotificationClick(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleNotificationClick(item);
            }}
            role="button"
            tabIndex={0}
          >
            <div
              className={`flex-none w-10 h-10 rounded-xl flex items-center justify-center ${!item.read ? "bg-surface shadow-sm border border-primary-light" : "bg-surface-alt border border-transparent"}`}
            >
              {item.icon}
            </div>
            <div className="grow min-w-0">
              <div className="flex justify-between items-start w-full">
                <Text
                  strong={!item.read}
                  className={`text-sm truncate mr-2 ${!item.read ? "text-label" : "text-label-secondary"}`}
                >
                  {item.title}
                </Text>
                <Text className="flex-none text-[10px] text-label-tertiary font-medium">{item.time}</Text>
              </div>
              <div className="flex flex-col">
                <Text className="text-xs text-label-secondary line-clamp-2 mt-0.5">{item.description}</Text>
                {!item.read && <Badge status="processing" className="mt-1" />}
              </div>
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <div className="p-12 text-center text-label-tertiary">
            <BellOutlined className="text-3xl mb-3 opacity-30" />
            <p className="text-sm font-medium">No new notifications</p>
          </div>
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
      onClick: () => navigate("/settings"),
    },
    {
      key: "settings",
      label: "Settings",
      icon: <SettingOutlined />,
      className: "font-semibold rounded-lg",
      onClick: () => navigate("/settings"),
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
