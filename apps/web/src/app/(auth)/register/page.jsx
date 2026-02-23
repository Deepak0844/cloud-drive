// external
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { Card, Form, Input } from "antd";
import { motion } from "framer-motion";
import React from "react";
import { Link } from "react-router-dom";

// components
import Button from "@shared-components/components/button";

function RegisterPage() {
  return (
    <div className="min-h-screen bg-surface-dim flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
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
            <h2 className="text-2xl font-bold">Create Account</h2>
            <p className="text-label-secondary">Join us and start managing your files securely.</p>
          </div>

          <Form layout="vertical" className="space-y-4">
            <Form.Item label="Full Name" name="name" rules={[{ required: true, message: "Please input your name!" }]}>
              <Input
                prefix={<UserOutlined className="text-label-tertiary" />}
                placeholder="Deepak Ram"
                className="h-12 rounded-xl"
              />
            </Form.Item>

            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, type: "email", message: "Please input a valid email!" }]}
            >
              <Input
                prefix={<MailOutlined className="text-label-tertiary" />}
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

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full h-12 rounded-xl font-bold shadow-primary text-lg"
              >
                Create Account
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center mt-6">
            <span className="text-label-secondary">Already have an account? </span>
            <Link to="/login" className="font-bold text-primary hover:text-primary-dark">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default RegisterPage;
