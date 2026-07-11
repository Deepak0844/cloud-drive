import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, View, Animated, Dimensions } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";

const SCREEN_HEIGHT = Dimensions.get("window").height;
// Comfortably larger than any real sheet height, so the sheet fully clears
// the screen on close regardless of how tall its content ends up being —
// sidesteps needing a layout-measurement callback to know the exact height.
const OFFSCREEN_Y = SCREEN_HEIGHT + 100;
const DISMISS_DRAG_THRESHOLD = 120;
const DISMISS_VELOCITY_THRESHOLD = 800;
const ANIMATION_DURATION = 220;

/**
 * Glass-styled bottom sheet — Modal-hosted, animated with RN core `Animated`
 * and gesture-handler's classic Pan API only. Deliberately avoids a
 * ref-based presentation library: that approach silently failed to present
 * under react-native-reanimated 4 (present() never opens the sheet, no
 * error) — see github.com/gorhom/react-native-bottom-sheet/issues/2547.
 * Keeps the prior `{visible, children}` shape and adds `onClose`, fired on
 * backdrop tap and swipe-to-dismiss.
 */
export default function GlassBottomSheet({ visible = false, onClose = () => {}, children = null }) {
  const [mounted, setMounted] = useState(visible);
  const sheetY = useRef(new Animated.Value(OFFSCREEN_Y)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(sheetY, { toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true }).start();
    } else {
      Animated.timing(sheetY, { toValue: OFFSCREEN_Y, duration: ANIMATION_DURATION, useNativeDriver: true }).start(() =>
        setMounted(false)
      );
    }
  }, [visible, sheetY]);

  const onHandlePanEvent = Animated.event([{ nativeEvent: { translationY: sheetY } }], { useNativeDriver: true });

  function onHandleStateChange(event) {
    if (event.nativeEvent.oldState !== State.ACTIVE) return;
    const { translationY, velocityY } = event.nativeEvent;
    if (translationY > DISMISS_DRAG_THRESHOLD || velocityY > DISMISS_VELOCITY_THRESHOLD) {
      Animated.timing(sheetY, { toValue: OFFSCREEN_Y, duration: 200, useNativeDriver: true }).start(() => onClose());
    } else {
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    }
  }

  if (!mounted) return null;

  const backdropOpacity = sheetY.interpolate({
    inputRange: [0, OFFSCREEN_Y],
    outputRange: [0.5, 0],
    extrapolate: "clamp",
  });

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View className="absolute inset-0">
        <Pressable className="absolute inset-0" onPress={onClose}>
          <Animated.View className="flex-1 bg-black" style={{ opacity: backdropOpacity }} />
        </Pressable>

        <Animated.View
          className="absolute inset-x-0 bottom-0 max-h-[90%] rounded-t-2xl bg-surface"
          style={{ transform: [{ translateY: sheetY }] }}
        >
          <PanGestureHandler onGestureEvent={onHandlePanEvent} onHandlerStateChange={onHandleStateChange}>
            <Animated.View className="py-md items-center">
              <View className="w-9 h-1 rounded-full bg-neutral-light" />
            </Animated.View>
          </PanGestureHandler>
          <View className="flex-shrink pb-2xl">{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}
