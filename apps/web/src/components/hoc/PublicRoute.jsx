// React core & third-party libraries
import PropTypes from "prop-types";
import React from "react";
import { Navigate } from "react-router-dom";

// Constants
import PageUrls from "@constants/pageUrls";

// Utils
import AuthUtils from "@utils/authUtils";

/**
 * Routes which needs the USER Unauthenticated (e.g. Login).
 * Redirects to dashboard if already logged in.
 */
function PublicRoute({ children, dashboardUrl = PageUrls.DashboardPage }) {
  // Render
  if (AuthUtils.isUserAuthenticated()) {
    return <Navigate to={dashboardUrl} replace />;
  }

  return children;
}

PublicRoute.propTypes = {
  children: PropTypes.node.isRequired,
  dashboardUrl: PropTypes.string,
};

export default PublicRoute;
