import React, { useEffect } from "react";
import { View, Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// Components
import AuthImage from "@components/media/AuthImage";

const { width, height } = Dimensions.get("window");
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value, min, max) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

/**
 * Full-bleed, pinch-to-zoom / pan / double-tap-to-zoom image page for the media viewer.
 * A single tap (that isn't part of a double-tap) reports up via `onTap` so the parent can
 * toggle the floating chrome; zoom state reports up via `onZoomChange` so the pager can lock
 * swipe-to-next-page while the user is zoomed in.
 */
export default function ImageViewer({ uri = "", isActive = true, onTap = () => {}, onZoomChange = () => {} }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  function reportZoom(isZoomed) {
    "worklet";
    scheduleOnRN(onZoomChange, isZoomed);
  }

  function resetPan() {
    "worklet";
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }

  // The pager keeps neighbouring pages mounted (windowSize), so leaving this page zoomed in
  // without resetting would let the user swipe back to a still-zoomed image.
  useEffect(() => {
    if (isActive) return;
    scale.value = MIN_SCALE;
    savedScale.value = MIN_SCALE;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [isActive, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) {
        scale.value = withTiming(MIN_SCALE);
        savedScale.value = MIN_SCALE;
        resetPan();
      }
      reportZoom(savedScale.value > MIN_SCALE);
    });

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      if (savedScale.value <= MIN_SCALE) return;
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zooming = savedScale.value <= MIN_SCALE;
      const target = zooming ? DOUBLE_TAP_SCALE : MIN_SCALE;
      scale.value = withTiming(target);
      savedScale.value = target;
      if (!zooming) resetPan();
      reportZoom(zooming);
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      scheduleOnRN(onTap);
    })
    .requireExternalGestureToFail(doubleTap);

  const composed = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <View className="items-center justify-center bg-black overflow-hidden" style={{ width, height }}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[{ width, height }, animatedStyle]}>
          <AuthImage uri={uri} className="w-full h-full" contentFit="contain" transition={200} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
