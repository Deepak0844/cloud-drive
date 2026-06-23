import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, CheckCircle } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Rtk
import { useForgotPasswordMutation } from "@api/authApi";

// Hooks
import { useFormServerErrors } from "@hooks/useFormServerErrors";

// Components
import AuthScreenLayout from "@components/auth/AuthScreenLayout";
import AuthIcon from "@components/auth/AuthIcon";
import BrandSection from "@components/auth/BrandSection";
import AuthCard from "@components/auth/AuthCard";
import Input from "@components/ui/input/Input";
import Button from "@components/ui/button/Button";
import Text from "@components/ui/text/Text";

// Schema
const schema = z.object({
  email: z.email("Enter a valid email"),
});

/**
 * Confirmation state shown after a reset link is sent.
 * @param {() => void} [onPress=()=>{}] - Handler for the "Back to sign in" button
 * @param {string} [successColor=''] - Icon fill color; pass `colors.success.DEFAULT` from the active theme
 */
function SuccessView({ onPress = () => {}, successColor = "" }) {
  return (
    <View className="items-center gap-md">
      <CheckCircle size={48} color={successColor} />
      <Text variant="h4" color="white" weight="bold" align="center" className="mt-sm">
        Check your email
      </Text>
      <Text variant="body2" align="center" className="text-white/50">
        If that address is registered you&#39;ll receive a reset link shortly.
      </Text>
      <Button size="lg" onPress={onPress} className="mt-6 w-full">
        Back to sign in
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
      <Text variant="h4" color="white" weight="bold" className="mb-1">
        Forgot password?
      </Text>
      <Text variant="body2" className="mb-6 text-white/50">
        Enter your email and we&#39;ll send you a reset link.
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<AuthIcon Icon={Mail} size={16} />}
            labelClassName="text-white/75"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            className="mb-6"
          />
        )}
      />

      <Button size="lg" onPress={onSubmit} loading={isLoading} className="mb-4">
        Send reset link
      </Button>

      <Pressable onPress={onBackToSignIn} className="py-sm">
        <Text variant="body2" color="primary" weight="semibold" align="center">
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
    <AuthScreenLayout>
      <BrandSection />
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
