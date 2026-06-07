// React core & third-party libraries
import PropTypes from "prop-types";
import { Cpu, HardDrive, Server as ServerIcon } from "lucide-react";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Components
import HardwareGaugeCard from "./charts/HardwareGaugeCard";
import UserStatusDonut from "./charts/UserStatusDonut";
import StorageOverviewCard from "./charts/StorageOverviewCard";
import QuotaRequestsChart from "./charts/QuotaRequestsChart";
import UploadVelocityChart from "./charts/UploadVelocityChart";

/**
 * Analytics tab content for the Admin Dashboard.
 * Hardware gauges use live socket data; all other charts use the REST stats snapshot.
 *
 * @param {{ stats: object, liveSystem: object|null, isLive: boolean, statsLoading: boolean }} props
 */
export default function AdminAnalytics({ stats, liveSystem = null, isLive = false, statsLoading = false }) {
  const system = liveSystem ?? stats?.system;

  return (
    <div className="space-y-6 pb-6">
      {/* Row 1 — Hardware gauges (live) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <HardwareGaugeCard
          title="CPU Usage"
          percent={system?.cpu?.load}
          subtext={`Temp: ${system?.cpu?.temp === "N/A" ? "N/A" : `${system?.cpu?.temp}°C`}`}
          icon={<Cpu size={16} />}
          color="#7c3aed"
          loading={statsLoading}
          isLive={isLive}
        />
        <HardwareGaugeCard
          title="Memory"
          percent={system?.memory?.usage_percent}
          subtext={`${formatBytes(system?.memory?.used ?? 0)} / ${formatBytes(system?.memory?.total ?? 0)}`}
          icon={<ServerIcon size={16} />}
          color="#06b6d4"
          loading={statsLoading}
          isLive={isLive}
        />
        <HardwareGaugeCard
          title={`Disk · ${system?.disk?.path ?? "—"}`}
          percent={system?.disk?.usage_percent}
          subtext={`${formatBytes(system?.disk?.used ?? 0)} / ${formatBytes(system?.disk?.total ?? 0)}`}
          icon={<HardDrive size={16} />}
          color="#f59e0b"
          loading={statsLoading}
          isLive={isLive}
        />
      </div>

      {/* Row 2 — User status | Storage overview | Upload velocity */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <UserStatusDonut userStats={stats?.user_stats} loading={statsLoading} />
        <StorageOverviewCard
          storageOverview={stats?.storage_overview}
          fileStats={stats?.file_stats}
          loading={statsLoading}
        />
        <UploadVelocityChart fileStats={stats?.file_stats} loading={statsLoading} />
      </div>

      {/* Row 3 — Quota requests (full width) */}
      <QuotaRequestsChart quotaRequests={stats?.quota_requests} loading={statsLoading} />
    </div>
  );
}

AdminAnalytics.propTypes = {
  stats: PropTypes.object.isRequired,
  liveSystem: PropTypes.object,
  isLive: PropTypes.bool,
  statsLoading: PropTypes.bool,
};
