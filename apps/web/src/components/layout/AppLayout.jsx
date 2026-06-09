// React core & third-party libraries
import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Outlet } from "react-router-dom";

// Services (RTK Query hooks)
import baseApi from "@services/api/api";
import { useSubscribeToSocketEventsQuery } from "@services/api/socketApi";

// Hooks
import { usePushNotification } from "@hooks/usePushNotification";

// Components
import MainLayout from "./MainLayout";

/**
 * Layout wrapper for protected routes.
 * Wraps pages in MainLayout and provides an Outlet for nested routes.
 */
function AppLayout() {
  // Custom & shared hooks
  const dispatch = useDispatch();

  // RTK Query hooks
  // Activate the RTK Query socket subscription.
  // This lives inside AppLayout (which is inside ProtectedRoute),
  // so the user token is guaranteed to be available.
  useSubscribeToSocketEventsQuery();
  usePushNotification();

  // useEffect
  useEffect(() => {
    return () => {
      // Reset all cached RTK Query data when the protected application unmounts (e.g., on logout)
      dispatch(baseApi.util.resetApiState());
    };
  }, [dispatch]);

  // Render
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

export default AppLayout;
