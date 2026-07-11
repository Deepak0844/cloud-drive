import { useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_KEY = "biometric_enabled";

export function useBiometric() {
  const isAvailable = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  }, []);

  const authenticate = useCallback(() => {
    return LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock cloud-drive",
      disableDeviceFallback: false,
    });
  }, []);

  function setEnabled(val) {
    val ? SecureStore.setItemAsync(BIOMETRIC_KEY, "true") : SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  }

  // Checks the persisted user preference, not hardware availability.
  const isEnabled = useCallback(async () => {
    const value = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    return value === "true";
  }, []);

  return { isAvailable, authenticate, setEnabled, isEnabled };
}
