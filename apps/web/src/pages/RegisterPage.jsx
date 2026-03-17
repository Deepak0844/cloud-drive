// React core & third-party libraries
import React from "react";
import { Link } from "react-router-dom";
// Retained for global message/toast until P8 sonner swap
import { Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";

// Constants
import PageUrls from "@constants/pageUrls";

// Hooks
import { useAuth } from "@hooks/useAuth";

// Components

const registerSchema = z.object({
  name: z.string().min(1, { message: "Please input your name!" }),
  email: z.string().min(1, { message: "Please input your email!" }).email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters!" }),
});

function RegisterPage() {
  // Custom & shared hooks

  const { register, isRegisterLoading } = useAuth();

  // Form setup
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Event handlers

  async function handleFinish(values) {
    try {
      await register({ name: values.name, email: values.email, password: values.password });
      toast.success("Account created! Please sign in with your credentials.");
    } catch (err) {
      toast.error(err?.data?.message ?? "Registration failed. Please try again.");
    }
  }

  // Render
  return (
    <div className="w-full max-w-md">
      <Card className="rounded-3xl shadow-xl p-4 border-white/10 glass-card">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Create Account</h2>
          <p className="text-label-secondary">Join us and start managing your files securely.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFinish)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      prefix={<User size={18} className="text-label-tertiary" />}
                      placeholder="Full Name"
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
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
              disabled={isRegisterLoading}
              className="w-full text-lg mt-6 font-bold"
            >
              {isRegisterLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </Form>

        <div className="text-center mt-6">
          <span className="text-label-secondary">Already have an account? </span>
          <Link to={PageUrls.LoginPage} className="font-bold text-primary hover:text-primary-dark">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default RegisterPage;
