// React core & third-party libraries
import React, { useState, useEffect } from "react";

// App-local contexts
import { UploadProvider } from "@contexts/UploadContext";

// Components
import UploadManager from "../files/UploadManager";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { Sheet, SheetContent } from "@components/ui/sheet";

// ---------------------------------------------------------------------------
// Hook — replaces Ant Design Grid.useBreakpoint
// ---------------------------------------------------------------------------
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function MainLayout({ children }) {
  // Local state
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Custom & shared hooks
  const isMobile = useIsMobile();

  // Render
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Mobile slide-in drawer */}
      {isMobile ? (
        <Sheet open={drawerVisible} onOpenChange={setDrawerVisible}>
          <SheetContent side="left" className="w-[260px] p-0 border-none sm:max-w-none">
            <Sidebar
              collapsed={false}
              setCollapsed={() => {}}
              isMobile={true}
              onClose={() => setDrawerVisible(false)}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} isMobile={false} />
      )}

      {/* Main content column */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden transition-all duration-300">
        <Navbar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          isMobile={isMobile}
          setDrawerVisible={setDrawerVisible}
        />
        <main className="flex-1 overflow-y-auto px-4 py-5 focus:outline-none">
          <UploadProvider>
            <div className="w-full max-w-7xl mx-auto">{children}</div>
            <UploadManager />
          </UploadProvider>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
