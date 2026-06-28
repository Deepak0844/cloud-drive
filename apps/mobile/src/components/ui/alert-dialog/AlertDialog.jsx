import { createAlertDialog } from "@gluestack-ui/core/alert-dialog/creator";
import { tva, useStyleContext, withStyleContext } from "@gluestack-ui/utils/nativewind-utils";
import { cssInterop } from "nativewind";
import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { Easing, FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

const SCOPE = "ALERT_DIALOG";

const RootComponent = withStyleContext(View, SCOPE);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

const UIAlertDialog = createAlertDialog({
  Root: RootComponent,
  Body: ScrollView,
  Content: AnimatedView,
  CloseButton: Pressable,
  Header: View,
  Footer: View,
  Backdrop: AnimatedPressable,
});

cssInterop(AnimatedPressable, { className: "style" });
cssInterop(AnimatedView, { className: "style" });

const alertDialogStyle = tva({
  base: "group/modal w-full h-full justify-center items-center web:pointer-events-none",
});

const alertDialogContentStyle = tva({
  base: "bg-background rounded-lg overflow-hidden border border-border p-6",
  parentVariants: {
    size: {
      xs: "w-[60%] max-w-[360px]",
      sm: "w-[70%] max-w-[420px]",
      md: "w-[80%] max-w-[510px]",
      lg: "w-[90%] max-w-[640px]",
      full: "w-full",
    },
  },
});

const alertDialogHeaderStyle = tva({ base: "justify-between items-center flex-row" });
const alertDialogFooterStyle = tva({ base: "flex-row justify-end items-center gap-3" });
const alertDialogBodyStyle = tva({ base: "" });
const alertDialogBackdropStyle = tva({ base: "absolute left-0 top-0 right-0 bottom-0 bg-black/50 web:cursor-default" });

export function AlertDialog({ className, size = "md", ...props }) {
  return (
    <UIAlertDialog
      {...props}
      className={alertDialogStyle({ class: className })}
      context={{ size }}
      pointerEvents="box-none"
    />
  );
}

export function AlertDialogContent({ className, size, ...props }) {
  const { size: parentSize } = useStyleContext(SCOPE);
  return (
    <UIAlertDialog.Content
      pointerEvents="auto"
      entering={ZoomIn.duration(200).withInitialValues({ transform: [{ scale: 0.9 }], opacity: 0 })}
      exiting={FadeOut.duration(200)}
      {...props}
      className={alertDialogContentStyle({ parentVariants: { size: parentSize }, size, class: className })}
    />
  );
}

export function AlertDialogHeader({ className, ...props }) {
  return <UIAlertDialog.Header {...props} className={alertDialogHeaderStyle({ class: className })} />;
}

export function AlertDialogFooter({ className, ...props }) {
  return <UIAlertDialog.Footer {...props} className={alertDialogFooterStyle({ class: className })} />;
}

export function AlertDialogBody({ className, ...props }) {
  return <UIAlertDialog.Body {...props} className={alertDialogBodyStyle({ class: className })} />;
}

export function AlertDialogBackdrop({ className, ...props }) {
  return (
    <UIAlertDialog.Backdrop
      {...props}
      entering={FadeIn.duration(200).easing(Easing.linear)}
      exiting={FadeOut.duration(200).easing(Easing.linear)}
      className={alertDialogBackdropStyle({ class: className })}
    />
  );
}
