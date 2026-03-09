// React core & third-party libraries
import React from "react";
import { Layout } from "antd";
import { MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { useLocation } from "react-router-dom";

// Components
import NotificationDropdown from "./NotificationDropdown";
import UserProfileDropdown from "./UserProfileDropdown";
import Button from "@shared-components/components/button";

// Constants
import PageNames from "@constants/pageNames";
import PageUrls from "@constants/pageUrls";

const { Header } = Layout;

function Navbar({ isMobile, setDrawerVisible, collapsed, setCollapsed }) {
  const { pathname } = useLocation();

  function getCurrentPageName() {
    if (pathname === PageUrls.DashboardPage || pathname === PageUrls.MyFilesPage) return PageNames.MY_FILES;
    if (pathname.startsWith(PageUrls.PhotosPage)) return PageNames.PHOTOS;
    if (pathname.startsWith(PageUrls.RecentPage)) return PageNames.RECENT;
    if (pathname.startsWith(PageUrls.FavoritesPage)) return PageNames.FAVORITES;
    if (pathname.startsWith(PageUrls.TrashPage)) return PageNames.TRASH;
    if (pathname.startsWith(PageUrls.SettingsPage)) return PageNames.SETTINGS;
    if (pathname.startsWith(PageUrls.AdminPage)) return PageNames.ADMIN;
    return "Cloud Drive";
  }

  // Render
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
        <span className="text-sm sm:text-base font-bold text-label tracking-tight">{getCurrentPageName()}</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <NotificationDropdown />
        <div className="w-px h-6 bg-border-base mx-1 hidden sm:block"></div>
        <UserProfileDropdown isMobile={isMobile} />
      </div>
    </Header>
  );
}

export default Navbar;
