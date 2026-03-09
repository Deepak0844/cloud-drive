// React core & third-party libraries
import React from "react";
import { Layout } from "antd";
import { MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined } from "@ant-design/icons";

// Components
import NotificationDropdown from "./NotificationDropdown";
import UserProfileDropdown from "./UserProfileDropdown";
import Button from "@shared-components/components/button";

const { Header } = Layout;

function Navbar({ isMobile, setDrawerVisible, collapsed, setCollapsed }) {
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
