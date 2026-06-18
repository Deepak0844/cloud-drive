import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Provider } from "react-redux";
import * as SplashScreen from "expo-splash-screen";
import GluestackUIProvider from "@providers/GluestackUIProvider";
import ThemeProvider from "@providers/ThemeProvider";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../gesture-handler";
import "../global.css";

// Store
import Store from "@store";

// Components
import AppStatusBar from "@components/statusBar/AppStatusBar";
import ErrorHandler from "@components/error_handler/ErrorHandler";

// Providers
import { DatabaseGate, DrizzleStudioPlugin } from "@providers/DatabaseGate";

// Screens
import HomeScreen from "@screens/home/HomeScreen";

// Constants
import { AppScreens } from "@constants/appScreens";

const isDev = __DEV__;

// Stack navigator
const Stack = createNativeStackNavigator();

const styles = StyleSheet.create({ flex: { flex: 1 } });

export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <Provider store={Store}>
      <GluestackUIProvider mode="system">
        <ThemeProvider>
          <GestureHandlerRootView style={styles.flex}>
            {isDev && <DrizzleStudioPlugin />}

            <DatabaseGate>
              <AppStatusBar variant="gradient-light" />
              <NavigationContainer>
                <SafeAreaView style={styles.flex} edges={["bottom"]}>
                  <Stack.Navigator initialRouteName={AppScreens.HomeScreen}>
                    <Stack.Screen
                      name={AppScreens.HomeScreen}
                      component={HomeScreen}
                      options={{ headerShown: false }}
                    />
                  </Stack.Navigator>
                </SafeAreaView>
                <ErrorHandler />
              </NavigationContainer>
            </DatabaseGate>
          </GestureHandlerRootView>
        </ThemeProvider>
      </GluestackUIProvider>
    </Provider>
  );
}
