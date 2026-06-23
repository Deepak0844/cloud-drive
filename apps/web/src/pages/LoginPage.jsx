// React core & third-party libraries
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock, User } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Utils
import { loginSchema } from "@schemas/authSchemas";

// Components
import { Card } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Checkbox } from "@components/ui/checkbox";
import { Button } from "@components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";

// Constants
import PageUrls from "@constants/pageUrls";

// Hooks
import { useAuth } from "@hooks/useAuth";
import { useFormServerErrors } from "@shared-hooks";

function LoginPage() {
  // Router hooks & params
  const location = useLocation();

  // Form setup
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  // Custom & shared hooks
  const { login, isLoginLoading, loginError, loginSuccess } = useAuth();
  useFormServerErrors(loginError, form.setError, { fallbackField: "password" });

  // Derived / computed variables
  // Redirect back to the page the user came from, or to the dashboard
  const from = location.state?.from?.pathname ?? PageUrls.DashboardPage;

  // Event handlers

  async function handleFinish(values) {
    try {
      await login({ email: values.email, password: values.password }, from);
      toast.success("Welcome back!");
    } catch {
      // errors surfaced via useFormServerErrors
    }
  }

  // Render
  return (
    <div className="w-full max-w-md">
      <Card className="rounded-3xl shadow-xl p-4 border-white/10 glass-card">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Welcome Back</h2>
          <p className="text-label-secondary">Please enter your details to sign in.</p>
        </div>

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
                      prefix={<User size={18} className="text-label-tertiary" />}
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

            <div className="flex justify-between items-center mb-6 pt-2">
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer">Remember me</FormLabel>
                  </FormItem>
                )}
              />
              <Link
                to={PageUrls.ForgotPasswordPage}
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              variant="aurora"
              size="pill"
              type="submit"
              disabled={isLoginLoading || loginSuccess}
              className="w-full text-lg mt-2 font-bold"
            >
              {isLoginLoading ? "Signing In..." : loginSuccess ? "✓ Signed in!" : "Sign In"}
            </Button>
          </form>
        </Form>

        <div className="text-center mt-6">
          <span className="text-label-secondary">Don&apos;t have an account? </span>
          <Link to={PageUrls.RegisterPage} className="font-bold text-primary hover:text-primary-dark">
            Sign up for free
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
