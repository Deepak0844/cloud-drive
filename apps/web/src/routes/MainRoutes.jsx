import React from "react";

// HOC
import ProtectedRoute from "@/components/hoc/ProtectedRoute";

// Constants
import PageUrls from "@/constants/pageUrls";
import { Roles } from "@/constants/generalConstants";

// Pages
import RoleBasedDefaultPage from "./RoleBasedDefaultPage";
import MyFilesPage from "@/pages/my-files/MyFilesPage";
import TrashPage from "@/pages/trash/TrashPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";

// Layout
import AppLayout from "@/components/layout/AppLayout";

const USER_ONLY = [Roles.USER];
const ADMIN_ONLY = [Roles.ADMIN];

export const MainRoutes = {
  path: PageUrls.DashboardPage,
  // Any authenticated user may enter the shell; inner routes refine further
  element: (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  ),
  children: [
    {
      index: true,
      element: (
        <ProtectedRoute>
          <RoleBasedDefaultPage />
        </ProtectedRoute>
      ),
    },
    {
      path: PageUrls.MyFilesPage,
      element: (
        <ProtectedRoute allowedRoles={USER_ONLY}>
          <MyFilesPage />
        </ProtectedRoute>
      ),
    },
    {
      path: PageUrls.TrashPage,
      element: (
        <ProtectedRoute allowedRoles={USER_ONLY}>
          <TrashPage />
        </ProtectedRoute>
      ),
    },
    {
      path: PageUrls.SettingsPage,
      element: (
        <ProtectedRoute allowedRoles={USER_ONLY}>
          <SettingsPage />
        </ProtectedRoute>
      ),
    },
    {
      path: PageUrls.AdminPage,
      element: (
        <ProtectedRoute allowedRoles={ADMIN_ONLY}>
          <AdminDashboardPage />
        </ProtectedRoute>
      ),
    },
  ],
};
