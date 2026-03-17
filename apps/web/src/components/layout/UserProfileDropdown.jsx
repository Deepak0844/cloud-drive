// React core & third-party libraries
import React, { useState } from "react";
import { message } from "antd";
import { LogOut, Settings, User } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@components/ui/tooltip";

export default function UserProfileDropdown({ isMobile }) {
  // Local state
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Custom & shared hooks

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
      icon: <User size={16} strokeWidth={2.5} />,
      className: "font-semibold rounded-lg",
      onClick: () => navigate(PageUrls.SettingsPage),
    },
    {
      key: "settings",
      label: "Settings",
      icon: <Settings size={16} strokeWidth={2.5} />,
      className: "font-semibold rounded-lg",
      onClick: () => navigate(PageUrls.SettingsPage),
    },
    { type: "divider" },
    {
      key: "logout",
      label: "Sign Out",
      icon: <LogOut size={16} strokeWidth={2.5} />,
      danger: true,
      className: "font-semibold rounded-lg",
      onClick: handleLogout,
    },
  ];

  // Render
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={dropdownOpen ? false : undefined}>
        <TooltipTrigger asChild>
          <div>
            <Dropdown
              menu={{ items: menuItems }}
              placement="bottomRight"
              trigger={["click"]}
              onOpenChange={setDropdownOpen}
              align={{ offset: [0, 12] }}
              classNames={{ root: "min-w-[200px] premium-dropdown p-1" }}
            >
              <div className="group flex items-center gap-2 cursor-pointer hover:bg-surface-dim/80 p-1.5 rounded-2xl transition-all duration-300 border border-transparent hover:border-line-base active:scale-95">
                <div
                  className={`flex items-center justify-center rounded-full bg-linear-to-tr from-primary to-secondary text-white border-2 border-surface shadow-md shrink-0 group-hover:scale-105 transition-transform ${isMobile ? "w-8 h-8" : "w-10 h-10"}`}
                >
                  <User size={isMobile ? 16 : 20} strokeWidth={2.5} />
                </div>
              </div>
            </Dropdown>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="bg-slate-800 text-slate-50 border-none px-3 py-2 shadow-xl"
        >
          <p className="font-bold text-sm mb-0.5">{displayName}</p>
          <p className="text-[10px] opacity-80">{displayEmail}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
