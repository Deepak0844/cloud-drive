// external
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Card, Checkbox, Form, Input, message } from "antd";
import { motion } from "framer-motion";
import React from "react";
import { Link } from "react-router-dom";

// components
import Button from "@shared-components/components/button";

function LoginPage() {
  return (
    <div className="min-h-screen bg-surface-dim flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex items-center gap-4"
      >
        <div className="w-12 h-12 flex items-center justify-center">
          <img src="/logo.png" alt="Cloud Drive Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-gradient-primary">Cloud Drive</h1>
      </motion.div>

      <div className="w-full max-w-md">
        <Card className="rounded-3xl shadow-xl border-gray-100 p-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold">Welcome Back</h2>
            <p className="text-label-secondary">Please enter your details to sign in.</p>
          </div>

          <Form layout="vertical" initialValues={{ remember: true }} className="space-y-4">
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
              <span
                className="text-sm font-medium text-primary hover:text-primary-dark cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  message.info("Forgot password feature coming soon!");
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    message.info("Forgot password feature coming soon!");
                  }
                }}
              >
                Forgot password?
              </span>
            </div>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full h-12 rounded-xl font-bold shadow-primary text-lg"
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-6">
            <span className="text-label-secondary">Don&apos;t have an account? </span>
            <Link to="/register" className="font-bold text-primary hover:text-primary-dark">
              Sign up for free
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default LoginPage;
