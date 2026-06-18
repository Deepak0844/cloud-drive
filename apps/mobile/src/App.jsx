import React, { useEffect } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { Provider, useSelector } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../gesture-handler";
import "../global.css";

// Store
import Store from "@store";

// Providers
import GluestackUIProvider from "@providers/GluestackUIProvider";
import ThemeProvider from "@providers/ThemeProvider";
import { DatabaseGate, DrizzleStudioPlugin } from "@providers/DatabaseGate";

// Components
import AppStatusBar from "@components/statusBar/AppStatusBar";
import ErrorHandler from "@components/error_handler/ErrorHandler";

// Navigation
import RootNavigator from "@navigation/RootNavigator";

// Actions
import { setColorMode } from "@redux-slices/themeSlice";

const SECURE_KEY_COLOR_MODE = "colorMode";
const isDev = __DEV__;

const styles = StyleSheet.create({ flex: { flex: 1 } });

function AppContent() {
  const colorMode = useSelector((s) => s.theme.colorMode);
  const systemScheme = useColorScheme();
  const resolved = colorMode === "system" ? (systemScheme ?? "light") : colorMode;

  useEffect(() => {
    SecureStore.setItemAsync(SECURE_KEY_COLOR_MODE, colorMode);
  }, [colorMode]);

  return (
    <GluestackUIProvider mode={resolved}>
      <ThemeProvider>
        <GestureHandlerRootView style={styles.flex}>
          {isDev && <DrizzleStudioPlugin />}
          <DatabaseGate>
            <AppStatusBar variant="gradient-light" />
            <NavigationContainer>
              <RootNavigator />
              <ErrorHandler />
            </NavigationContainer>
          </DatabaseGate>
        </GestureHandlerRootView>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

export default function App() {
  useEffect(() => {
    async function init() {
      const saved = await SecureStore.getItemAsync(SECURE_KEY_COLOR_MODE);
      if (saved) {
        Store.dispatch(setColorMode(saved));
      }
      SplashScreen.hideAsync();
    }
    init();
  }, []);

  return (
    <Provider store={Store}>
      <AppContent />
    </Provider>
  );
}
