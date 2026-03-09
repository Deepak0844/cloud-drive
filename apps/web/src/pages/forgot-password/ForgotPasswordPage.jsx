import { MailOutlined } from "@ant-design/icons";
import { Alert, Card, Form, Input } from "antd";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { Link } from "react-router-dom";

// RTK Query
import { useForgotPasswordMutation } from "@services/api/authApi";

// Constants
import PageUrls from "@constants/pageUrls";

// Components
import Button from "@shared-components/components/button";

function ForgotPasswordPage() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [isSubmitted, setIsSubmitted] = useState(false);

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
            <h2 className="text-2xl font-bold">Forgot Password</h2>
            <p className="text-label-secondary">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          {isSubmitted ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Alert
                type="success"
                showIcon
                message="Check your inbox"
                description="If this email is registered, you will receive a password reset link shortly. Please also check your spam folder."
                className="rounded-xl mb-6"
              />
              <div className="text-center">
                <Link to={PageUrls.LoginPage} className="font-bold text-primary hover:text-primary-dark">
                  Back to Sign In
                </Link>
              </div>
            </motion.div>
          ) : (
            <Form layout="vertical" className="space-y-4" onFinish={handleFinish}>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, type: "email", message: "Please enter a valid email address." }]}
              >
                <Input
                  prefix={<MailOutlined className="text-label-tertiary" />}
                  placeholder="email@example.com"
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
                  Send Reset Link
                </Button>
              </Form.Item>
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
