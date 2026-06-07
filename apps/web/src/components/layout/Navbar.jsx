// React core & third-party libraries
import PropTypes from "prop-types";
import React from "react";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";

// Components
import NotificationDropdown from "./NotificationDropdown";
import UserProfileDropdown from "./UserProfileDropdown";
import { Button } from "@components/ui/button";

// Constants
import PageNames from "@constants/pageNames";
import PageUrls from "@constants/pageUrls";

function Navbar({ isMobile, setDrawerVisible }) {
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
    <header className="glass-bar sticky top-0 z-40 w-full flex justify-between items-center h-16 transition-all text-label px-4 sm:px-8">
      <div className="flex items-center gap-4 sm:gap-6">
        {isMobile && (
          <Button
            type="text"
            icon={<Menu size={20} />}
            onClick={() => setDrawerVisible(true)}
            className="flex items-center justify-center w-10 h-10 hover:bg-surface-alt rounded-xl transition-all"
          />
        )}
        <div className="flex items-center">
          <span className="text-base sm:text-lg font-bold text-label-secondary tracking-tight select-none italic">
            {getCurrentPageName()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <NotificationDropdown />
        <UserProfileDropdown isMobile={isMobile} />
      </div>
    </header>
  );
}

Navbar.propTypes = {
  isMobile: PropTypes.bool.isRequired,
  setDrawerVisible: PropTypes.func.isRequired,
};

export default Navbar;
