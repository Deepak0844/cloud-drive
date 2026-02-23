import React from "react";
import { Outlet } from "react-router-dom";
import MainLayout from "./MainLayout";

/**
 * Layout wrapper for protected routes.
 * Wraps pages in MainLayout and provides an Outlet for nested routes.
 */
function AppLayout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

export default AppLayout;
