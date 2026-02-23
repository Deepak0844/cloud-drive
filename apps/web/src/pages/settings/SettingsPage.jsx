// external
import {
  BellOutlined,
  CloudServerOutlined,
  HomeOutlined,
  LockOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Card, Divider, Form, Input, Switch } from "antd";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { Link } from "react-router-dom";

// constants
import PageNames from "@/constants/pageNames";
import PageUrls from "@/constants/pageUrls";

// components
import QuotaRequestModal from "@/components/settings/QuotaRequestModal";
import Button from "@shared-components/components/button";

function SettingsPage() {
  const [quotaModalVisible, setQuotaModalVisible] = useState(false);

  function handleRequestQuota() {
    setQuotaModalVisible(true);
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-label mb-2">{PageNames.SETTINGS}</h1>
        <Breadcrumb
          items={[
            {
              title: (
                <Link to={PageUrls.DashboardPage}>
                  <HomeOutlined /> {PageNames.MY_FILES}
                </Link>
              ),
            },
            { title: PageNames.SETTINGS },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-3xl border-line shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-light text-primary rounded-xl flex items-center justify-center">
              <UserOutlined className="text-xl" />
            </div>
            <h2 className="text-lg font-bold">Profile Information</h2>
          </div>

          <Form layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item label="Full Name">
                <Input defaultValue="Deepak Ram" className="rounded-xl h-12" />
              </Form.Item>
              <Form.Item label="Email Address">
                <Input defaultValue="deepak@example.com" className="rounded-xl h-12" />
              </Form.Item>
            </div>
            <Button type="primary" className="rounded-xl h-11 px-8 font-medium shadow-primary mt-2">
              Save Changes
            </Button>
          </Form>

          <Divider />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-warning-light text-warning rounded-xl flex items-center justify-center">
              <BellOutlined className="text-xl" />
            </div>
            <h2 className="text-lg font-bold">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Email Notifications</p>
                <p className="text-xs text-label-tertiary">Receive emails about your file activities</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Storage Alerts</p>
                <p className="text-xs text-label-tertiary">Get notified when storage is almost full</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-line shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-primary-light text-primary rounded-lg flex items-center justify-center">
                <CloudServerOutlined />
              </div>
              <h3 className="font-bold">Storage & Quota</h3>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-label-secondary font-medium">Current Usage</span>
                <span className="text-primary font-bold">1.5 GB / 2 GB</span>
              </div>
              <div className="w-full bg-border-base rounded-full h-2">
                <div className="bg-primary h-full rounded-full shadow-sm" style={{ width: "75%" }}></div>
              </div>
              <p className="text-[10px] text-label-tertiary mt-2">Personal Storage • NAS Mode</p>
            </div>

            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleRequestQuota}
              className="w-full rounded-xl h-11 font-bold shadow-primary"
            >
              Request Quota Increase
            </Button>
          </Card>

          <Card className="rounded-3xl border-line shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <LockOutlined className="text-lg text-primary" />
              <h3 className="font-bold">Security</h3>
            </div>
            <p className="text-xs text-label-secondary mb-4">Manage your account password and security settings.</p>
            <Button block className="rounded-xl h-10 border-line-strong">
              Change Password
            </Button>
          </Card>
        </div>
      </div>
      <QuotaRequestModal open={quotaModalVisible} onClose={() => setQuotaModalVisible(false)} />
    </motion.div>
  );
}

export default SettingsPage;
