// React core & third-party libraries
import React, { useState } from "react";
import { App as AntdApp, ConfigProvider, Drawer, Grid, Layout } from "antd";

// App-local contexts
import { UploadProvider } from "@contexts/UploadContext";

// Components
import UploadManager from "../files/UploadManager";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const { Content } = Layout;
const { useBreakpoint } = Grid;

function MainLayout({ children }) {
  // Local state
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Custom & shared hooks
  const screens = useBreakpoint();

  // Derived / computed variables
  const isMobile = !screens.md && screens.xs !== undefined;

  // Render
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#3b82f6",
          borderRadius: 8,
          fontFamily: "inherit",
        },
      }}
    >
      <AntdApp>
        <Layout className="h-screen overflow-hidden bg-secondary">
          {isMobile ? (
            <Drawer
              placement="left"
              onClose={() => setDrawerVisible(false)}
              open={drawerVisible}
              size={260}
              styles={{ body: { padding: 0 } }}
              closable={false}
            >
              <Sidebar collapsed={false} setCollapsed={() => {}} isMobile={true} />
            </Drawer>
          ) : (
            <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={false} />
          )}

          <Layout className="transition-all duration-300 ease-in-out h-screen">
            <Navbar
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              isMobile={isMobile}
              setDrawerVisible={setDrawerVisible}
            />
            <Content className="px-4 py-5 h-[calc(100vh-64px)] overflow-y-auto focus:outline-none">
              <UploadProvider>
                <div className="w-full max-w-7xl mx-auto">{children}</div>
                <UploadManager />
              </UploadProvider>
            </Content>
          </Layout>
        </Layout>
      </AntdApp>
    </ConfigProvider>
  );
}

export default MainLayout;
