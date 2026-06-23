import React, { useState, useEffect } from "react";
import { View, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";

// Actions
import { setColorMode } from "@redux-slices/themeSlice";

// Hooks
import { useBiometric } from "@hooks/useBiometric";

// Components
import Text from "@components/ui/text/Text";

const COLOR_MODES = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const colorMode = useSelector((s) => s.theme.colorMode);
  const { isAvailable, isEnabled, authenticate, setEnabled } = useBiometric();

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(true);
  const [biometricError, setBiometricError] = useState("");

  useEffect(() => {
    Promise.all([isAvailable(), isEnabled()]).then(([available, enabled]) => {
      setBiometricAvailable(available);
      setBiometricEnabled(enabled);
      setBiometricLoading(false);
    });
  }, []);

  async function handleBiometricToggle(value) {
    setBiometricError("");
    if (value) {
      const result = await authenticate();
      if (result.success) {
        setEnabled(true);
        setBiometricEnabled(true);
      } else {
        setBiometricError(result.warning ?? "Biometric authentication failed");
      }
    } else {
      setEnabled(false);
      setBiometricEnabled(false);
    }
  }

  const biometricRowDisabled = biometricLoading || !biometricAvailable;

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 items-center justify-center">
        <Text variant="body1" className="mb-3">
          Theme
        </Text>
        <View className="flex-row rounded-lg overflow-hidden border border-border">
          {COLOR_MODES.map((mode) => (
            <Pressable
              key={mode.value}
              className={`py-2 px-5 ${colorMode === mode.value ? "bg-primary" : "bg-transparent"}`}
              onPress={() => dispatch(setColorMode(mode.value))}
            >
              <Text variant="body2" color={colorMode === mode.value ? "white" : ""}>
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-8 w-full px-6" style={{ opacity: biometricRowDisabled ? 0.4 : 1 }}>
          <View className="flex-row items-center justify-between">
            <Text variant="body1">Biometric Lock</Text>
            <Switch value={biometricEnabled} onValueChange={handleBiometricToggle} disabled={biometricRowDisabled} />
          </View>
          {!biometricAvailable && !biometricLoading ? (
            <Text variant="caption" color="secondary" className="mt-1">
              No biometrics enrolled on this device
            </Text>
          ) : null}
          {biometricError.length > 0 ? (
            <Text variant="caption" color="danger" className="mt-1">
              {biometricError}
            </Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
