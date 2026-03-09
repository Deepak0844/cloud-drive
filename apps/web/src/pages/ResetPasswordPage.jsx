// React core & third-party libraries
import React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, App, Card, Form, Input } from "antd";
import { LockOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

// Constants
import PageUrls from "@constants/pageUrls";

// Services (RTK Query hooks)
import { useResetPasswordMutation } from "@services/api/authApi";

// Components
import Button from "@shared-components/components/button";

function ResetPasswordPage() {
  // Router hooks & params
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // RTK Query hooks
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

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
          <Card className="rounded-3xl shadow-xl border-gray-100 p-4">
            <Alert
              type="error"
              showIcon
              message="Invalid or missing reset link"
              description="This password reset link is invalid or has already been used. Please request a new one."
              className="rounded-xl mb-6"
            />
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
        <Card className="rounded-3xl shadow-xl border-gray-100 p-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Set New Password</h2>
            <p className="text-label-secondary">Choose a strong password for your account.</p>
          </div>

          <Form layout="vertical" className="space-y-4" onFinish={handleFinish}>
            <Form.Item
              label="New Password"
              name="password"
              rules={[{ required: true, min: 6, message: "Password must be at least 6 characters." }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-label-tertiary" />}
                placeholder="••••••••"
                className="h-12 rounded-xl"
              />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="confirmPassword"
              dependencies={["password"]}
              rules={[
                { required: true, message: "Please confirm your new password." },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error("Passwords do not match."));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-label-tertiary" />}
                placeholder="••••••••"
                className="h-12 rounded-xl"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                className="w-full h-12 rounded-xl font-bold shadow-primary text-lg"
              >
                Reset Password
              </Button>
            </Form.Item>
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
