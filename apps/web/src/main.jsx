import { App as AntApp, ConfigProvider } from "antd";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

// pages
import LoginPage from "./app/(auth)/login/page";
import RegisterPage from "./app/(auth)/register/page";
import AdminPage from "./app/(dashboard)/admin/page";
import DashboardLayout from "./app/(dashboard)/layout";
import DashboardPage from "./app/(dashboard)/page";
import SettingsPage from "./app/(dashboard)/settings/page";
import TrashPage from "./app/(dashboard)/trash/page";

// styles
import "./app/globals.css";

const themeConfig = {
  token: {
    colorPrimary: "#3b82f6", // --primary
    colorSuccess: "#10b981", // --success
    colorWarning: "#f59e0b", // --warning
    colorError: "#ef4444", // --danger
    colorInfo: "#0ea5e9", // --info
    borderRadius: 12,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      controlHeight: 40,
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: 24,
    },
    Input: {
      controlHeight: 44,
    },
  },
};

export function App() {
  return (
    <ConfigProvider theme={themeConfig}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="trash" element={<TrashPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
