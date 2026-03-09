// React core & third-party libraries
import React, { useState } from "react";
import { App, Avatar, Tooltip } from "antd";
import { LogoutOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

// Constants
import { STORAGE_KEYS } from "@shared-constants/constants";
import PageUrls from "@constants/pageUrls";

// Utils
import LocalStorage from "@utils/localStorageUtils";

// Hooks
import { useAuth } from "@hooks/useAuth";
import { useCurrentUser } from "@hooks/useCurrentUser";

// Components
import Dropdown from "@shared-components/components/dropdown";

export default function UserProfileDropdown({ isMobile }) {
  // Local state
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Custom & shared hooks
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user: serverUser } = useCurrentUser();

  // Derived / computed variables (part 1)
  // Prefer server-authoritative data; fall back to localStorage during initial load
  const localUser = LocalStorage.get(STORAGE_KEYS.USER);
  const displayName = serverUser?.name ?? localUser?.name ?? "User";
  const displayEmail = serverUser?.email ?? localUser?.email ?? "";

  // Event handlers
  async function handleLogout() {
    try {
      await logout();
      message.success("Logged out successfully!");
    } catch {
      // Errors handled by hook
    }
  }
  // Derived / computed variables (part 2)
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

  // Render
  return (
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
  );
}
