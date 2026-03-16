// React core & third-party libraries
import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { App } from "antd"; // Retained for global message/toast until P8 sonner swap
import { Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";

// Constants
import PageUrls from "@constants/pageUrls";

// Services (RTK Query hooks)
import { useResetPasswordMutation } from "@services/api/authApi";

// Components

const resetSchema = z
  .object({
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z.string().min(1, { message: "Please confirm your new password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function ResetPasswordPage() {
  // Router hooks & params
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // RTK Query hooks
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  // Form setup
  const form = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Custom & shared hooks
  const { message } = App.useApp();

  // Derived / computed variables
  const token = searchParams.get("token");

  // Event handlers
  async function handleFinish(values) {
    try {
      await resetPassword({ token, password: values.password }).unwrap();
      message.success("Password reset successfully! Please sign in with your new password.");
      navigate(PageUrls.LoginPage);
    } catch (err) {
      const errorMessage =
        err?.data?.error?.message ||
        err?.data?.message ||
        (typeof err?.data === "string" ? err.data : null) ||
        "Failed to reset password. Your link may have expired.";
      message.error(errorMessage);
    }
  }

  // Early returns (loading, error, empty states)
  // Missing or invalid token guard
  if (!token) {
    return (
      <div className="min-h-screen bg-surface-dim flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 flex items-center justify-center bg-white rounded-3xl shadow-lg border border-line-base p-4">
            <img src="/logo.png" alt="Cloud Drive Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black text-gradient-primary tracking-tight">Cloud Drive</h1>
        </motion.div>

        <div className="w-full max-w-md">
          <Card className="rounded-3xl shadow-xl p-4 border-white/10 glass-card">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl mb-6 flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold mb-1">Invalid or missing reset link</h4>
                <p className="text-sm opacity-90">
                  This password reset link is invalid or has already been used. Please request a new one.
                </p>
              </div>
            </div>
            <div className="text-center">
              <Link to={PageUrls.ForgotPasswordPage} className="font-bold text-primary hover:text-primary-dark">
                Request a new reset link
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Render
  return (
    <div className="min-h-screen bg-surface-dim flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex flex-col items-center gap-4"
      >
        <div className="w-20 h-20 flex items-center justify-center bg-white rounded-3xl shadow-lg border border-line-base p-4">
          <img src="/logo.png" alt="Cloud Drive Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-4xl font-black text-gradient-primary tracking-tight">Cloud Drive</h1>
      </motion.div>

      <div className="w-full max-w-md">
        <Card className="rounded-3xl shadow-xl p-4 border-white/10 glass-card">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Set New Password</h2>
            <p className="text-label-secondary">Choose a strong password for your account.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFinish)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        prefix={<Lock size={18} className="text-label-tertiary" />}
                        placeholder="••••••••"
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        prefix={<Lock size={18} className="text-label-tertiary" />}
                        placeholder="••••••••"
                        className="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                variant="aurora"
                size="pill"
                type="submit"
                disabled={isLoading}
                className="w-full text-lg mt-6 font-bold"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>

          <div className="text-center mt-6">
            <span className="text-label-secondary">Remember your password? </span>
            <Link to={PageUrls.LoginPage} className="font-bold text-primary hover:text-primary-dark">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
