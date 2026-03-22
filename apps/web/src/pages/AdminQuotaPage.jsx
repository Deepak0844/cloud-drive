// React core & third-party libraries
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

// Services (RTK Query hooks)
import { useGetAllQuotaRequestsQuery, useHandleQuotaRequestMutation } from "@services/api/adminApi";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Constants
import { ADMIN_QUERY_PARAMS } from "@constants/uiConstants";
import { DefaultPagination } from "@shared-constants/constants";

// Components
import { Button } from "@components/ui/button";
import Table from "@components/common/Table";
import { Skeleton } from "@components/ui/skeleton";
import { Badge } from "@components/ui/badge";

export default function AdminQuotaPage() {
  // URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const requestPage = Number(searchParams.get(ADMIN_QUERY_PARAMS.REQUEST_PAGE)) || 1;

  // Derived / computed variables
  const pageSize = DefaultPagination.pageSize;

  // RTK Query hooks
  const {
    data: requestsData,
    isLoading: requestsLoading,
    isFetching: requestsFetching,
  } = useGetAllQuotaRequestsQuery({ pg: requestPage, ps: pageSize });

  const [handleQuotaRequest] = useHandleQuotaRequestMutation();

  // Derived / computed variables
  const requests = requestsData?.data || [];
  const requestPagination = requestsData?.pagination;
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  // Event handlers
  async function handleRequestStatus(id, status) {
    try {
      await handleQuotaRequest({ id, status }).unwrap();
      toast.success(`Request ${status.toLowerCase()} successfully`);
    } catch (_err) {
      toast.error("Failed to update quota request");
    }
  }

  const quotaColumns = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="font-bold text-label select-text">{record.user?.name || "Unknown User"}</span>
          <span className="text-xs text-label-secondary font-medium select-text">
            {record.user?.email || "No Email"}
          </span>
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
      render: (reason) => <span className="text-label-secondary font-medium max-w-50 truncate block">{reason}</span>,
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
        <p className="text-label-secondary font-medium flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          Quota Requests
        </p>
        {pendingCount > 0 && (
          <Badge className="bg-warning/10 text-warning border-warning/20 px-4 py-1.5 font-black italic rounded-xl">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Quota Requests Table */}
      <div className="flex-1 min-h-0 bg-surface/40 rounded-3xl border border-white/10 shadow-2xl overflow-hidden glass-card">
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
              onChange: (p) =>
                setSearchParams((prev) => {
                  prev.set(ADMIN_QUERY_PARAMS.REQUEST_PAGE, p);
                  return prev;
                }),
              showSizeChanger: false,
            }}
            scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
          />
        )}
      </div>
    </motion.div>
  );
}
