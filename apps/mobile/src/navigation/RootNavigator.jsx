import React, { useRef, useEffect } from "react";
import { Animated } from "react-native";
import { useSelector } from "react-redux";

// Navigation
import AuthNavigator from "@navigation/AuthNavigator";
import AppNavigator from "@navigation/AppNavigator";

export default function RootNavigator() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View className="flex-1" style={{ opacity }}>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </Animated.View>
  );
}
