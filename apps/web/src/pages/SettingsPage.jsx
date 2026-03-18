// React core & third-party libraries
import React, { useState, useEffect } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Bell, Lock, Cloud, Image as ImageIcon, PlayCircle, Mic, FileText, Archive, File, Send } from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useGetMeQuery, useUpdateProfileMutation } from "@services/api/authApi";
import { useGetQuotaBreakdownQuery, useGetQuotaUsageQuery } from "@services/api/quotaApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Constants

// Components
import ChangePasswordModal from "@components/settings/ChangePasswordModal";
import QuotaRequestModal from "@components/settings/QuotaRequestModal";
import Button from "@shared-components/components/button";
import { Card } from "@components/ui/card";
import { Progress } from "@components/ui/progress";
import { Skeleton } from "@components/ui/skeleton";
import { Input } from "@components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";
import { Switch } from "@components/ui/switch";

const CATEGORY_CONFIG = {
  image: { color: "var(--chart-1)", icon: <ImageIcon size={14} />, label: "Images" },
  video: { color: "var(--chart-2)", icon: <PlayCircle size={14} />, label: "Videos" },
  audio: { color: "var(--chart-3)", icon: <Mic size={14} />, label: "Audio" },
  document: { color: "var(--chart-4)", icon: <FileText size={14} />, label: "Documents" },
  archive: { color: "var(--chart-5)", icon: <Archive size={14} />, label: "Archives" },
  other: { color: "var(--text-tertiary)", icon: <File size={14} />, label: "Other" },
};

const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  email_notifications: z.boolean(),
  storage_alerts: z.boolean(),
  security_alerts: z.boolean(),
});

