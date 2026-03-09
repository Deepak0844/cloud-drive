import React from "react";

// HOC
import ProtectedRoute from "@components/hoc/ProtectedRoute";

// Constants
import PageUrls from "@constants/pageUrls";
import { Roles } from "@shared-constants/constants";

// Pages
import RoleBasedDefaultPage from "./RoleBasedDefaultPage";
import MyFilesPage from "@pages/MyFilesPage";
import PhotosPage from "@pages/PhotosPage";
import FavoritesPage from "@pages/FavoritesPage";
import RecentPage from "@pages/RecentPage";
import TrashPage from "@pages/TrashPage";
import SettingsPage from "@pages/SettingsPage";
import AdminDashboardPage from "@pages/AdminDashboardPage";

// Layout
import AppLayout from "@components/layout/AppLayout";

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
      path: PageUrls.PhotosPage,
      element: (
        <ProtectedRoute allowedRoles={USER_ONLY}>
          <PhotosPage />
        </ProtectedRoute>
      ),
    },
    {
      path: PageUrls.RecentPage,
      element: (
        <ProtectedRoute allowedRoles={USER_ONLY}>
          <RecentPage />
        </ProtectedRoute>
      ),
    },
    {
      path: PageUrls.FavoritesPage,
      element: (
        <ProtectedRoute allowedRoles={USER_ONLY}>
          <FavoritesPage />
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
