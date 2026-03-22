// React core & third-party libraries
import React from "react";
import {
  LayoutDashboard,
  Trash2,
  FolderOpen,
  History,
  Image as ImageIcon,
  Settings,
  Star,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
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

function Sidebar({ collapsed, setCollapsed, isMobile }) {
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
      activeClass: "sidebar-active-violet",
    },
    {
      key: PageUrls.PhotosPage,
      icon: <ImageIcon size={20} strokeWidth={2.5} />,
      label: PageNames.PHOTOS,
      roles: [Roles.USER],
      activeClass: "sidebar-active-cyan",
    },
    {
      key: PageUrls.RecentPage,
      icon: <History size={20} strokeWidth={2.5} />,
      label: PageNames.RECENT,
      roles: [Roles.USER],
      activeClass: "sidebar-active-orange",
    },
    {
      key: PageUrls.FavoritesPage,
      icon: <Star size={20} strokeWidth={2.5} />,
      label: PageNames.FAVORITES,
      roles: [Roles.USER],
      activeClass: "sidebar-active-gold",
    },
    {
      key: PageUrls.TrashPage,
      icon: <Trash2 size={20} strokeWidth={2.5} />,
      label: PageNames.TRASH,
      roles: [Roles.USER],
      activeClass: "sidebar-active-crimson",
    },
    {
      key: PageUrls.SettingsPage,
      icon: <Settings size={20} strokeWidth={2.5} />,
      label: PageNames.SETTINGS,
      roles: [Roles.USER],
      activeClass: "sidebar-active-violet",
    },
    {
      key: PageUrls.AdminPage,
      icon: <LayoutDashboard size={20} strokeWidth={2.5} />,
      label: PageNames.ADMIN,
      roles: [Roles.ADMIN],
      activeClass: "sidebar-active-indigo",
    },
    {
      key: PageUrls.AdminUsersPage,
      icon: <Users size={20} strokeWidth={2.5} />,
      label: PageNames.ADMIN_USERS,
      roles: [Roles.ADMIN],
      activeClass: "sidebar-active-indigo",
    },
    {
      key: PageUrls.AdminQuotaPage,
      icon: <Zap size={20} strokeWidth={2.5} />,
      label: PageNames.ADMIN_QUOTA,
      roles: [Roles.ADMIN],
      activeClass: "sidebar-active-indigo",
    },
  ];

  // Filter based on current user's role
  const menuItems = allMenuItems.filter((item) => item.roles.includes(userRole));

  // Render
  return (
    <aside
      className={`bg-sidebar shadow-premium z-20 border-r border-sidebar-border overflow-visible transition-all duration-300 ${
        isMobile ? "h-full w-full" : "sticky top-0 h-screen"
      } ${collapsed ? "w-[80px]" : "w-[260px]"}`}
    >
      {/* Edge Toggle Button */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-50 w-6 h-6 flex items-center justify-center bg-sidebar border border-sidebar-border rounded-full shadow-premium text-label-tertiary hover:text-white hover:bg-sidebar-accent transition-all group"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          )}
        </button>
      )}

      <div className="relative h-full flex flex-col">
        <div className={`h-16 flex items-center mb-2 overflow-hidden px-6`}>
          <motion.div layout className="flex items-center min-w-0" transition={{ duration: 0.3 }}>
            <motion.div
              layout
              className={`w-9 h-9 shrink-0 flex items-center justify-center bg-white/10 rounded-xl p-1.5 border border-white/5 ${collapsed ? "" : "mr-3"}`}
              transition={{ duration: 0.3 }}
            >
              <img src="/logo.png" alt="Cloud Drive Logo" className="w-full h-full object-contain" />
            </motion.div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="font-black text-xl tracking-tighter text-gradient-primary whitespace-nowrap italic uppercase overflow-hidden"
                >
                  Cloud Drive
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.key || (item.key !== "/" && pathname.startsWith(item.key));
            return (
              <Link
                key={item.key}
                to={item.key}
                className={`flex items-center rounded-xl transition-all duration-200 group ${
                  collapsed ? "justify-center px-0 py-3 mb-2" : "px-3 py-2.5 mb-1"
                } ${
                  isActive
                    ? `${item.activeClass} shadow-glow-sm`
                    : "text-label-secondary hover:bg-white/5 hover:text-white"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <div
                  className={`${isActive ? "text-inherit" : "text-label-tertiary group-hover:text-white"} ${collapsed ? "mr-0" : "mr-3"}`}
                >
                  {item.icon}
                </div>
                {!collapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* NAS-style Storage Section - Only for Users */}
        {userRole === Roles.USER && (
          <div
            className={`px-4 pb-8 transition-all duration-300 ${collapsed ? "opacity-0 translate-y-4 pointer-events-none hidden" : "opacity-100 translate-y-0"}`}
          >
            <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 shadow-inner group">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[10px] font-black text-label-tertiary uppercase tracking-[0.15em]">
                  Drive Capacity
                </span>
                <span className="text-xs font-black text-primary italic">
                  {quotaData?.data ? quotaData.data.percentage.toFixed(1) : 0}%
                </span>
              </div>

              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden mb-3 border border-white/5">
                <div
                  className="bg-gradient-aurora h-full rounded-full shadow-glow-sm transition-all duration-1000"
                  style={{ width: `${quotaData?.data?.percentage || 0}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-label-tertiary uppercase tracking-tighter">
                  {quotaData?.data ? formatBytes(quotaData.data.used_bytes) : "0 B"} /{" "}
                  {quotaData?.data ? formatBytes(quotaData.data.quota_bytes) : "0 B"}
                </p>
                <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_var(--success)] animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
