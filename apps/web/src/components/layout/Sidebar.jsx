// React core & third-party libraries
import React from "react";
import { SlidersHorizontal, Trash2, FolderOpen, History, Image as ImageIcon, Settings, Star } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation, Link } from "react-router-dom";

// Shared packages (shared/*)
import { Roles } from "@shared-constants/constants";
import { formatBytes } from "@shared-utils/utils";

// Constants
import PageNames from "@constants/pageNames";
import PageUrls from "@constants/pageUrls";

// Utils
import AuthUtils from "@utils/authUtils";

// Services (RTK Query hooks)
import { useGetQuotaUsageQuery } from "@services/api/quotaApi";

// Hooks
import { useCurrentUser } from "@hooks/useCurrentUser";

function Sidebar({ collapsed, isMobile }) {
  // Custom & shared hooks
  const { pathname } = useLocation();
  const { role: serverRole } = useCurrentUser();

  // Derived / computed variables (part 1)
  // Prefer server data; fallback to local storage during initial load
  const userRole = serverRole ?? AuthUtils.getUserRole();
  const isAdmin = userRole === Roles.ADMIN;

  // RTK Query hooks
  const { data: quotaData } = useGetQuotaUsageQuery(undefined, {
    skip: isAdmin,
  });

  // Derived / computed variables (part 2)
  const allMenuItems = [
    {
      key: PageUrls.MyFilesPage,
      icon: <FolderOpen size={20} strokeWidth={2.5} />,
      label: PageNames.MY_FILES,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.PhotosPage,
      icon: <ImageIcon size={20} strokeWidth={2.5} />,
      label: PageNames.PHOTOS,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.RecentPage,
      icon: <History size={20} strokeWidth={2.5} />,
      label: PageNames.RECENT,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.FavoritesPage,
      icon: <Star size={20} strokeWidth={2.5} />,
      label: PageNames.FAVORITES,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.TrashPage,
      icon: <Trash2 size={20} strokeWidth={2.5} />,
      label: PageNames.TRASH,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.SettingsPage,
      icon: <Settings size={20} strokeWidth={2.5} />,
      label: PageNames.SETTINGS,
      roles: [Roles.USER],
    },
    {
      key: PageUrls.AdminPage,
      icon: <SlidersHorizontal size={20} strokeWidth={2.5} />,
      label: PageNames.ADMIN,
      roles: [Roles.ADMIN],
    },
  ];

  // Filter based on current user's role
  const menuItems = allMenuItems.filter((item) => item.roles.includes(userRole));

  // Render
  return (
    <aside
      className={`bg-white shadow-xl z-20 border-r border-line/50 overflow-visible transition-all duration-300 ${
        isMobile ? "h-full w-full" : "sticky top-0 h-screen"
      } ${collapsed ? "w-[80px]" : "w-[260px]"}`}
    >
      <div className="relative h-full flex flex-col">
        <div className={`h-16 flex items-center mb-2 overflow-hidden ${collapsed ? "justify-center px-0" : "px-4"}`}>
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

        <nav className="flex-1 px-3 py-2 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.key || (item.key !== "/" && pathname.startsWith(item.key));
            return (
              <Link
                key={item.key}
                to={item.key}
                className={`flex items-center rounded-xl transition-all duration-200 group ${
                  collapsed ? "justify-center px-0 py-3 mb-2" : "px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-label hover:bg-surface-alt hover:text-primary"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div
                  className={`${isActive ? "text-primary" : "text-label-secondary group-hover:text-primary"} ${collapsed ? "mr-0" : "mr-3"}`}
                >
                  {item.icon}
                </div>
                {!collapsed && <span className="font-bold text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* NAS-style Storage Section - Only for Users */}
        {userRole === Roles.USER && (
          <div
            className={`px-4 pb-6 transition-all duration-300 ${collapsed ? "opacity-0 translate-y-4 pointer-events-none hidden" : "opacity-100 translate-y-0"}`}
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
    </aside>
  );
}

export default Sidebar;
