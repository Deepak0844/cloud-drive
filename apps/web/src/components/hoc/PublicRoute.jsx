import React from "react";
import { Navigate } from "react-router-dom";

// utils
import AuthUtils from "@/utils/authUtils";

// constants
import PageUrls from "@/constants/pageUrls";

/**
 * Routes which needs the USER Unauthenticated (e.g. Login).
 * Redirects to dashboard if already logged in.
 */
function PublicRoute({ children, dashboardUrl = PageUrls.DashboardPage }) {
  if (AuthUtils.isUserAuthenticated()) {
    return <Navigate to={dashboardUrl} replace />;
  }

  return children;
}

export default PublicRoute;
