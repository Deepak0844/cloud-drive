// React core & third-party libraries
import PropTypes from "prop-types";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Components
import { Card, CardContent } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";

export default function StorageOverviewCard({ storageOverview = null, fileStats = null, loading = false }) {
  const utilPercent = parseFloat(storageOverview?.utilization_percent ?? "0");

  const rows = [
    {
      label: "Platform Used",
      value: formatBytes(storageOverview?.total_used_bytes ?? 0),
      sub: `of ${formatBytes(storageOverview?.total_allocated_bytes ?? 0)} allocated`,
      percent: utilPercent,
      color: utilPercent >= 85 ? "#ef4444" : utilPercent >= 60 ? "#f59e0b" : "#7c3aed",
    },
  ];

  const kpis = [
    { label: "Near Quota (≥80%)", value: storageOverview?.users_above_80_percent ?? 0 },
    { label: "Total Size", value: formatBytes(fileStats?.total_size_bytes ?? 0) },
  ];

  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-6 flex flex-col gap-5">
        <h3 className="text-xs font-bold text-label-secondary uppercase tracking-widest">Storage Overview</h3>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            {/* Platform utilisation bar */}
            {rows.map((row) => (
              <div key={row.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-label-secondary">{row.label}</span>
                  <span className="text-xs font-black" style={{ color: row.color }}>
                    {utilPercent.toFixed(1)}%
                  </span>
                </div>
                {/* Custom progress bar — bg-white/5 track with inline coloured indicator */}
                <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(utilPercent, 100)}%`, backgroundColor: row.color }}
                  />
                </div>
                <p className="text-[10px] font-bold text-label-tertiary">{row.sub}</p>
              </div>
            ))}

            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              {kpis.map((k) => (
                <div key={k.label} className="bg-white/5 rounded-xl px-3 py-3 border border-white/5">
                  <p className="text-xl font-black text-label tracking-tighter">{k.value}</p>
                  <p className="text-[10px] font-bold text-label-tertiary uppercase tracking-wider mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

StorageOverviewCard.propTypes = {
  storageOverview: PropTypes.object,
  fileStats: PropTypes.object,
  loading: PropTypes.bool,
};
