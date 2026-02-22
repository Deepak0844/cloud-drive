import React from "react";
import { Outlet } from "react-router-dom";

// components
import MainLayout from "@/components/layout/MainLayout";

export default function DashboardLayout() {
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}
