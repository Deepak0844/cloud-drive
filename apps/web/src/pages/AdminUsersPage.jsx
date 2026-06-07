// React core & third-party libraries
import { useState } from "react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { User, CheckCircle2, XCircle, RotateCw, Edit2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useGetUsersQuery, useRunStorageReanalysisMutation, useUpdateUserStatusMutation } from "@services/api/adminApi";

// Utils
import { formatBytes, NumberUtils } from "@shared-utils/utils";

// Constants
import { ADMIN_QUERY_PARAMS } from "@constants/uiConstants";
import { DefaultPagination, Roles } from "@shared-constants/constants";

// Components
import { Button } from "@components/ui/button";
import Table from "@components/common/Table";
import { Progress } from "@components/ui/progress";
import { Skeleton } from "@components/ui/skeleton";
import { Badge } from "@components/ui/badge";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@components/ui/tooltip";
import EditQuotaModal from "@components/admin/EditQuotaModal";

export default function AdminUsersPage() {
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const userPage = Number(searchParams.get(ADMIN_QUERY_PARAMS.USER_PAGE)) || 1;

  // Local state
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Derived / computed variables
  const pageSize = DefaultPagination.pageSize;

  // RTK Query hooks
  const {
    data: usersData,
    isLoading: usersLoading,
    isFetching: usersFetching,
  } = useGetUsersQuery({ pg: userPage, ps: pageSize });

  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [runReanalysis, { isLoading: reanalyzing }] = useRunStorageReanalysisMutation();

  // Derived / computed variables
  const users = usersData?.data || [];
  const userPagination = usersData?.pagination;

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
            <span className="font-black text-label tracking-tighter text-lg select-text">{text}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => <span className="text-label-secondary font-medium select-text">{email}</span>,
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
        if (record.role === Roles.ADMIN) {
          return <span className="text-xs text-label-tertiary italic">Unlimited</span>;
        }

        const usedText = formatBytes(record.used_bytes);
        const totalText = formatBytes(record.quota_bytes);
        const percent = NumberUtils.calculatePercentage(record.used_bytes, record.quota_bytes);

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
        record.role !== Roles.ADMIN && (
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 h-full flex flex-col bg-background overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-10 shrink-0 flex items-center justify-between">
        <p className="text-label-secondary font-medium flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          User Management
        </p>
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

      {/* Users Table */}
      <div className="flex-1 min-h-0 bg-surface/40 rounded-3xl border border-white/10 shadow-2xl overflow-hidden glass-card">
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
              onChange: (p) =>
                setSearchParams((prev) => {
                  prev.set(ADMIN_QUERY_PARAMS.USER_PAGE, p);
                  return prev;
                }),
              showSizeChanger: false,
            }}
            scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
          />
        )}
      </div>

      <EditQuotaModal open={isModalOpen} onClose={() => setIsModalOpen(false)} user={editingUser} />
    </motion.div>
  );
}
