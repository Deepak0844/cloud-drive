import React, { useEffect, useState } from "react";
import { Modal, Pressable, View, Dimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const SCREEN_HEIGHT = Dimensions.get("window").height;
// Comfortably larger than any real sheet height, so the sheet fully clears
// the screen on close regardless of how tall its content ends up being —
// sidesteps needing a layout-measurement callback to know the exact height.
const OFFSCREEN_Y = SCREEN_HEIGHT + 100;
const DISMISS_DRAG_THRESHOLD = 120;
const DISMISS_VELOCITY_THRESHOLD = 800;
const ANIMATION_DURATION = 220;

/**
 * Glass-styled bottom sheet — Modal-hosted, animated with react-native-reanimated and
 * gesture-handler's modern `Gesture.Pan()` + `GestureDetector` API. Deliberately avoids a
 * ref-based presentation library: that approach silently failed to present under
 * react-native-reanimated 4 (present() never opens the sheet, no error) — see
 * github.com/gorhom/react-native-bottom-sheet/issues/2547. Keeps the `{visible, children}` shape
 * plus `onClose`, fired on backdrop tap and swipe-to-dismiss.
 *
 * The Modal's content is wrapped in its own GestureHandlerRootView: on iOS a Modal presents in a
 * separate view hierarchy that the app-root GestureHandlerRootView does not cover, so without a
 * root view inside the Modal the GestureDetector would silently receive no gestures.
 *
 * `presentation`:
 *  - "modal" (default): Modal-hosted with a dimming, touch-capturing backdrop — the blocking
 *    presentation used by the action/picker sheets, one at a time.
 *  - "inline": renders directly in the normal view hierarchy with no Modal and no backdrop —
 *    non-blocking, so content behind it stays interactive and it can coexist with other sheets.
 *    Used by the always-on upload progress sheet, which auto-presents while a picker's Modal is
 *    still dismissing; a Modal would be silently dropped by UIKit in that race (see the earlier
 *    "sheet won't open after the image picker" fix).
 */
export default function GlassBottomSheet({
  visible = false,
  onClose = () => {},
  children = null,
  presentation = "modal",
}) {
  const [mounted, setMounted] = useState(visible);
  const sheetY = useSharedValue(OFFSCREEN_Y);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      sheetY.value = withTiming(0, { duration: ANIMATION_DURATION });
    } else {
      // Guard on `finished`: a reopen starting a new animation on sheetY cancels this one with
      // finished=false, and an unguarded setMounted(false) would clobber the reopen's
      // setMounted(true), leaving the Modal unmounted even though visible is true.
      sheetY.value = withTiming(OFFSCREEN_Y, { duration: ANIMATION_DURATION }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, sheetY]);

  // Unmounts the Modal itself, rather than leaning on the parent to flip `visible` back to false
  // in response to onClose. A parent that hardcodes `visible` would otherwise leave this Modal —
  // and its full-screen backdrop Pressable — mounted forever after a dismiss, silently absorbing
  // every touch in the app behind an invisible overlay. onClose is still called so parents that DO
  // track visible state stay in sync.
  function finishDismiss() {
    setMounted(false);
    onClose();
  }

  function dismiss() {
    sheetY.value = withTiming(OFFSCREEN_Y, { duration: 200 }, (finished) => {
      if (finished) scheduleOnRN(finishDismiss);
    });
  }

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Clamp to the resting position: the sheet follows the finger downward (toward dismiss) but
      // an upward drag can't pull it above its anchored bottom position (no floating to the top).
      sheetY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DRAG_THRESHOLD || event.velocityY > DISMISS_VELOCITY_THRESHOLD) {
        sheetY.value = withTiming(OFFSCREEN_Y, { duration: 200 }, (finished) => {
          if (finished) scheduleOnRN(finishDismiss);
        });
      } else {
        sheetY.value = withSpring(0, { damping: 15, stiffness: 180 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheetY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheetY.value, [0, OFFSCREEN_Y], [0.5, 0], Extrapolation.CLAMP),
  }));

  if (!mounted) return null;

  const sheet = (
    <Animated.View className="absolute inset-x-0 bottom-0 max-h-[90%] rounded-t-2xl bg-surface" style={sheetStyle}>
      <GestureDetector gesture={panGesture}>
        <View className="py-md items-center">
          <View className="w-9 h-1 rounded-full bg-neutral-light" />
        </View>
      </GestureDetector>
      <View className="flex-shrink pb-2xl">{children}</View>
    </Animated.View>
  );

  // Inline: no Modal, no dimming backdrop. Renders in the normal view hierarchy (under the
  // app-root GestureHandlerRootView, so gestures work without a nested one) and leaves the content
  // behind it interactive.
  if (presentation === "inline") {
    return sheet;
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismiss}>
      <GestureHandlerRootView className="flex-1">
        <View className="absolute inset-0">
          <Pressable className="absolute inset-0" onPress={dismiss}>
            <Animated.View className="flex-1 bg-black" style={backdropStyle} />
          </Pressable>
          {sheet}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
