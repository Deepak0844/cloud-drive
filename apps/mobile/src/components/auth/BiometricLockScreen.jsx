import React, { useEffect } from "react";
import { View, Modal } from "react-native";
import { useBiometric } from "@hooks/useBiometric";
import Text from "@components/ui/text/Text";
import Button from "@components/ui/button/Button";

/**
 * Biometric Lock Screen
 * @param {Function} onUnlock - Callback function on unlock
 * @returns
 */
export default function BiometricLockScreen({ onUnlock = () => {} }) {
  const { authenticate } = useBiometric();

  async function tryUnlock() {
    const result = await authenticate();
    if (result?.success) {
      onUnlock();
    }
  }

  useEffect(() => {
    tryUnlock();
  }, []);

  return (
    <Modal visible={true} animationType="none" statusBarTranslucent={true} onRequestClose={tryUnlock}>
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-lg font-semibold text-text mb-4">App Locked</Text>
        <Button variant="outline" onPress={tryUnlock}>
          Unlock with Biometrics
        </Button>
      </View>
    </Modal>
  );
}
