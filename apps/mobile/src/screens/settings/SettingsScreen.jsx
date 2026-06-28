import React, { useState, useEffect } from "react";
import { View, Pressable, Switch, ScrollView } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { Sun, Moon, Monitor } from "lucide-react-native";

// Actions
import { setColorMode } from "@redux-slices/themeSlice";

// Hooks
import { useBiometric } from "@hooks/useBiometric";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import ScreenLayout from "@components/ui/screen/ScreenLayout";
import GlassHeader from "@components/ui/header/GlassHeader";
import GlassCard from "@components/ui/glass/GlassCard";
import Text from "@components/ui/text/Text";

const COLOR_MODES = [
  { label: "Light", value: "light", Icon: Sun },
  { label: "Dark", value: "dark", Icon: Moon },
  { label: "System", value: "system", Icon: Monitor },
];

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const { colors } = useTheme();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <ScreenLayout>
      <GlassHeader title="Settings" />

      <ScrollView className="flex-1 p-4" contentContainerClassName="gap-4 pb-4">
        {/* Theme picker */}
        <GlassCard>
          <Text bold className="mb-3">
            Theme
          </Text>
          <View className="flex-row gap-2">
            {COLOR_MODES.map(({ label, value, Icon }) => {
              const active = colorMode === value;
              const iconColor = active ? colors.primary.DEFAULT : colors.neutral.DEFAULT;
              return (
                <Pressable
                  key={value}
                  onPress={() => dispatch(setColorMode(value))}
                  style={{
                    borderColor: active ? colors.primary.DEFAULT : colors.surface.border,
                    backgroundColor: active ? colors.primary.subtle : colors.surface.card,
                  }}
                  className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-full border"
                >
                  <Icon size={13} color={iconColor} strokeWidth={active ? 2.5 : 1.8} />
                  <Text size="sm" style={{ color: iconColor, fontWeight: active ? "600" : "400" }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </GlassCard>

        {/* Biometric lock */}
        <GlassCard style={{ opacity: biometricRowDisabled ? 0.4 : 1 }}>
          <View className="flex-row items-center justify-between">
            <Text bold>Biometric Lock</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={biometricRowDisabled}
              trackColor={{ false: colors.neutral.light, true: colors.primary.DEFAULT }}
              thumbColor={colors.primary.foreground}
            />
          </View>
          {!biometricAvailable && !biometricLoading ? (
            <Text size="xs" className="text-secondary mt-1">
              No biometrics enrolled on this device
            </Text>
          ) : null}
          {biometricError.length > 0 ? (
            <Text size="xs" className="text-danger mt-1">
              {biometricError}
            </Text>
          ) : null}
        </GlassCard>
      </ScrollView>
    </ScreenLayout>
  );
}
