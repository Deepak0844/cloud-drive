// React core & third-party libraries
import React, { useState } from "react";
import { Form, InputNumber, Modal } from "antd";
import { toast } from "sonner";
import {
  Cpu,
  HardDrive,
  Server as ServerIcon,
  Users,
  FileIcon,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Edit2,
} from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import {
  useGetAllQuotaRequestsQuery,
  useGetUsersQuery,
  useHandleQuotaRequestMutation,
  useRunStorageReanalysisMutation,
  useUpdateUserQuotaMutation,
  useUpdateUserStatusMutation,
  useGetSystemStatsQuery,
} from "@services/api/adminApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Constants
import PageNames from "@constants/pageNames";

// Components
import Button from "@shared-components/components/button";
import Table from "@shared-components/components/table";
import TableActionButton from "@shared-components/components/table-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Progress } from "@components/ui/progress";
import { Skeleton } from "@components/ui/skeleton";
import { Badge } from "@components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";

function bytesToGB(bytes) {
  if (!bytes) return 0;
  // Use decimal (1000) for consistency with Google Drive standards
  return Number((bytes / (1000 * 1000 * 1000)).toFixed(0));
}

function calculatePercentage(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

export default function AdminDashboardPage() {
  // Local state
  const [activeTab, setActiveTab] = useState("1");
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestPage, setRequestPage] = useState(1);
  const [userPage, setUserPage] = useState(1);

  // Derived / computed variables
  const pageSize = 10;

  // RTK Query hooks
  const {
    data: usersData,
    isLoading: usersLoading,
    isFetching: usersFetching,
  } = useGetUsersQuery({
    pg: userPage,
    ps: pageSize,
  });

  const {
    data: requestsData,
    isLoading: requestsLoading,
    isFetching: requestsFetching,
  } = useGetAllQuotaRequestsQuery({
    pg: requestPage,
    ps: pageSize,
  });

  const { data: statsData, isLoading: statsLoading } = useGetSystemStatsQuery(undefined, {
    pollingInterval: 30000,
  });

  const [updateUserQuota] = useUpdateUserQuotaMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [handleQuotaRequest] = useHandleQuotaRequestMutation();
  const [runReanalysis, { isLoading: reanalyzing }] = useRunStorageReanalysisMutation();

  // Derived / computed variables
  const users = usersData?.data || [];
  const requests = requestsData?.data || [];
  const stats = statsData?.data;
  const userPagination = usersData?.pagination;
  const requestPagination = requestsData?.pagination;

  // Event handlers
  function handleEdit(user) {
    setEditingUser(user);
    const quotaGB = bytesToGB(user.quota_bytes);
    form.setFieldsValue({ quota: quotaGB });
    setIsModalOpen(true);
  }

  async function handleUpdate() {
    try {
      const values = await form.validateFields();
      const quotaBytes = values.quota * 1000 * 1000 * 1000;
      await updateUserQuota({ id: editingUser._id, quota_bytes: quotaBytes }).unwrap();
      toast.success("Quota updated successfully");
      setIsModalOpen(false);
    } catch (_error) {
      toast.error("Failed to update quota");
    }
  }

  async function handleUserStatusToggle(userId, isActive) {
    try {
      await updateUserStatus({ id: userId, is_active: isActive }).unwrap();
      toast.success(`User has been ${isActive ? "enabled" : "disabled"}`);
    } catch (_err) {
      toast.error("Failed to update user status");
    }
  }

  async function handleRequestStatus(id, status) {
    try {
      await handleQuotaRequest({ id, status }).unwrap();
      toast.success(`Request ${status.toLowerCase()} successfully`);
    } catch (_err) {
      toast.error("Failed to update quota request");
    }
  }

  async function handleSyncStorage(userId = null) {
    const toastId = "reanalyze";
    try {
      toast.loading(userId ? "Re-analyzing user storage..." : "Re-analyzing all users storage...", { id: toastId });
      await runReanalysis({ userId }).unwrap();
      toast.success(userId ? "User storage re-analyzed successfully" : "All storage re-analyzed successfully", {
        id: toastId,
      });
    } catch (_err) {
      toast.error("Storage re-analysis failed", { id: toastId });
    }
  }

  const userColumns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text) => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-label-tertiary" />
          <span className="font-semibold text-label">{text}</span>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Badge variant="outline" className="capitalize">
          {role.toLowerCase()}
        </Badge>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Badge variant={record.is_active ? "success" : "destructive"}>{record.is_active ? "Active" : "Disabled"}</Badge>
      ),
    },
    {
      title: "Storage Used",
      key: "usage",
      render: (_, record) => {
        if (record.role === "ADMIN") {
          return null;
        }

        const usedText = formatBytes(record.used_bytes);
        const totalText = formatBytes(record.quota_bytes);
        const percent = calculatePercentage(record.used_bytes, record.quota_bytes);

        return (
          <div className="flex flex-col">
            <span className="text-label">
              {usedText} / {totalText}
            </span>
            <span className="text-xs text-label-secondary font-medium">{percent}% used</span>
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) =>
        record.role !== "ADMIN" && (
          <div className="flex gap-2">
            <TableActionButton icon={<Edit2 size={14} />} onClick={() => handleEdit(record)} buttonText="Edit Quota" />
            <TableActionButton
              icon={<RotateCw size={14} />}
              popconfirmTitle="Re-analyze storage for this user?"
              onConfirm={() => handleSyncStorage(record._id)}
              buttonText="Re-sync"
            />
            <TableActionButton
              danger={record.is_active}
              type={record.is_active ? "default" : "primary"}
              popconfirmTitle={`Are you sure you want to ${record.is_active ? "disable" : "enable"} this user?`}
              onConfirm={() => handleUserStatusToggle(record._id, !record.is_active)}
              buttonText={record.is_active ? "Disable" : "Enable"}
            />
          </div>
        ),
    },
  ];

  const quotaColumns = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="font-semibold text-label">{record.user?.name}</span>
          <span className="text-xs text-label-secondary">{record.user?.email}</span>
        </div>
      ),
    },
    {
      title: "Requested Amount",
      key: "amount",
      render: (_, record) => <span className="text-label">{formatBytes(record.requested_bytes)}</span>,
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let variant = "info";
        let IconComp = Clock;
        if (status === "APPROVED") {
          variant = "success";
          IconComp = CheckCircle2;
        }
        if (status === "REJECTED") {
          variant = "destructive";
          IconComp = XCircle;
        }
        return (
          <Badge variant={variant} className="gap-1.5">
            <IconComp size={12} />
            {status}
          </Badge>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "date",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) =>
        record.status === "PENDING" ? (
          <div className="flex gap-2">
            <TableActionButton
              type="primary"
              icon={<CheckCircle2 size={14} />}
              popconfirmTitle="Approve storage request?"
              onConfirm={() => handleRequestStatus(record._id, "APPROVED")}
              buttonText="Approve"
            />
            <TableActionButton
              danger
              icon={<XCircle size={14} />}
              popconfirmTitle="Reject storage request?"
              onConfirm={() => handleRequestStatus(record._id, "REJECTED")}
              buttonText="Reject"
            />
          </div>
        ) : null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="p-6 h-full flex flex-col"
    >
      <div className="mb-8 shrink-0 flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-label tracking-tight mb-0!">{PageNames.ADMIN}</h2>
          <p className="text-label-secondary font-medium">Manage users and storage requests</p>
        </div>
        <Button
          icon={<RotateCw size={16} />}
          loading={reanalyzing}
          onClick={() => handleSyncStorage()}
          className="rounded-xl font-bold h-11 px-6 shadow-glow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Re-analyze All Storage
        </Button>
      </div>

      {/* System Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* CPU */}
        <Card className="rounded-2xl shadow-sm border-line/50 glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-bold text-label-secondary">CPU Usage</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Cpu className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {statsLoading ? (
              <div className="space-y-3 mt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-full mt-2" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-black text-label">{stats?.system?.cpu?.load}%</div>
                <p className="text-xs font-semibold text-label-tertiary mt-1">
                  Temp: {stats?.system?.cpu?.temp === "N/A" ? "N/A" : `${stats?.system?.cpu?.temp}°C`}
                </p>
                <Progress value={parseFloat(stats?.system?.cpu?.load) || 0} className="h-1.5 mt-3" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Memory */}
        <Card className="rounded-2xl shadow-sm border-line/50 glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-bold text-label-secondary">Memory</CardTitle>
            <div className="w-8 h-8 rounded-full bg-info/10 flex items-center justify-center">
              <ServerIcon className="h-4 w-4 text-info" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {statsLoading ? (
              <div className="space-y-3 mt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-full mt-2" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-black text-label">{stats?.system?.memory?.usage_percent}%</div>
                <p className="text-xs font-semibold text-label-tertiary mt-1">
                  {formatBytes(stats?.system?.memory?.used)} / {formatBytes(stats?.system?.memory?.total)}
                </p>
                <Progress value={parseFloat(stats?.system?.memory?.usage_percent) || 0} className="h-1.5 mt-3" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Storage */}
        <Card className="rounded-2xl shadow-sm border-line/50 glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-bold text-label-secondary">Storage</CardTitle>
            <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
              <HardDrive className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {statsLoading ? (
              <div className="space-y-3 mt-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-full mt-2" />
              </div>
            ) : (
              <>
                <div className="text-2xl font-black text-label">{stats?.system?.disk?.usage_percent}%</div>
                <p className="text-xs font-semibold text-label-tertiary mt-1">
                  {formatBytes(stats?.system?.disk?.used)} / {formatBytes(stats?.system?.disk?.total)}
                </p>
                <Progress value={parseFloat(stats?.system?.disk?.usage_percent) || 0} className="h-1.5 mt-3" />
              </>
            )}
          </CardContent>
        </Card>

        {/* Counts */}
        <Card className="rounded-2xl shadow-sm border-primary/20 bg-linear-to-br from-primary/5 to-secondary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-bold text-primary">System Totals</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {statsLoading ? (
              <div className="space-y-4 mt-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="space-y-3 mt-1">
                <div className="flex justify-between items-center bg-surface-dim/50 p-2 rounded-lg border border-line/30">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-label-secondary" />
                    <span className="text-sm font-semibold text-label-secondary">Registered Users</span>
                  </div>
                  <span className="font-extrabold text-label">{stats?.counts?.total_users || 0}</span>
                </div>
                <div className="flex justify-between items-center bg-surface-dim/50 p-2 rounded-lg border border-line/30">
                  <div className="flex items-center gap-2">
                    <FileIcon size={14} className="text-label-secondary" />
                    <span className="text-sm font-semibold text-label-secondary">Total Files</span>
                  </div>
                  <span className="font-extrabold text-label">{stats?.counts?.total_files || 0}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="admin-tabs flex-1 flex flex-col">
        <TabsList className="mb-4 w-fit h-10 p-1 bg-surface-dim border border-line items-center">
          <TabsTrigger value="1" className="px-8 h-8 data-active:shadow-glow-sm">
            User Management
          </TabsTrigger>
          <TabsTrigger value="2" className="px-8 h-8 data-active:shadow-glow-sm">
            Quota Requests
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 bg-surface rounded-2xl border border-line/50 shadow-premium overflow-hidden">
          <TabsContent value="1" className="h-full m-0 p-0 focus-visible:ring-0">
            {usersLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <Table
                columns={userColumns}
                dataSource={users}
                rowKey="_id"
                className="bg-transparent border-none"
                loading={usersFetching}
                pagination={{
                  current: userPage,
                  pageSize: pageSize,
                  total: userPagination?.totalItems || 0,
                  onChange: (p) => setUserPage(p),
                  showSizeChanger: false,
                }}
                scroll={{ x: "max-content", y: "calc(100vh - 460px)" }}
              />
            )}
          </TabsContent>

          <TabsContent value="2" className="h-full m-0 p-0 focus-visible:ring-0">
            {requestsLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <Table
                columns={quotaColumns}
                dataSource={requests}
                rowKey="_id"
                className="bg-transparent border-none"
                loading={requestsFetching}
                pagination={{
                  current: requestPage,
                  pageSize: pageSize,
                  total: requestPagination?.totalItems || 0,
                  onChange: (p) => setRequestPage(p),
                  showSizeChanger: false,
                }}
                scroll={{ x: "max-content", y: "calc(100vh - 460px)" }}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Edit2 size={18} className="text-primary" />
            <span>Edit Quota for {editingUser?.name}</span>
          </div>
        }
        open={isModalOpen}
        onOk={handleUpdate}
        onCancel={() => setIsModalOpen(false)}
        className="aurora-modal"
        centered
        okText="Update Quota"
        cancelText="Cancel"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="quota"
            label={<span className="font-semibold text-label-secondary">Storage Quota (GB)</span>}
            rules={[
              { required: true, message: "Please enter quota" },
              { type: "number", min: 1, max: 1000, message: "Quota must be between 1-1000 GB" },
            ]}
          >
            <InputNumber min={1} max={1000} step={1} className="w-full h-10 flex items-center!" precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
}
