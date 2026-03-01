import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useDispatch } from "react-redux";
import MainLayout from "./MainLayout";

import baseApi from "../../store/api/baseApi";

/**
 * Layout wrapper for protected routes.
 * Wraps pages in MainLayout and provides an Outlet for nested routes.
 */
function AppLayout() {
  const dispatch = useDispatch();

  useEffect(() => {
    return () => {
      // Reset all cached RTK Query data when the protected application unmounts (e.g., on logout)
      dispatch(baseApi.util.resetApiState());
    };
  }, [dispatch]);

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

export default AppLayout;
