// React core & third-party libraries
import PropTypes from "prop-types";
import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// Constants
import PageUrls from "@constants/pageUrls";

// Utils
import AuthUtils from "@utils/authUtils";

/**
 * Route guard that:
 * 1. Redirects unauthenticated users to login.
 * 2. Redirects authenticated users whose role is null/missing.
 * 3. Redirects authenticated users who lack the required role to the 403 error page.
 *
 * @param {string[]} allowedRoles - Roles permitted to access this route.
 *                                  If empty, any authenticated user can access.
 */
function ProtectedRoute({ children, allowedRoles = [], loginPageUrl = PageUrls.LoginPage }) {
  // Custom & shared hooks
  const location = useLocation();

  // Render
  // 1. Not authenticated → go to login
  if (!AuthUtils.isUserAuthenticated()) {
    return <Navigate to={loginPageUrl} state={{ from: location }} replace />;
  }

  // 2. Role check only when specific roles are required
  if (allowedRoles.length > 0) {
    const userRole = AuthUtils.getUserRole();

    // Guard against null/undefined role (corrupted or incomplete login state)
    if (!userRole) {
      AuthUtils.clearSession(); // wipe inconsistent state
      return <Navigate to={loginPageUrl} state={{ from: location }} replace />;
    }

    if (!allowedRoles.includes(userRole)) {
      return (
        <Navigate
          to={PageUrls.ErrorPage}
          state={{ status: 403, message: "You are not authorized to access this page." }}
          replace
        />
      );
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string),
  loginPageUrl: PropTypes.string,
};

export default ProtectedRoute;
