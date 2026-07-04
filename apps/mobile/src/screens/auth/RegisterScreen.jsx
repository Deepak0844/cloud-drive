import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Eye, EyeOff, User, Check, ChevronLeft } from "lucide-react-native";

// Theme
import { useTheme } from "@theme/useTheme";

// Rtk
import { useRegisterMutation } from "@api/authApi";

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

// ---------------------------------------------------------------------------
// Password strength
// ---------------------------------------------------------------------------

// Score 0-4: +1 for 12+ chars, +1 for 16+ chars, +1 for mixing letters+digits, +1 for a symbol.
function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-zA-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  const levels = [
    { label: "Weak", colorKey: "danger" },
    { label: "Weak", colorKey: "danger" },
    { label: "Fair", colorKey: "warning" },
    { label: "Good", colorKey: "success" },
    { label: "Strong", colorKey: "success" },
  ];
  return { score, ...levels[score] };
}

/**
 * Segmented password-strength meter. Hidden until the user has typed something.
 * @param {string} [password=''] - Current password field value
 */
function PasswordStrengthMeter({ password = "" }) {
  const { colors } = useTheme();
  if (!password) return null;

  const { score, label, colorKey } = getPasswordStrength(password);
  const fillColor = colors[colorKey].DEFAULT;

  return (
    <View className="flex-row items-center gap-1 mt-1.5">
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          className="flex-1 h-[3px] rounded-full bg-border"
          style={i < score ? { backgroundColor: fillColor } : undefined}
        />
      ))}
      <Text size="2xs" bold style={{ color: fillColor }} className="ml-1">
        {label}
      </Text>
    </View>
  );
}

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
        Create Account
      </Text>
    </View>
  );
}

/**
 * Name, email, and password form for the register screen.
 * @param {object} control - react-hook-form control object
 * @param {object} errors - react-hook-form field errors
 * @param {() => void} [onSubmit=()=>{}] - Pre-bound submit handler from `handleSubmit`
 * @param {boolean} [isLoading=false] - Shows spinner on the submit button while the request is in flight
 * @param {boolean} [showPassword=false] - Whether the password field is visible
 * @param {() => void} [onTogglePassword=()=>{}] - Toggles password visibility
 * @param {string} [passwordValue=''] - Live password field value, used to check confirm-password match
 * @param {() => void} [onSignIn=()=>{}] - Navigates to the login screen
 */
function RegisterForm({
  control = {},
  errors = {},
  onSubmit = () => {},
  isLoading = false,
  showPassword = false,
  onTogglePassword = () => {},
  passwordValue = "",
  onSignIn = () => {},
}) {
  const { colors } = useTheme();

  return (
    <>
      <Text size="sm" className="mb-6 text-white/50">
        Fill in your details to get started
      </Text>

      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1 mb-4">
            <Text size="sm" bold className="text-secondary uppercase tracking-widest">
              Full name
            </Text>
            <Input isInvalid={!!errors.name} className="rounded-xl">
              <InputField
                placeholder="Your name"
                autoComplete="name"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
              <InputSlot>
                <AuthIcon Icon={User} size={16} />
              </InputSlot>
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

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="gap-1 mb-4">
            <Text size="sm" bold className="text-secondary uppercase tracking-widest">
              Password
            </Text>
            <Input isInvalid={!!errors.password} className="rounded-xl">
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
            <PasswordStrengthMeter password={value} />
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
        render={({ field: { onChange, onBlur, value } }) => {
          const isMatch = value.length > 0 && value === passwordValue;
          return (
            <View className="gap-1 mb-1">
              <Text size="sm" bold className="text-secondary uppercase tracking-widest">
                Confirm password
              </Text>
              <Input isInvalid={!!errors.confirmPassword} className="rounded-xl">
                <InputField
                  placeholder="Repeat your password"
                  secureTextEntry={true}
                  autoComplete="new-password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
                <InputSlot>{isMatch ? <Check size={16} color={colors.success.DEFAULT} /> : null}</InputSlot>
              </Input>
              {errors.confirmPassword?.message ? (
                <Text size="xs" className="text-danger">
                  {errors.confirmPassword.message}
                </Text>
              ) : null}
            </View>
          );
        }}
      />

      <Text size="xs" className="text-secondary leading-5 mt-2 mb-6">
        By creating an account you agree to our{" "}
        <Text size="xs" className="text-primary">
          Terms of Service
        </Text>{" "}
        and{" "}
        <Text size="xs" className="text-primary">
          Privacy Policy
        </Text>
      </Text>

      <Button size="lg" onPress={onSubmit} disabled={isLoading} className="mb-4">
        {isLoading ? <ButtonSpinner /> : <ButtonText>Create Account</ButtonText>}
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
  const {
    control,
    handleSubmit,
    setError,
    watch,
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
    <AuthScreenLayout centered={false}>
      <BackRow onBack={() => navigation.goBack()} />
      <AuthCard>
        <RegisterForm
          control={control}
          errors={errors}
          onSubmit={handleSubmit(onSubmit)}
          isLoading={isLoading}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          passwordValue={watch("password")}
          onSignIn={() => navigation.goBack()}
        />
      </AuthCard>
    </AuthScreenLayout>
  );
}
