// React core & third-party libraries
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";

// Services (RTK Query hooks)
import { useForgotPasswordMutation } from "@services/api/authApi";

// Constants
import PageUrls from "@constants/pageUrls";

// Components

const forgotSchema = z.object({
  email: z.string().min(1, { message: "Please enter a valid email address." }).email({ message: "Invalid email" }),
});

function ForgotPasswordPage() {
  // Local state
  const [isSubmitted, setIsSubmitted] = useState(false);

  // RTK Query hooks
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  // Form setup
  const form = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
    },
  });

  // Event handlers

  async function handleFinish(values) {
    try {
      await forgotPassword({ email: values.email }).unwrap();
      setIsSubmitted(true);
    } catch {
      // Even on API error, show the same success message to prevent email enumeration.
      // The backend already handles this, but the network/server error case also falls here.
      setIsSubmitted(true);
    }
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
            <h2 className="text-2xl font-bold">Forgot Password</h2>
            <p className="text-label-secondary">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {isSubmitted ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <div className="bg-success/10 border border-success/20 text-success p-4 rounded-xl mb-6 flex items-start gap-3">
                <CheckCircle2 className="shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold mb-1">Check your inbox</h4>
                  <p className="text-sm opacity-90">
                    If this email is registered, you will receive a password reset link shortly. Please also check your
                    spam folder.
                  </p>
                </div>
              </div>
              <div className="text-center">
                <Link to={PageUrls.LoginPage} className="font-bold text-primary hover:text-primary-dark">
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFinish)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          prefix={<Mail size={18} className="text-label-tertiary" />}
                          placeholder="email@example.com"
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
                  {isLoading ? "Sending Link..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>
          )}

          {!isSubmitted && (
            <div className="text-center mt-6">
              <span className="text-label-secondary">Remember your password? </span>
              <Link to={PageUrls.LoginPage} className="font-bold text-primary hover:text-primary-dark">
                Sign in
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
