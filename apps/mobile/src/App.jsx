import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";
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

export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <Provider store={Store}>
      <GestureHandlerRootView style={styles.flex}>
        {isDev && <DrizzleStudioPlugin />}

        <DatabaseGate>
          <AppStatusBar variant="gradient-light" />
          <NavigationContainer>
            <SafeAreaView style={styles.flex} edges={["bottom"]}>
              <Stack.Navigator initialRouteName={AppScreens.HomeScreen}>
                <Stack.Screen name={AppScreens.HomeScreen} component={HomeScreen} options={{ headerShown: false }} />
              </Stack.Navigator>
            </SafeAreaView>
            <ErrorHandler />
          </NavigationContainer>
        </DatabaseGate>
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
