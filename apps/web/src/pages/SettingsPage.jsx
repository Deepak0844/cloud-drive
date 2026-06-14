// React core & third-party libraries
import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Bell, Lock } from "lucide-react";
import { motion } from "framer-motion";

// Utils
import { profileFormSchema } from "@schemas/settingsSchemas";

// Services (RTK Query hooks)
import { useGetMeQuery, useUpdateProfileMutation } from "@services/api/authApi";
import { useGetQuotaBreakdownQuery, useGetQuotaUsageQuery } from "@services/api/quotaApi";

// Constants
import { Roles } from "@shared-constants/constants";

// Components
import ChangePasswordModal from "@components/settings/ChangePasswordModal";
import QuotaRequestModal from "@components/settings/QuotaRequestModal";
import StorageDashboardCard from "@components/settings/StorageDashboardCard";
import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@components/ui/form";
import { Switch } from "@components/ui/switch";

function SettingsPage() {
  // Local state
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);

  // RTK Query hooks
  const [updateProfile] = useUpdateProfileMutation();
  const { data: userResponse } = useGetMeQuery();

  // Derived / computed variables
  const user = userResponse;
  const isAdmin = user?.role === Roles.ADMIN;

  // RTK Query hooks (continued)
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
  const sortedBreakdown = [...(breakdown || [])].sort((a, b) => b.total_size_bytes - a.total_size_bytes);

  // Effects
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
                  type="submit"
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
                    variant="outline"
                    className="h-12 flex-1 font-bold rounded-2xl"
                    onClick={() => setPasswordModalVisible(true)}
                  >
                    Change Password
                  </Button>
                  <Button
                    variant="ghost"
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
        <StorageDashboardCard
          usage={usage}
          usageLoading={usageLoading}
          sortedBreakdown={sortedBreakdown}
          breakdownLoading={breakdownLoading}
          isAdmin={isAdmin}
          onRequestQuota={handleRequestQuota}
        />
      </div>
      <QuotaRequestModal open={quotaModalVisible} onClose={() => setQuotaModalVisible(false)} />
      <ChangePasswordModal open={passwordModalVisible} onClose={() => setPasswordModalVisible(false)} />
    </motion.div>
  );
}

export default SettingsPage;
