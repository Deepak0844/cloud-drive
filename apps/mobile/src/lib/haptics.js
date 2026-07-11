import * as ExpoHaptics from "expo-haptics";

/**
 * Single entry point for haptic feedback so it can be tuned or disabled in one
 * place. All calls are fire-and-forget; failures (e.g. simulator) are ignored.
 */

function selection() {
  ExpoHaptics.selectionAsync().catch(() => {});
}

function success() {
  ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success).catch(() => {});
}

function warning() {
  ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning).catch(() => {});
}

const haptics = { selection, success, warning };

export default haptics;
