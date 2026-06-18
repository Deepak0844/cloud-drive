import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useSelector, useDispatch } from "react-redux";

// Store
import { ErrorActions } from "@redux-slices/errorSlice";

/**
 * Listens to the global error state in Redux and shows a dismissible message
 * when an error occurs. Tapping it, or the auto-dismiss timer, resets the state.
 */
export default function ErrorHandler() {
  const dispatch = useDispatch();
  const { error, message } = useSelector((state) => state.Error);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = setTimeout(() => dispatch(ErrorActions.reset()), 4000);
    return () => clearTimeout(timer);
  }, [error, dispatch]);

  if (!error) {
    return null;
  }

  return (
    <View className="absolute inset-x-4 bottom-8" pointerEvents="box-none">
      <Pressable
        onPress={() => dispatch(ErrorActions.reset())}
        className="rounded-xl bg-secondary-dark px-4 py-3 shadow-lg"
      >
        <Text className="text-sm text-white">{message}</Text>
      </Pressable>
    </View>
  );
}
