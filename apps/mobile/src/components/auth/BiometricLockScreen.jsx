import React, { useEffect, useRef, useState } from "react";
import { View, Modal, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lock } from "lucide-react-native";

// Hooks
import { useBiometric } from "@hooks/useBiometric";

// Components
import AuroraBackground from "@components/auth/AuroraBackground";
import Text from "@components/ui/text/Text";
import Button from "@components/ui/button/Button";

/**
 * Full-screen biometric lock modal. Matches the aurora auth design language.
 * @param {Function} onUnlock - Called when biometric auth succeeds
 */
export default function BiometricLockScreen({ onUnlock = () => {} }) {
  const { authenticate } = useBiometric();
  const isAuthenticating = useRef(false);
  const unlockedRef = useRef(false);
  const [authError, setAuthError] = useState("");
  const opacity = useRef(new Animated.Value(0)).current;

  async function tryUnlock() {
    if (unlockedRef.current) return;
    if (isAuthenticating.current) return;
    isAuthenticating.current = true;
    setAuthError("");
    try {
      const result = await authenticate();
      if (result?.success) {
        unlockedRef.current = true;
        onUnlock();
      } else {
        setAuthError(result?.warning ?? "Authentication failed. Please try again.");
      }
    } finally {
      isAuthenticating.current = false;
    }
  }

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    tryUnlock();
  }, []);

  return (
    <Modal visible={true} animationType="none" statusBarTranslucent={true} onRequestClose={tryUnlock}>
      <View className="flex-1 bg-background">
        <AuroraBackground />
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          <Animated.View style={{ opacity }} className="w-full items-center">
            <View className="w-24 h-24 items-center justify-center bg-glass-surface-bg border border-glass-surface-border rounded-full mb-8">
              <Lock size={44} color="white" strokeWidth={1.5} />
            </View>

            <Text variant="h4" color="white" weight="bold" align="center" className="mt-4 mb-10">
              Cloud Drive Locked
            </Text>

            <Button size="lg" onPress={tryUnlock} className="w-full">
              Unlock
            </Button>

            {authError.length > 0 ? (
              <Text variant="caption" align="center" color="danger" className="mt-4">
                {authError}
              </Text>
            ) : null}
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
