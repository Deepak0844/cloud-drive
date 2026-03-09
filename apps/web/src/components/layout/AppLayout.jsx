import React, { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useDispatch } from "react-redux";
import MainLayout from "./MainLayout";

import baseApi from "@services/api/api";
import { useSubscribeToSocketEventsQuery } from "@services/api/socketApi";

/**
 * Layout wrapper for protected routes.
 * Wraps pages in MainLayout and provides an Outlet for nested routes.
 */
function AppLayout() {
  const dispatch = useDispatch();

  // Activate the RTK Query socket subscription.
  // This lives inside AppLayout (which is inside ProtectedRoute),
  // so the user token is guaranteed to be available.
  useSubscribeToSocketEventsQuery();

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
