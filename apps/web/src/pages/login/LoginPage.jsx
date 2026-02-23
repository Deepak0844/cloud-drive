// external
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { App, Card, Checkbox, Form, Input } from "antd";
import { motion } from "framer-motion";
import React from "react";
import { Link, useLocation } from "react-router-dom";

// hooks
import { useAuth } from "@/hooks/useAuth";

// constants
import PageUrls from "@/constants/pageUrls";

// components
import Button from "@shared-components/components/button";

function LoginPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const { login, isLoginLoading } = useAuth();

  // Redirect back to the page the user came from, or to the dashboard
  const from = location.state?.from?.pathname ?? "/";

  async function handleFinish(values) {
    try {
      await login(
        { email: values.email, password: values.password },
        from,
        { suppressGlobalError: true } // Let this component handle the error feedback
      );
      message.success("Welcome back!");
    } catch (err) {
      message.error(err?.data?.message ?? "Login failed. Please try again.");
    }
  }

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
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-label-secondary">Please enter your details to sign in.</p>
          </div>

          <Form layout="vertical" initialValues={{ remember: true }} className="space-y-4" onFinish={handleFinish}>
            <Form.Item label="Email" name="email" rules={[{ required: true, message: "Please input your email!" }]}>
              <Input
                prefix={<UserOutlined className="text-label-tertiary" />}
                placeholder="email@example.com"
                className="h-12 rounded-xl"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Please input your password!" }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-label-tertiary" />}
                placeholder="••••••••"
                className="h-12 rounded-xl"
              />
            </Form.Item>

            <div className="flex justify-between items-center mb-6">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>Remember me</Checkbox>
              </Form.Item>
              <Link
                to={PageUrls.ForgotPasswordPage}
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                Forgot password?
              </Link>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoginLoading}
                className="w-full h-12 rounded-xl font-bold shadow-primary text-lg"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-6">
            <span className="text-label-secondary">Don&apos;t have an account? </span>
            <Link to={PageUrls.RegisterPage} className="font-bold text-primary hover:text-primary-dark">
              Sign up for free
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
