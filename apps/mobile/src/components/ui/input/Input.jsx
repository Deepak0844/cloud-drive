import React from "react";
import { View, Pressable, TextInput } from "react-native";
import { createInput } from "@gluestack-ui/core/input/creator";
import { tva, withStyleContext } from "@gluestack-ui/utils/nativewind-utils";
import { cssInterop } from "nativewind";
import { UIIcon } from "@gluestack-ui/core/icon/creator";

// Theme
import { useTheme } from "@theme/useTheme";

const SCOPE = "INPUT";

const UIInput = createInput({
  Root: withStyleContext(View, SCOPE),
  Icon: UIIcon,
  Slot: Pressable,
  Input: TextInput,
});

cssInterop(UIIcon, {
  className: {
    target: "style",
    nativeStyleToProp: { height: true, width: true, fill: true, color: "classNameColor", stroke: true },
  },
});

const inputStyle = tva({
  base: "h-10 w-full flex-row items-center rounded-md border border-border bg-glass-surface-bg overflow-hidden data-[focus=true]:border-primary data-[invalid=true]:border-danger data-[disabled=true]:opacity-50 px-3 gap-2",
});

const inputIconStyle = tva({
  base: "justify-center items-center text-secondary fill-none h-4 w-4",
});

const inputSlotStyle = tva({
  base: "justify-center items-center",
});

const inputFieldStyle = tva({
  base: "flex-1 text-text font-sans text-base py-1 h-full",
});

export function Input({ className, ...props }) {
  return <UIInput {...props} className={inputStyle({ class: className })} context={{}} />;
}

export function InputIcon({ className, ...props }) {
  return <UIInput.Icon {...props} className={inputIconStyle({ class: className })} />;
}

export function InputSlot({ className, ...props }) {
  return <UIInput.Slot {...props} className={inputSlotStyle({ class: className })} />;
}

export function InputField({ className, placeholderTextColor, ...props }) {
  const { colors } = useTheme();
  return (
    <UIInput.Input
      {...props}
      placeholderTextColor={placeholderTextColor ?? colors.input.placeholder}
      className={inputFieldStyle({ class: className })}
    />
  );
}

Input.displayName = "Input";
InputIcon.displayName = "InputIcon";
InputSlot.displayName = "InputSlot";
InputField.displayName = "InputField";

export default Input;
