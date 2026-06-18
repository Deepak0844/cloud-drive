import React from "react";
import AuthNavigator from "@navigation/AuthNavigator";
import AppNavigator from "@navigation/AppNavigator";

export default function RootNavigator() {
  // Temporary for Phase 2 — revert to Redux read in Phase 3
  const isAuthenticated = true;
  // const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}
