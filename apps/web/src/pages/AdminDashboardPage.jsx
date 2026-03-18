// React core & third-party libraries
import React, { useState } from "react";
import { toast } from "sonner";
import {
  Cpu,
  HardDrive,
  Server as ServerIcon,
  Users,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Edit2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Services (RTK Query hooks)
import {
  useGetAllQuotaRequestsQuery,
  useGetUsersQuery,
  useHandleQuotaRequestMutation,
  useRunStorageReanalysisMutation,
  useUpdateUserStatusMutation,
  useGetSystemStatsQuery,
} from "@services/api/adminApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Constants

// Components
import Button from "@shared-components/components/button";
import Table from "@shared-components/components/table";
import { Card, CardContent } from "@components/ui/card";
import { Progress } from "@components/ui/progress";
import { Skeleton } from "@components/ui/skeleton";
import { Badge } from "@components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@components/ui/tabs";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@components/ui/tooltip";
import EditQuotaModal from "@components/admin/EditQuotaModal";

function calculatePercentage(used, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

/**
 * Mini Circular Progress / Ring Chart
 */
function MiniRing({ percentage, color = "currentColor", size = 48, strokeWidth = 5 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-label">{Math.round(percentage)}%</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  // Local state
  const [activeTab, setActiveTab] = useState("users");
  const [editingUser, setEditingUser] = useState(null);
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
    setIsModalOpen(true);
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
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative w-12 h-12 rounded-2xl bg-surface-alt border border-white/10 flex items-center justify-center shadow-2xl overflow-hidden backdrop-blur-xl group-hover:border-primary/50 transition-all duration-500">
              <User size={22} className="text-primary group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-label tracking-tighter text-lg">{text}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => <span className="text-label-secondary font-medium">{email}</span>,
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Badge
          variant={record.is_active ? "success" : "destructive"}
          className={`px-3 py-1 ${record.is_active ? "bg-success/10" : "bg-destructive/10"}`}
        >
          {record.is_active ? "Active" : "Disabled"}
        </Badge>
      ),
    },
    {
      title: "Storage Used",
      key: "usage",
      render: (_, record) => {
        if (record.role === "ADMIN") {
          return <span className="text-xs text-label-tertiary italic">Unlimited</span>;
        }

        const usedText = formatBytes(record.used_bytes);
        const totalText = formatBytes(record.quota_bytes);
        const percent = calculatePercentage(record.used_bytes, record.quota_bytes);

        return (
          <div className="flex flex-col gap-1 w-32">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-label">{usedText}</span>
              <span className="text-label-tertiary">{totalText}</span>
            </div>
            <Progress
              value={percent}
              className="h-1.5 bg-white/5"
              indicatorClassName="bg-gradient-to-r from-primary to-info"
            />
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "action",
      render: (_, record) =>
        record.role !== "ADMIN" && (
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleEdit(record)}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-label-secondary hover:bg-primary/20 hover:text-primary hover:border-primary/30 hover:shadow-glow-sm transition-all duration-300 group"
                  >
                    <Edit2 size={16} className="group-hover:scale-110 transition-transform" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Edit Quota</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleSyncStorage(record._id)}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-label-secondary hover:bg-info/20 hover:text-info hover:border-info/30 hover:shadow-glow-info transition-all duration-300 group"
                  >
                    <RotateCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Re-sync Storage</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleUserStatusToggle(record._id, !record.is_active)}
                    className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 group ${
                      record.is_active
                        ? "text-label-secondary hover:bg-destructive/20 hover:text-destructive hover:border-destructive/30 hover:shadow-glow-destructive"
                        : "text-success hover:bg-success/20 hover:border-success/30 hover:shadow-glow-success"
                    }`}
                  >
                    {record.is_active ? (
                      <XCircle size={16} className="group-hover:scale-110 transition-transform" />
                    ) : (
                      <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{record.is_active ? "Disable User" : "Enable User"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
          <span className="font-bold text-label">{record.user?.name || "Unknown User"}</span>
          <span className="text-xs text-label-secondary font-medium">{record.user?.email || "No Email"}</span>
        </div>
      ),
    },
    {
      title: "Requested Amount",
      key: "amount",
      render: (_, record) => (
        <span className="text-lg font-black text-gradient-primary italic tracking-tighter">
          {formatBytes(record.requested_bytes)}
        </span>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
      render: (reason) => (
        <span className="text-label-secondary font-medium max-w-[200px] truncate block">{reason}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let IconComp = Clock;
        let className = "bg-info/5 text-info border-info/20 shadow-glow-sm";

        if (status === "APPROVED") {
          IconComp = CheckCircle2;
          className = "bg-success/10 text-success border-success/20 shadow-glow-sm cursor-default";
        }
        if (status === "REJECTED") {
          IconComp = XCircle;
          className = "bg-destructive/10 text-destructive border-destructive/20 shadow-glow-sm cursor-default";
        }
        return (
          <Badge variant="outline" className={`gap-2 px-4 py-1.5 font-black italic rounded-xl ${className}`}>
            <IconComp size={14} strokeWidth={3} />
            {status}
          </Badge>
        );
      },
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "date",
      render: (date) => <span className="text-label-tertiary font-medium">{new Date(date).toLocaleDateString()}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) =>
        record.status === "PENDING" ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 rounded-lg bg-success/10 hover:bg-success/20 border-success/20 text-success font-bold text-xs"
              onClick={() => handleRequestStatus(record._id, "APPROVED")}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-4 rounded-lg bg-destructive/10 hover:bg-destructive/20 border-destructive/20 text-destructive font-bold text-xs"
              onClick={() => handleRequestStatus(record._id, "REJECTED")}
            >
              Reject
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 h-full flex flex-col bg-background overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-10 shrink-0 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-label-secondary font-medium flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary" />
            System Administration & Analytics
          </p>
        </div>
        <Button
          variant="aurora"
          size="pill"
          icon={<RotateCw size={16} />}
          loading={reanalyzing}
          onClick={() => handleSyncStorage()}
          className="h-12 px-8 shadow-glow-lg font-black italic tracking-tight"
        >
          Re-analyze All Storage
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {/* CPU */}
        <StatCard
          title="CPU Usage"
          value={`${stats?.system?.cpu?.load}%`}
          subtext={`Temp: ${stats?.system?.cpu?.temp === "N/A" ? "N/A" : `${stats?.system?.cpu?.temp}°C`}`}
          percentage={parseFloat(stats?.system?.cpu?.load) || 0}
          icon={<Cpu size={18} />}
          color="#7c3aed"
          loading={statsLoading}
        />
        {/* Memory */}
        <StatCard
          title="Memory"
          value={`${stats?.system?.memory?.usage_percent}%`}
          subtext={`${formatBytes(stats?.system?.memory?.used)} / ${formatBytes(stats?.system?.memory?.total)}`}
          percentage={parseFloat(stats?.system?.memory?.usage_percent) || 0}
          icon={<ServerIcon size={18} />}
          color="#06b6d4"
          loading={statsLoading}
        />
        {/* Storage */}
        <StatCard
          title="System Storage"
          value={`${stats?.system?.disk?.usage_percent}%`}
          subtext={`${formatBytes(stats?.system?.disk?.used)} / ${formatBytes(stats?.system?.disk?.total)}`}
          percentage={parseFloat(stats?.system?.disk?.usage_percent) || 0}
          icon={<HardDrive size={18} />}
          color="#f59e0b"
          loading={statsLoading}
        />
        {/* Users */}
        <StatCard
          title="Total Users"
          value={stats?.counts?.total_users || 0}
          subtext="Registered Accounts"
          percentage={100}
          icon={<Users size={18} />}
          color="#10b981"
          isTotal
          loading={statsLoading}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mb-6 w-fit h-14 p-1.5 glass-bar border-white/10 rounded-2xl items-center gap-2">
          <TabsTrigger
            value="users"
            className="px-8 h-11 rounded-xl gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow-md font-bold transition-all hover:bg-white/5 active:scale-95"
          >
            <Users size={16} />
            Users
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="px-8 h-11 rounded-xl gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-glow-md font-bold transition-all hover:bg-white/5 active:scale-95"
          >
            <Zap size={16} />
            Quota Requests
            {requests.filter((r) => r.status === "PENDING").length > 0 && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 min-h-0 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <TabsContent value="users" className="h-full m-0 p-0 focus-visible:ring-0 outline-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full bg-surface/40 rounded-3xl border border-white/10 shadow-2xl overflow-hidden glass-card"
              >
                {usersLoading ? (
                  <div className="p-8 space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <Table
                    columns={userColumns}
                    dataSource={users}
                    rowKey="_id"
                    className="bg-transparent border-none admin-premium-table"
                    loading={usersFetching}
                    pagination={{
                      current: userPage,
                      pageSize: pageSize,
                      total: userPagination?.totalItems || 0,
                      onChange: (p) => setUserPage(p),
                      showSizeChanger: false,
                    }}
                    scroll={{ x: "max-content", y: "calc(100vh - 440px)" }}
                  />
                )}
              </motion.div>
            </TabsContent>

            <TabsContent value="requests" className="h-full m-0 p-0 focus-visible:ring-0 outline-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="h-full bg-surface/40 rounded-3xl border border-white/10 shadow-2xl overflow-hidden glass-card"
              >
                {requestsLoading ? (
                  <div className="p-8 space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                ) : (
                  <Table
                    columns={quotaColumns}
                    dataSource={requests}
                    rowKey="_id"
                    className="bg-transparent border-none admin-premium-table"
                    loading={requestsFetching}
                    pagination={{
                      current: requestPage,
                      pageSize: pageSize,
                      total: requestPagination?.totalItems || 0,
                      onChange: (p) => setRequestPage(p),
                      showSizeChanger: false,
                    }}
                    scroll={{ x: "max-content", y: "calc(100vh - 440px)" }}
                  />
                )}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </div>
      </Tabs>

      {/* Quota Modal */}
      <EditQuotaModal open={isModalOpen} onClose={() => setIsModalOpen(false)} user={editingUser} />
    </motion.div>
  );
}

/**
 * Stat Card Sub-component
 */
function StatCard({ title, value, subtext, percentage, icon, color, loading, isTotal = false }) {
  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300 group relative overflow-hidden h-40">
      <div
        className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full pointer-events-none -mr-16 -mt-16 transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: color }}
      />
      <CardContent className="p-0 h-full flex items-center px-6">
        {loading ? (
          <div className="w-full flex justify-between items-center">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-14 w-14 rounded-full" />
          </div>
        ) : (
          <div className="w-full flex justify-between items-center relative">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-label-tertiary group-hover:text-label transition-colors">
                  {React.cloneElement(icon, { size: 16 })}
                </div>
                <h3 className="text-xs font-bold text-label-secondary uppercase tracking-widest">{title}</h3>
              </div>
              <div className="text-3xl font-black text-label tracking-tighter truncate leading-tight">{value}</div>
              <p className="text-[10px] font-bold text-label-tertiary uppercase truncate max-w-[120px]">{subtext}</p>
            </div>
            {!isTotal ? (
              <MiniRing percentage={percentage} color={color} size={64} strokeWidth={6} />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5 shadow-inner transition-transform group-hover:scale-105"
                style={{ color }}
              >
                {React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
