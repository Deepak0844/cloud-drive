// external
import {
  BellOutlined,
  CloudServerOutlined,
  LockOutlined,
  SendOutlined,
  FileImageOutlined,
  PlayCircleOutlined,
  AudioOutlined,
  FileTextOutlined,
  FileZipOutlined,
  FileOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Card, Divider, Form, Input, Switch, Progress, Skeleton, Typography } from "antd";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { Link } from "react-router-dom";

// api
import { useGetQuotaUsageQuery, useGetQuotaBreakdownQuery } from "../../store/api/quotaApi";
import { useGetMeQuery, useUpdateProfileMutation } from "../../store/api/authApi";

// constants
import PageNames from "@/constants/pageNames";
import PageUrls from "@/constants/pageUrls";

// components
import QuotaRequestModal from "@/components/settings/QuotaRequestModal";
import ChangePasswordModal from "@/components/settings/ChangePasswordModal";
import Button from "@shared-components/components/button";

const { Text } = Typography;

const CATEGORY_CONFIG = {
  image: { color: "#3b82f6", icon: <FileImageOutlined />, label: "Images" },
  video: { color: "#ec4899", icon: <PlayCircleOutlined />, label: "Videos" },
  audio: { color: "#8b5cf6", icon: <AudioOutlined />, label: "Audio" },
  document: { color: "#10b981", icon: <FileTextOutlined />, label: "Documents" },
  archive: { color: "#f59e0b", icon: <FileZipOutlined />, label: "Archives" },
  other: { color: "#64748b", icon: <FileOutlined />, label: "Other" },
};

import { formatBytes } from "@shared-utils/utils";

