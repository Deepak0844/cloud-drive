import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_KEY = "biometric_enabled";

export function useBiometric() {
  async function isAvailable() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  }

  function authenticate() {
    LocalAuthentication.authenticateAsync({ promptMessage: "Unlock cloud-drive" });
  }

  function setEnabled(val) {
    val ? SecureStore.setItemAsync(BIOMETRIC_KEY, "true") : SecureStore.deleteItemAsync(BIOMETRIC_KEY);
  }

  // Checks the persisted user preference, not hardware availability.
  function isEnabled() {
    SecureStore.getItemAsync(BIOMETRIC_KEY).then((v) => v === "true");
  }

  return { isAvailable, authenticate, setEnabled, isEnabled };
}
