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
import { Input, InputField, InputSlot } from "@components/ui/input/Input";
import Button, { ButtonSpinner, ButtonText } from "@components/ui/button/Button";
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
      <Text size="2xl" bold className="text-white mb-1">
        Welcome back
      </Text>
      <Text size="sm" className="mb-6 text-white/50">
        Sign in to your account
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1 mb-4">
            <Text size="sm" className="text-white/75">
              Email
            </Text>
            <Input isInvalid={!!errors.email}>
              <InputSlot>
                <AuthIcon Icon={Mail} size={16} />
              </InputSlot>
              <InputField
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            </Input>
            {errors.email?.message ? (
              <Text size="xs" className="text-danger">
                {errors.email.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1 mb-1">
            <Text size="sm" className="text-white/75">
              Password
            </Text>
            <Input isInvalid={!!errors.password}>
              <InputSlot>
                <AuthIcon Icon={Lock} size={16} />
              </InputSlot>
              <InputField
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
              <InputSlot onPress={onTogglePassword}>
                <AuthIcon Icon={showPassword ? EyeOff : Eye} size={16} />
              </InputSlot>
            </Input>
            {errors.password?.message ? (
              <Text size="xs" className="text-danger">
                {errors.password.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      <Pressable onPress={onForgotPassword} className="self-end py-xs mb-xs">
        <Text size="xs" bold className="text-primary">
          Forgot password?
        </Text>
      </Pressable>

      <Button size="lg" onPress={onSubmit} disabled={isLoading || isSuccess} className="mt-4 mb-4">
        {isLoading ? <ButtonSpinner /> : <ButtonText>{isSuccess ? "✓ Signed in!" : "Sign in"}</ButtonText>}
      </Button>

      <View className="flex-row items-center justify-center">
        <Text size="sm" className="text-white/50">
          Don&#39;t have an account?{" "}
        </Text>
        <Pressable onPress={onSignUp}>
          <Text size="sm" bold className="text-primary">
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
