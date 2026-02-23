import React from "react";

// HOC
import ProtectedRoute from "@/components/hoc/ProtectedRoute";

// Constants
import PageUrls from "@/constants/pageUrls";

// Pages
import MyFilesPage from "@/pages/my-files/MyFilesPage";
import TrashPage from "@/pages/trash/TrashPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";

// Layout
import AppLayout from "@/components/layout/AppLayout";

// Layout Pages
export const MainRoutes = {
  path: PageUrls.DashboardPage,
  element: (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  ),
  children: [
    {
      index: true,
      element: <MyFilesPage />,
    },
    {
      path: PageUrls.TrashPage,
      element: <TrashPage />,
    },
    {
      path: PageUrls.SettingsPage,
      element: <SettingsPage />,
    },
    {
      path: PageUrls.AdminPage,
      element: <AdminDashboardPage />,
    },
  ],
};
