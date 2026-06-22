import React from "react";
import { View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppScreens } from "@constants/appScreens";

// Components
import AuroraBackground from "@components/auth/AuroraBackground";

import LoginScreen from "@screens/auth/LoginScreen";
import RegisterScreen from "@screens/auth/RegisterScreen";
import ForgotPasswordScreen from "@screens/auth/ForgotPasswordScreen";

const Stack = createNativeStackNavigator();

// Transparent screens let the persistent aurora backdrop (rendered once below the
// navigator) stay fixed while only the card content slides between auth screens.
const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: "transparent" },
  animation: "slide_from_right",
};

export default function AuthNavigator() {
  return (
    <View className="flex-1 bg-surface-inverse">
      <AuroraBackground />
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen name={AppScreens.LOGIN} component={LoginScreen} />
        <Stack.Screen name={AppScreens.REGISTER} component={RegisterScreen} />
        <Stack.Screen name={AppScreens.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      </Stack.Navigator>
    </View>
  );
}
