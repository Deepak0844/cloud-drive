import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react-native";

// Rtk
import { useRegisterMutation } from "@api/authApi";

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
const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Enter a valid email"),
    password: z.string().min(1, "Password is required").min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Name, email, and password form for the register screen.
 * @param {object} control - react-hook-form control object
 * @param {object} errors - react-hook-form field errors
 * @param {() => void} [onSubmit=()=>{}] - Pre-bound submit handler from `handleSubmit`
 * @param {boolean} [isLoading=false] - Shows spinner on the submit button while the request is in flight
 * @param {boolean} [showPassword=false] - Whether the password field is visible
 * @param {() => void} [onTogglePassword=()=>{}] - Toggles password visibility
 * @param {() => void} [onSignIn=()=>{}] - Navigates to the login screen
 */
function RegisterForm({
  control = {},
  errors = {},
  onSubmit = () => {},
  isLoading = false,
  showPassword = false,
  onTogglePassword = () => {},
  showConfirmPassword = false,
  onToggleConfirmPassword = () => {},
  onSignIn = () => {},
}) {
  return (
    <>
      <Text size="2xl" bold className="text-white mb-1">
        Create account
      </Text>
      <Text size="sm" className="mb-6 text-white/50">
        Join Cloud Drive today
      </Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1 mb-4">
            <Text size="sm" className="text-white/75">
              Name
            </Text>
            <Input isInvalid={!!errors.name}>
              <InputSlot>
                <AuthIcon Icon={User} size={16} />
              </InputSlot>
              <InputField
                placeholder="Your name"
                autoComplete="name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            </Input>
            {errors.name?.message ? (
              <Text size="xs" className="text-danger">
                {errors.name.message}
              </Text>
            ) : null}
          </View>
        )}
      />

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
          <View className="gap-1 mb-4">
            <Text size="sm" className="text-white/75">
              Password
            </Text>
            <Input isInvalid={!!errors.password}>
              <InputSlot>
                <AuthIcon Icon={Lock} size={16} />
              </InputSlot>
              <InputField
                placeholder="At least 12 characters"
                secureTextEntry={!showPassword}
                autoComplete="new-password"
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

      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1 mb-6">
            <Text size="sm" className="text-white/75">
              Confirm Password
            </Text>
            <Input isInvalid={!!errors.confirmPassword}>
              <InputSlot>
                <AuthIcon Icon={Lock} size={16} />
              </InputSlot>
              <InputField
                placeholder="Repeat your password"
                secureTextEntry={!showConfirmPassword}
                autoComplete="new-password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
              <InputSlot onPress={onToggleConfirmPassword}>
                <AuthIcon Icon={showConfirmPassword ? EyeOff : Eye} size={16} />
              </InputSlot>
            </Input>
            {errors.confirmPassword?.message ? (
              <Text size="xs" className="text-danger">
                {errors.confirmPassword.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      <Button size="lg" onPress={onSubmit} disabled={isLoading} className="mb-4">
        {isLoading ? <ButtonSpinner /> : <ButtonText>Create account</ButtonText>}
      </Button>

      <View className="flex-row items-center justify-center">
        <Text size="sm" className="text-white/50">
          Already have an account?{" "}
        </Text>
        <Pressable onPress={onSignIn}>
          <Text size="sm" bold className="text-primary">
            Sign in
          </Text>
        </Pressable>
      </View>
    </>
  );
}

/**
 * Register Screen
 */
export default function RegisterScreen({ navigation }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });
  const [register, { isLoading, error }] = useRegisterMutation();
  useFormServerErrors(error, setError, { fallbackField: "email" });

  function onSubmit({ confirmPassword: _confirmPassword, ...data }) {
    register(data);
  }

  return (
    <AuthScreenLayout>
      <BrandSection subtitle="Your files, everywhere" />
      <AuthCard>
        <RegisterForm
          control={control}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          isLoading={isLoading}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          showConfirmPassword={showConfirmPassword}
          onToggleConfirmPassword={() => setShowConfirmPassword((prev) => !prev)}
          onSignIn={() => navigation.goBack()}
        />
      </AuthCard>
    </AuthScreenLayout>
  );
}
