import React from "react";
import { Navigate } from "react-router-dom";

// Utils
import AuthUtils from "@/utils/authUtils";

// Constants
import PageUrls from "@/constants/pageUrls";
import { Roles } from "@/constants/generalConstants";

// Pages (not needed anymore — we Navigate instead of render)

/**
 * Smart index route — redirects to the right default page based on the user's role.
 * Admins → /admin, regular users → My Files.
 */
function RoleBasedDefaultPage() {
  const role = AuthUtils.getUserRole();
  if (role === Roles.ADMIN) {
    return <Navigate to={PageUrls.AdminPage} replace />;
  }
  return <Navigate to={PageUrls.MyFilesPage} replace />;
}

export default RoleBasedDefaultPage;
