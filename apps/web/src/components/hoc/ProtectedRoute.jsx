import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// utils
import AuthUtils from "@/utils/authUtils";

// constants
import PageUrls from "@/constants/pageUrls";

/**
 * Routes which needs the USER Authenticated.
 */
function ProtectedRoute({ children, loginPageUrl = PageUrls.LoginPage }) {
  const location = useLocation();

  if (!AuthUtils.isUserAuthenticated()) {
    return <Navigate to={loginPageUrl} state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
