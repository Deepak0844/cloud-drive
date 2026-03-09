import {
  ControlOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  SettingOutlined,
  StarOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

// constants
import PageUrls from "@constants/pageUrls";
import PageNames from "@constants/pageNames";
import { Roles } from "@constants/generalConstants";

// utils
import AuthUtils from "@utils/authUtils";

// hooks
import { useCurrentUser } from "@hooks/useCurrentUser";
import { useGetQuotaUsageQuery } from "@services/api/quotaApi";

// shared utils
import { formatBytes } from "@shared-utils/utils";

const { Sider } = Layout;

function Sidebar({ collapsed, isMobile }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { role: serverRole } = useCurrentUser();

  // Prefer server data; fallback to local storage during initial load
  const userRole = serverRole ?? AuthUtils.getUserRole();
  const isAdmin = userRole === Roles.ADMIN;

  const { data: quotaData } = useGetQuotaUsageQuery(undefined, {
    skip: isAdmin,
  });

  const allMenuItems = [
    {
      key: PageUrls.MyFilesPage,
      icon: <FolderOpenOutlined className="text-lg" />,
      label: <span className="font-semibold">{PageNames.MY_FILES}</span>,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.PhotosPage,
      icon: <PictureOutlined className="text-lg" />,
      label: <span className="font-semibold">{PageNames.PHOTOS}</span>,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.RecentPage,
      icon: <HistoryOutlined className="text-lg" />,
      label: <span className="font-semibold">{PageNames.RECENT}</span>,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.FavoritesPage,
      icon: <StarOutlined className="text-lg" />,
      label: <span className="font-semibold">{PageNames.FAVORITES}</span>,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.TrashPage,
      icon: <DeleteOutlined className="text-lg" />,
      label: <span className="font-semibold">{PageNames.TRASH}</span>,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.SettingsPage,
      icon: <SettingOutlined className="text-lg" />,
      label: <span className="font-semibold">{PageNames.SETTINGS}</span>,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.AdminPage,
      icon: <ControlOutlined className="text-lg" />,
      label: <span className="font-semibold">{PageNames.ADMIN}</span>,
      roles: [Roles.ADMIN],
    },
  ];

  // Filter based on current user's role
  const menuItems = allMenuItems
    .filter((item) => item.roles.includes(userRole))
    .map(({ roles: _roles, ...rest }) => rest);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      theme="light"
      className={`shadow-xl z-20 border-r border-line/50 overflow-visible ${isMobile ? "h-full" : "sticky top-0 h-screen"}`}
      width={260}
      collapsedWidth={80}
    >
      <div className="relative h-full">
        <div className="h-16 flex items-center px-4 mb-2 overflow-hidden">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center mr-2">
            <img src="/logo.png" alt="Cloud Drive Logo" className="w-full h-full object-contain" />
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="font-black text-lg tracking-tight text-gradient-primary whitespace-nowrap"
              >
                Cloud Drive
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="sidebar-menu border-none px-2"
        />

        {/* NAS-style Storage Section - Only for Users */}
        {userRole === Roles.USER && (
          <div
            className={`absolute bottom-6 left-0 right-0 px-4 transition-all duration-300 ${collapsed ? "opacity-0 translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"}`}
          >
            <div className="bg-surface-dim/80 backdrop-blur-sm p-4 rounded-2xl border border-line shadow-sm group">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[10px] font-bold text-label-tertiary uppercase tracking-wider">
                  Storage Status
                </span>
                <span className="text-xs font-black text-primary">
                  {quotaData?.data ? Math.round(quotaData.data.percentage) : 0}%
                </span>
              </div>

              <div className="w-full bg-border-base/50 rounded-full h-1.5 overflow-hidden mb-3">
                <div
                  className="bg-linear-to-r from-primary to-secondary h-full rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)] transition-all duration-1000"
                  style={{ width: `${quotaData?.data?.percentage || 0}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-start gap-2">
                <p className="text-[10px] font-medium text-label-secondary">
                  {quotaData?.data ? formatBytes(quotaData.data.used_bytes) : "0 B"} of{" "}
                  {quotaData?.data ? formatBytes(quotaData.data.quota_bytes) : "0 B"} used
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sider>
  );
}

export default Sidebar;
