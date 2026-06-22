import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react-native";

// Rtk
import { useRegisterMutation } from "@api/authApi";

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
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  password: z.string().min(12, "Password must be at least 12 characters"),
});

/**
 * Name, email, and password form for the register screen.
 * @param {object} control - react-hook-form control object
 * @param {object} errors - react-hook-form field errors
 * @param {() => void} [onSubmit=()=>{}] - Pre-bound submit handler from `handleSubmit`
 * @param {boolean} [isLoading=false] - Shows spinner on the submit button while the request is in flight
 * @param {string} [serverError=''] - Server-side error message shown above the submit button
 * @param {boolean} [showPassword=false] - Whether the password field is visible
 * @param {() => void} [onTogglePassword=()=>{}] - Toggles password visibility
 * @param {() => void} [onSignIn=()=>{}] - Navigates to the login screen
 */
function RegisterForm({
  control = {},
  errors = {},
  onSubmit = () => {},
  isLoading = false,
  serverError = "",
  showPassword = false,
  onTogglePassword = () => {},
  onSignIn = () => {},
}) {
  return (
    <>
      <Text variant="h4" color="white" weight="bold" className="mb-1">
        Create account
      </Text>
      <Text variant="body2" className="mb-6 text-white/50">
        Join Cloud Drive today
      </Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Name"
            placeholder="Your name"
            autoComplete="name"
            leftIcon={<AuthIcon Icon={User} size={16} />}
            labelClassName="text-white/75"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            className="mb-4"
          />
        )}
      />

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
            placeholder="At least 12 characters"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
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
            className="mb-6"
          />
        )}
      />

      {serverError ? (
        <Text variant="body2" color="danger" className="mb-3">
          {serverError}
        </Text>
      ) : null}

      <Button size="lg" onPress={onSubmit} loading={isLoading} className="mb-4">
        Create account
      </Button>

      <View className="flex-row items-center justify-center">
        <Text variant="body2" className="text-white/50">
          Already have an account?{" "}
        </Text>
        <Pressable onPress={onSignIn}>
          <Text variant="body2" color="primary" weight="semibold">
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
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const [register, { isLoading, error }] = useRegisterMutation();

  const serverError = error?.data?.message ?? "";

  function onSubmit(data) {
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
          serverError={serverError}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((p) => !p)}
          onSignIn={() => navigation.goBack()}
        />
      </AuthCard>
    </AuthScreenLayout>
  );
}
