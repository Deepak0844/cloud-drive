import React, { useEffect, useState, useRef } from "react";
import { useColorScheme, AppState } from "react-native";
import { useColorScheme as useNWColorScheme } from "nativewind";
import { Provider, useSelector, useDispatch } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
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
import { useNetworkStatus } from "@hooks/useNetworkStatus";

// Lib / Services
import syncService from "@services/sync/syncService";
import photoBackupService from "@services/backup/photoBackupService";

// Store actions
import { setAuthenticated } from "@redux-slices/authSlice";
import { useGetMeQuery } from "@api/authApi";
import { useRegisterPushTokenMutation } from "@api/notificationApi";

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 500, fade: true });

const SECURE_KEY_COLOR_MODE = "colorMode";
const isDev = __DEV__;

function AppContent() {
  const dispatch = useDispatch();
  const colorMode = useSelector((state) => state.theme.colorMode);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const backupEnabled = useSelector((state) => state.photoBackup.enabled);
  const [registerPushToken] = useRegisterPushTokenMutation();
  useGetMeQuery(undefined, { skip: !isAuthenticated });
  const systemScheme = useColorScheme();
  const resolved = colorMode === "system" ? (systemScheme ?? "light") : colorMode;
  const { setColorScheme } = useNWColorScheme();
  const [biometricLocked, setBiometricLocked] = useState(false);
  const { isEnabled } = useBiometric();
  useNetworkStatus();
  const appState = useRef(AppState.currentState);
  const biometricLockedRef = useRef(false);
  biometricLockedRef.current = biometricLocked;

  useEffect(() => {
    setColorScheme(colorMode);
    SecureStore.setItemAsync(SECURE_KEY_COLOR_MODE, colorMode);
  }, [colorMode, setColorScheme]);

  // Cold start with a stored token preloads auth state without dispatching
  // setAuthenticated — re-dispatch once so the socket middleware connects.
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(setAuthenticated(true));
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    isEnabled().then((enabled) => {
      if (enabled) {
        setBiometricLocked(true);
      }
    });
  }, [isAuthenticated, isEnabled]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Notifications.requestPermissionsAsync().then(({ status }) => {
      if (status === "granted") {
        Notifications.getExpoPushTokenAsync()
          .then(({ data: pushToken }) => registerPushToken(pushToken))
          .catch(() => {});
      }
    });
  }, [isAuthenticated, registerPushToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (backupEnabled) {
      photoBackupService.initialSync().catch(() => {});
      photoBackupService.startListening();
    } else {
      photoBackupService.stopListening();
    }
    return () => photoBackupService.stopListening();
  }, [isAuthenticated, backupEnabled]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      if (appState.current === "active" && next.match(/inactive|background/)) {
        // No pauseAll() needed — native code now owns background survival for both
        // uploads and downloads directly, on both platforms.
        if (isAuthenticated && !biometricLockedRef.current && (await isEnabled())) {
          setBiometricLocked(true);
        }
      }
      if (next === "active") {
        syncService.resumeTransfers?.();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [isAuthenticated, isEnabled]);

  return (
    <ThemeProvider>
      <GluestackUIProvider mode={resolved}>
        <GestureHandlerRootView className="flex-1">
          {isDev && <DrizzleStudioPlugin />}
          <DatabaseGate>
            <AppStatusBar variant="gradient-light" />
            <NavigationContainer>
              <RootNavigator />
              <ErrorHandler />
              {isAuthenticated && biometricLocked ? (
                <BiometricLockScreen onUnlock={() => setBiometricLocked(false)} />
              ) : null}
            </NavigationContainer>
          </DatabaseGate>
        </GestureHandlerRootView>
      </GluestackUIProvider>
    </ThemeProvider>
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
