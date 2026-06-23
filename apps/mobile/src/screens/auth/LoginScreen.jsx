import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react-native";

// Rtk
import { useLoginMutation } from "@api/authApi";

// Constants
import { AppScreens } from "@constants/appScreens";

// Hooks
import { useFormServerErrors } from "@shared-hooks";

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
  password: z.string().min(1, "Password is required").min(8, "Password must be at least 8 characters"),
});

/**
 * Email + password form for the login screen.
 * @param {object} control - react-hook-form control object
 * @param {object} errors - react-hook-form field errors
 * @param {() => void} [onSubmit=()=>{}] - Pre-bound submit handler from `handleSubmit`
 * @param {boolean} [isLoading=false] - Shows spinner on the submit button while the request is in flight
 * @param {boolean} [showPassword=false] - Whether the password field is visible
 * @param {() => void} [onTogglePassword=()=>{}] - Toggles password visibility
 * @param {() => void} [onForgotPassword=()=>{}] - Navigates to the forgot-password screen
 * @param {() => void} [onSignUp=()=>{}] - Navigates to the register screen
 */
function LoginForm({
  control = {},
  errors = {},
  onSubmit = () => {},
  isLoading = false,
  isSuccess = false,
  showPassword = false,
  onTogglePassword = () => {},
  onForgotPassword = () => {},
  onSignUp = () => {},
}) {
  return (
    <>
      <Text variant="h4" color="white" weight="bold" className="mb-1">
        Welcome back
      </Text>
      <Text variant="body2" className="mb-6 text-white/50">
        Sign in to your account
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
            className="mb-4"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Password"
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            autoComplete="current-password"
            leftIcon={<AuthIcon Icon={Lock} size={16} />}
            labelClassName="text-white/75"
            rightIcon={
              <Pressable onPress={onTogglePassword} hitSlop={8}>
                {showPassword ? <AuthIcon Icon={EyeOff} size={16} /> : <AuthIcon Icon={Eye} size={16} />}
              </Pressable>
            }
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            className="mb-1"
          />
        )}
      />

      <Pressable onPress={onForgotPassword} className="self-end py-xs mb-xs">
        <Text variant="caption" color="primary" weight="semibold">
          Forgot password?
        </Text>
      </Pressable>

      <Button size="lg" onPress={onSubmit} loading={isLoading} disabled={isLoading || isSuccess} className="mt-4 mb-4">
        {isSuccess ? "✓ Signed in!" : "Sign in"}
      </Button>

      <View className="flex-row items-center justify-center">
        <Text variant="body2" className="text-white/50">
          Don&#39;t have an account?{" "}
        </Text>
        <Pressable onPress={onSignUp}>
          <Text variant="body2" color="primary" weight="semibold">
            Sign up
          </Text>
        </Pressable>
      </View>
    </>
  );
}

/**
 * Login Screen
 */
export default function LoginScreen({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const [login, { isLoading, error, isSuccess }] = useLoginMutation();
  useFormServerErrors(error, setError, { fallbackField: "password" });

  function onSubmit(data) {
    login(data);
  }

  return (
    <AuthScreenLayout>
      <BrandSection subtitle="Your files, everywhere" />
      <AuthCard>
        <LoginForm
          control={control}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          isLoading={isLoading}
          isSuccess={isSuccess}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          onForgotPassword={() => navigation.navigate(AppScreens.FORGOT_PASSWORD)}
          onSignUp={() => navigation.navigate(AppScreens.REGISTER)}
        />
      </AuthCard>
    </AuthScreenLayout>
  );
}
