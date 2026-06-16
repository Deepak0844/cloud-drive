import React from "react";
import { Text, View } from "react-native";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";

// Database
import { useDbMigrations } from "@db/migrate";
import { expoDb } from "@db/client";

// Components
import { LoadingSpinner } from "@components/loading/LoadingSpinner";

/**
 *
 * @param {React.ReactNode} children - The app's main content, rendered once DB is ready.
 * @returns {JSX.Element} - A loader while DB is initializing, an error message if it fails, or the app content when ready.
 */
export function DatabaseGate({ children }) {
  const { success, error } = useDbMigrations();

  // TODO:: Handle DB migration errors
  if (error) {
    return (
      <View>
        <Text>DB Error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return <LoadingSpinner />;
  }

  return children;
}

// Only rendered when __DEV__ is true.
export function DrizzleStudioPlugin() {
  useDrizzleStudio(expoDb);
  return null;
}