function SettingsPage() {
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const { data: userResponse } = useGetMeQuery();
  const user = userResponse?.data;
  const isAdmin = user?.role === "ADMIN";

  const { data: usage, isLoading: usageLoading } = useGetQuotaUsageQuery(undefined, { skip: isAdmin });
  const { data: breakdown, isLoading: breakdownLoading } = useGetQuotaBreakdownQuery(undefined, { skip: isAdmin });
  const [updateProfile] = useUpdateProfileMutation();

  const [form] = Form.useForm();

  React.useEffect(() => {
    if (user) {
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        email_notifications: user.notification_preferences?.email_notifications ?? true,
        storage_alerts: user.notification_preferences?.storage_alerts ?? true,
        security_alerts: user.notification_preferences?.security_alerts ?? true,
      });
    }
  }, [user, form]);

  async function handleUpdateProfile(isFormSubmit = true) {
    try {
      if (isFormSubmit) setIsSavingProfile(true);

      const values = await form.validateFields();
      await updateProfile({
        name: values.name,
        email: values.email,
        notification_preferences: {
          email_notifications: values.email_notifications,
          storage_alerts: values.storage_alerts,
          security_alerts: values.security_alerts,
        },
      }).unwrap();
    } catch (_err) {
      // handled by RTK error middleware or locally
    } finally {
      if (isFormSubmit) setIsSavingProfile(false);
    }
  }

  function handleRequestQuota() {
    setQuotaModalVisible(true);
  }

  const sortedBreakdown = [...(breakdown?.data || [])].sort((a, b) => b.total_size_bytes - a.total_size_bytes);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8 pb-32">
      <div className="px-1">
        <h1 className="text-3xl font-black text-label-primary tracking-tight mb-2">{PageNames.SETTINGS}</h1>
        <Breadcrumb
          items={[
            {
              title: (
                <Link to={PageUrls.DashboardPage} className="text-label-tertiary hover:text-primary transition-colors">
                  {PageNames.MY_FILES}
                </Link>
              ),
            },
            { title: <span className="text-label-primary font-bold">{PageNames.SETTINGS}</span> },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Profile & Security */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Form form={form} layout="vertical" onFinish={() => handleUpdateProfile(true)}>
            <Card
              className="rounded-[32px] border-line shadow-sm overflow-hidden"
              styles={{ body: { padding: "32px" } }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Form.Item name="name" label={<span className="font-bold text-label-secondary">Full Name</span>}>
                  <Input className="premium-input h-14" />
                </Form.Item>
                <Form.Item name="email" label={<span className="font-bold text-label-secondary">Email Address</span>}>
                  <Input className="premium-input h-14" disabled={true} />
                </Form.Item>
              </div>
              <Button
                htmlType="submit"
                styleType="primary"
                loading={isSavingProfile}
                className="h-12 px-10 font-bold rounded-2xl shadow-lg shadow-primary/20 mt-2"
              >
                Save Profile
              </Button>

              <Divider className="my-10" />

              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-warning/10 text-warning rounded-2xl flex items-center justify-center">
                  <BellOutlined className="text-2xl" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-label-primary">Notifications</h2>
                  <p className="text-sm text-label-tertiary">Manage how you receive alerts and updates</p>
                </div>
              </div>

              <div className="space-y-6">
                {[
                  {
                    name: "email_notifications",
                    label: "Email Notifications",
                    desc: "Receive updates about file sharing and system alerts",
                  },
                  {
                    name: "storage_alerts",
                    label: "Storage Alerts",
                    desc: "Get notified when your drive usage exceeds 80%",
                  },
                  {
                    name: "security_alerts",
                    label: "Security Alerts",
                    desc: "Receive alerts about new sign-ins and password changes",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex justify-between items-center p-4 rounded-2xl bg-surface-dim border border-line/50"
                  >
                    <div className="pr-4">
                      <p className="font-black text-label-primary">{item.label}</p>
                      <p className="text-xs text-label-tertiary">{item.desc}</p>
                    </div>
                    <Form.Item name={item.name} valuePropName="checked" noStyle>
                      <Switch className="premium-switch" onChange={() => handleUpdateProfile(false)} />
                    </Form.Item>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-[32px] border-line shadow-sm" styles={{ body: { padding: "32px" } }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
                  <LockOutlined className="text-2xl" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-label-primary">Security & Privacy</h2>
                  <p className="text-sm text-label-tertiary">Control your account&apos;s security settings</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                <Button
                  styleType="secondary"
                  className="h-12 flex-1 font-bold rounded-2xl"
                  onClick={() => setPasswordModalVisible(true)}
                >
                  Change Password
                </Button>
                <Button
                  styleType="ghost"
                  className="h-12 flex-1 font-bold rounded-2xl border-line-strong text-error hover:bg-error/5"
                  disabled
                >
                  Delete Account
                </Button>
              </div>
            </Card>
          </Form>
        </div>

        {/* Right Side: Storage Dashboard */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card
            className="rounded-[32px] border-line shadow-xl bg-surface-alt relative overflow-hidden"
            styles={{ body: { padding: "32px" } }}
          >
            {/* Glossy background Effect */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/10 rounded-full blur-[80px]" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <CloudServerOutlined className="text-lg" />
                </div>
                <h3 className="font-black text-label-primary">Storage Overview</h3>
              </div>
              <div className="px-2 py-1 bg-primary/10 rounded-lg">
                <span className="text-[10px] font-black uppercase tracking-tighter text-primary">Active</span>
              </div>
            </div>

            {usageLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <div className="relative z-10">
                <div className="flex items-end justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-label-primary tabular-nums">
                      {usage?.data?.percentage.toFixed(1)}
                      <span className="text-lg font-bold opacity-50">%</span>
                    </span>
                    <span className="text-[10px] font-bold text-label-tertiary uppercase tracking-widest">
                      Storage Used
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-primary block">
                      {formatBytes(usage?.data?.used_bytes)}
                    </span>
                    <span className="text-[10px] font-bold text-label-tertiary">
                      of {formatBytes(usage?.data?.quota_bytes)}
                    </span>
                  </div>
                </div>

                <Progress
                  percent={usage?.data?.percentage}
                  showInfo={false}
                  strokeLinecap="round"
                  strokeWidth={14}
                  className="premium-progress"
                  strokeColor={{
                    "0%": "var(--primary)",
                    "100%": "var(--secondary)",
                  }}
                />

                <div className="mt-8 space-y-4">
                  {breakdownLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : (
                    sortedBreakdown.map((item) => {
                      const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                      // Calculate percentage over total quota size, fallback to 0 if quota is empty
                      const percentage = (item.total_size_bytes / usage?.data?.quota_bytes) * 100 || 0;

                      return (
                        <div key={item.category} className="group cursor-default">
                          <div className="flex items-center justify-between text-xs mb-1.5 px-0.5">
                            <div className="flex items-center gap-2">
                              <span style={{ color: config.color }} className="text-sm">
                                {config.icon}
                              </span>
                              <span className="font-bold text-label-secondary">{config.label}</span>
                            </div>
                            <span className="font-black text-label-primary tabular-nums">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-line/20 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: config.color }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 px-0.5">
                            <span className="text-[9px] font-bold text-label-tertiary uppercase">
                              {item.count} items
                            </span>
                            <span className="text-[9px] font-black text-label-tertiary">
                              {formatBytes(item.total_size_bytes)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <Button
                  styleType="primary"
                  fullWidth
                  icon={<SendOutlined />}
                  onClick={handleRequestQuota}
                  className="mt-10 h-12 font-black shadow-xl shadow-primary/20 rounded-2xl border-none text-xs tracking-widest uppercase"
                >
                  Request Quota Increase
                </Button>
              </div>
            )}
          </Card>

          <Card className="rounded-[32px] border-line shadow-sm border-dashed" styles={{ body: { padding: "24px" } }}>
            <h4 className="font-black text-sm text-label-primary mb-2">NAS Engine Status</h4>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-bold text-label-secondary italic">Core services operating normally</span>
            </div>
            <Text className="text-[10px] text-label-tertiary leading-relaxed block">
              Your storage is physically managed by the Cloud Drive NAS core. Encryption and versioning are active on
              all blocks.
            </Text>
          </Card>
        </div>
      </div>
      <QuotaRequestModal open={quotaModalVisible} onClose={() => setQuotaModalVisible(false)} />
      <ChangePasswordModal open={passwordModalVisible} onClose={() => setPasswordModalVisible(false)} />
    </motion.div>
  );
}

export default SettingsPage;
