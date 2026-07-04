import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, CheckCircle, ChevronLeft } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Rtk
import { useForgotPasswordMutation } from "@api/authApi";

// Hooks
import { useFormServerErrors } from "@shared-hooks";

// Components
import AuthScreenLayout from "@components/auth/AuthScreenLayout";
import AuthIcon from "@components/auth/AuthIcon";
import AuthCard from "@components/auth/AuthCard";
import { Input, InputField, InputSlot } from "@components/ui/input/Input";
import Button, { ButtonSpinner, ButtonText } from "@components/ui/button/Button";
import Text from "@components/ui/text/Text";

// Schema
const schema = z.object({
  email: z.email("Enter a valid email"),
});

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

/**
 * Back button + page title, replacing the brand logo on this screen.
 * @param {() => void} [onBack=()=>{}]
 */
function BackRow({ onBack = () => {} }) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-2.5">
      <Pressable
        onPress={onBack}
        className="w-9 h-9 items-center justify-center rounded-lg bg-white/[6] border border-white/[8]"
      >
        <ChevronLeft size={18} color={colors.surface.textSecondary} />
      </Pressable>
      <Text size="xl" bold className="text-white">
        Reset Password
      </Text>
    </View>
  );
}

/**
 * Confirmation state shown after a reset link is sent.
 * @param {() => void} [onPress=()=>{}] - Handler for the "Back to sign in" button
 * @param {string} [successColor=''] - Icon fill color; pass `colors.success.DEFAULT` from the active theme
 */
function SuccessView({ onPress = () => {}, successColor = "" }) {
  return (
    <View className="items-center gap-md">
      <CheckCircle size={48} color={successColor} />
      <Text size="2xl" bold className="text-white text-center mt-sm">
        Check your email
      </Text>
      <Text size="sm" className="text-white/50 text-center">
        If that address is registered you&#39;ll receive a reset link shortly.
      </Text>
      <Button size="lg" onPress={onPress} className="mt-6 w-full">
        <ButtonText>Back to sign in</ButtonText>
      </Button>
    </View>
  );
}

/**
 * Email input form shown before a reset link is sent.
 * @param {object} control - react-hook-form control object
 * @param {object} errors - react-hook-form field errors
 * @param {() => void} [onSubmit=()=>{}] - Pre-bound submit handler from `handleSubmit`
 * @param {boolean} [isLoading=false] - Shows spinner on the submit button while the request is in flight
 * @param {() => void} [onBackToSignIn=()=>{}] - Handler for the "Back to sign in" link
 */
function ForgotPasswordForm({
  control = {},
  errors = {},
  onSubmit = () => {},
  isLoading = false,
  onBackToSignIn = () => {},
}) {
  return (
    <>
      <Text size="sm" className="mb-6 text-white/50">
        Enter your email and we&#39;ll send you a reset link.
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1 mb-6">
            <Text size="sm" bold className="text-secondary uppercase tracking-widest">
              Email address
            </Text>
            <Input isInvalid={!!errors.email} className="rounded-xl">
              <InputField
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
              <InputSlot>
                <AuthIcon Icon={Mail} size={16} />
              </InputSlot>
            </Input>
            {errors.email?.message ? (
              <Text size="xs" className="text-danger">
                {errors.email.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      <Button size="lg" onPress={onSubmit} disabled={isLoading} className="mb-4">
        {isLoading ? <ButtonSpinner /> : <ButtonText>Send reset link</ButtonText>}
      </Button>

      <Pressable onPress={onBackToSignIn} className="py-sm">
        <Text size="sm" bold className="text-primary text-center">
          Back to sign in
        </Text>
      </Pressable>
    </>
  );
}

/**
 * Forgot Password Screen
 */
export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const [forgotPassword, { isLoading, error }] = useForgotPasswordMutation();
  const [submitted, setSubmitted] = useState(false);
  useFormServerErrors(error, setError, { fallbackField: "email" });

  async function onSubmit(data) {
    try {
      await forgotPassword(data).unwrap();
      setSubmitted(true);
    } catch {
      // error surfaced via useFormServerErrors
    }
  }

  return (
    <AuthScreenLayout centered={false}>
      <BackRow onBack={() => navigation.goBack()} />
      <AuthCard>
        {submitted ? (
          <SuccessView onPress={() => navigation.goBack()} successColor={colors.success.DEFAULT} />
        ) : (
          <ForgotPasswordForm
            control={control}
            errors={errors}
            onSubmit={handleSubmit(onSubmit)}
            isLoading={isLoading}
            onBackToSignIn={() => navigation.goBack()}
          />
        )}
      </AuthCard>
    </AuthScreenLayout>
  );
}
