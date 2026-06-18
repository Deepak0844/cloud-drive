import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AppScreens } from "@constants/appScreens";

import LoginScreen from "@screens/auth/LoginScreen";
import RegisterScreen from "@screens/auth/RegisterScreen";
import ForgotPasswordScreen from "@screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "@screens/auth/ResetPasswordScreen";

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={AppScreens.LOGIN} component={LoginScreen} />
      <Stack.Screen name={AppScreens.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={AppScreens.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
      <Stack.Screen name={AppScreens.RESET_PASSWORD} component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