function SettingsPage() {
  // Local state
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);

  // RTK Query hooks
  const [updateProfile] = useUpdateProfileMutation();
  const { data: userResponse } = useGetMeQuery();

  // Derived / computed variables
  const user = userResponse?.data;
  const isAdmin = user?.role === "ADMIN";

  // RTK Query hooks
  const { data: breakdown, isLoading: breakdownLoading } = useGetQuotaBreakdownQuery(undefined, { skip: isAdmin });
  const { data: usage, isLoading: usageLoading } = useGetQuotaUsageQuery(undefined, { skip: isAdmin });

  // Custom & shared hooks
  const form = useForm({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      email_notifications: true,
      storage_alerts: true,
      security_alerts: true,
    },
  });

  // Derived / computed variables
  const sortedBreakdown = [...(breakdown?.data || [])].sort((a, b) => b.total_size_bytes - a.total_size_bytes);

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || "",
        email: user.email || "",
        email_notifications: user.notification_preferences?.email_notifications ?? true,
        storage_alerts: user.notification_preferences?.storage_alerts ?? true,
        security_alerts: user.notification_preferences?.security_alerts ?? true,
      });
    }
  }, [user, form]);

  // Event handlers
  async function handleUpdateProfile(values, showToast = true) {
    try {
      setIsSavingProfile(true);
      await updateProfile({
        name: values.name,
        email: values.email,
        notification_preferences: {
          email_notifications: values.email_notifications,
          storage_alerts: values.storage_alerts,
          security_alerts: values.security_alerts,
        },
      }).unwrap();
      if (showToast) toast.success("Profile updated successfully!");
    } catch (_err) {
      if (showToast) toast.error(_err.data?.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleSwitchChange(name, checked) {
    form.setValue(name, checked, { shouldValidate: true, shouldDirty: true });
    form.handleSubmit((values) => handleUpdateProfile(values, false))();
  }

  function handleRequestQuota() {
    setQuotaModalVisible(true);
  }

  // Render
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-8 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Profile & Security */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => handleUpdateProfile(values, true))}>
              <Card className="glass-card rounded-4xl border-transparent shadow-md overflow-hidden p-8 bg-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-label-secondary">Full Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="premium-input h-14 bg-surface-dim border-line/50 focus:border-primary/50 focus:ring-primary/20"
                            placeholder="Enter your name"
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
                        <FormLabel className="font-bold text-label-secondary">Email Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="premium-input h-14 bg-surface-dim border-line/50 opacity-70"
                            disabled
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  htmlType="submit"
                  variant="aurora"
                  size="pill"
                  loading={isSavingProfile}
                  className="px-10 mt-4 h-12"
                >
                  Save Profile
                </Button>

                <div className="flex items-center gap-4 mb-8 mt-5">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
                    <Bell size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-label">Notifications</h2>
                    <p className="text-sm text-label-tertiary font-medium">Manage how you receive alerts and updates</p>
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
                    <FormField
                      key={item.name}
                      control={form.control}
                      name={item.name}
                      render={({ field }) => (
                        <FormItem className="flex justify-between items-center p-5 rounded-2xl bg-surface-dim/50 border border-line/30 hover:border-line/60 transition-colors">
                          <div className="pr-4 space-y-0.5">
                            <p className="font-bold text-label m-0">{item.label}</p>
                            <p className="text-xs text-label-tertiary font-medium m-0">{item.desc}</p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(checked) => handleSwitchChange(item.name, checked)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </Card>

              <Card className="glass-card rounded-4xl mt-5 border-transparent shadow-md p-8 bg-white/5">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-secondary/20 text-secondary-foreground rounded-2xl flex items-center justify-center border border-secondary/30">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-label">Security & Privacy</h2>
                    <p className="text-sm text-label-tertiary font-medium">
                      Control your account&apos;s security settings
                    </p>
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
            </form>
          </Form>
        </div>

        {/* Right Side: Storage Dashboard */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="glass-card rounded-4xl border-transparent relative overflow-hidden p-8 bg-sidebar-nav-active-bg/30 shadow-glow-sm">
            {/* Glossy background Effect */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[80px] opacity-30" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/15 rounded-full blur-[80px] opacity-30" />

            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center border border-primary/30 shadow-glow-sm">
                  <Cloud size={20} />
                </div>
                <h3 className="font-black text-label">Storage Overview</h3>
              </div>
              <div className="px-2.5 py-1 bg-success/10 border border-success/20 rounded-lg">
                <span className="text-[10px] font-black uppercase tracking-widest text-success">Active</span>
              </div>
            </div>

            {usageLoading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <div className="relative z-10">
                <div className="flex items-end justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-label tabular-nums">
                      {usage?.data?.percentage.toFixed(1)}
                      <span className="text-lg font-bold opacity-40 ml-0.5">%</span>
                    </span>
                    <span className="text-[10px] font-bold text-label-tertiary uppercase tracking-widest">
                      Used Space
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-primary block">
                      {formatBytes(usage?.data?.used_bytes)}
                    </span>
                    <span className="text-[10px] font-bold text-label-tertiary opacity-80">
                      of {formatBytes(usage?.data?.quota_bytes)}
                    </span>
                  </div>
                </div>

                <Progress
                  value={usage?.data?.percentage}
                  className="h-3.5 bg-line/20 overflow-hidden rounded-full shadow-inner"
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
                          <div className="flex items-center justify-between text-xs mb-2 px-0.5">
                            <div className="flex items-center gap-2.5">
                              <span style={{ color: config.color }} className="opacity-90">
                                {config.icon}
                              </span>
                              <span className="font-bold text-label-secondary tracking-tight">{config.label}</span>
                            </div>
                            <span className="font-black text-label tabular-nums">{percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-line/10 rounded-full overflow-hidden border border-line/5 shadow-inner">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1.2, ease: "circOut" }}
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
                  variant="aurora"
                  size="pill"
                  fullWidth
                  icon={<Send size={14} />}
                  onClick={handleRequestQuota}
                  className="mt-10 h-12 uppercase tracking-[0.15em] text-xs"
                >
                  Request Quota Increase
                </Button>
              </div>
            )}
          </Card>

          <Card className="glass-card rounded-4xl border-dashed border-white/10 p-6 flex flex-col gap-3 bg-white/5 shadow-inner">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-label tracking-tight">NAS Engine Status</h4>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_var(--success)] animate-pulse" />
                <span className="text-[10px] font-extrabold text-success uppercase tracking-widest">Normal</span>
              </div>
            </div>
            <p className="text-[10px] text-label-tertiary leading-[1.6] font-medium italic opacity-80">
              Your storage is physically managed by the Cloud Drive NAS core. Encryption and versioning are active on
              all blocks.
            </p>
          </Card>
        </div>
      </div>
      <QuotaRequestModal open={quotaModalVisible} onClose={() => setQuotaModalVisible(false)} />
      <ChangePasswordModal open={passwordModalVisible} onClose={() => setPasswordModalVisible(false)} />
    </motion.div>
  );
}

export default SettingsPage;
