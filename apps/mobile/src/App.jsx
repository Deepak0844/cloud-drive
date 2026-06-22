import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, useColorScheme, AppState } from "react-native";
import { useColorScheme as useNWColorScheme } from "nativewind";
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
import BiometricLockScreen from "@components/auth/BiometricLockScreen";

// Navigation
import RootNavigator from "@navigation/RootNavigator";

// Hooks
import { useBiometric } from "@hooks/useBiometric";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 500, fade: true });

const SECURE_KEY_COLOR_MODE = "colorMode";
const isDev = __DEV__;

const styles = StyleSheet.create({ flex: { flex: 1 } });

function AppContent() {
  const colorMode = useSelector((state) => state.theme.colorMode);
  const systemScheme = useColorScheme();
  const resolved = colorMode === "system" ? (systemScheme ?? "light") : colorMode;
  const { setColorScheme } = useNWColorScheme();
  const [biometricLocked, setBiometricLocked] = useState(false);
  const { isEnabled } = useBiometric();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    setColorScheme(colorMode);
    SecureStore.setItemAsync(SECURE_KEY_COLOR_MODE, colorMode);
  }, [colorMode]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      if (appState.current === "active" && next.match(/inactive|background/)) {
        if (await isEnabled()) {
          setBiometricLocked(true);
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

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
              {biometricLocked ? <BiometricLockScreen onUnlock={() => setBiometricLocked(false)} /> : null}
            </NavigationContainer>
          </DatabaseGate>
        </GestureHandlerRootView>
      </ThemeProvider>
    </GluestackUIProvider>
  );
}

export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <Provider store={Store}>
      <AppContent />
    </Provider>
  );
}
