// React core & third-party libraries
import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Users, Zap } from "lucide-react";

// Services (RTK Query hooks)
import { useGetSystemStatsQuery } from "@services/api/adminApi";

// Constants
import { TIMEOUTS } from "@shared-constants/constants";

// Hooks
import useHardwareLiveStats from "@hooks/useHardwareLiveStats";

// Components
import StatCard from "@components/admin/StatCard";
import { Skeleton } from "@components/ui/skeleton";

const AdminAnalytics = lazy(() => import("@components/admin/AdminAnalytics"));

export default function AdminDashboardPage() {
  // RTK Query hooks
  const { data: statsData, isLoading: statsLoading } = useGetSystemStatsQuery(undefined, {
    pollingInterval: TIMEOUTS.NOTIFICATION_POLL_MS,
  });

  // Live hardware stats via socket (seeded by REST response)
  const { liveSystem, isLive } = useHardwareLiveStats(statsData?.data?.system);

  // Derived / computed variables
  const stats = statsData?.data;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 h-full flex flex-col bg-background overflow-y-auto"
    >
      {/* Header */}
      <div className="mb-10 shrink-0">
        <p className="text-label-secondary font-medium flex items-center gap-2">
          <LayoutDashboard size={14} className="text-primary" />
          Dashboard Overview
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        <StatCard
          title="Total Users"
          value={stats?.user_stats?.total ?? 0}
          subtext={`+${stats?.user_stats?.new_last_7d ?? 0} new this week`}
          percentage={100}
          icon={<Users size={18} />}
          color="#10b981"
          isTotal
          loading={statsLoading}
        />
        <StatCard
          title="Pending Quotas"
          value={stats?.quota_requests?.pending ?? 0}
          subtext={`${stats?.quota_requests?.approved_this_month ?? 0} approved this month`}
          percentage={100}
          icon={<Zap size={18} />}
          color="#f59e0b"
          isTotal
          loading={statsLoading}
        />
      </div>

      {/* Charts */}
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
        <AdminAnalytics stats={stats} liveSystem={liveSystem} isLive={isLive} statsLoading={statsLoading} />
      </Suspense>
    </motion.div>
  );
}
