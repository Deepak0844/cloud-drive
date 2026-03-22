// React core & third-party libraries
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Components
import { Card, CardContent } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card border border-white/10 rounded-xl px-4 py-3 text-xs shadow-2xl space-y-1">
      <p className="font-black text-label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-bold" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function CustomLegend({ payload }) {
  return (
    <ul className="flex justify-center gap-6 mt-2">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-[10px] font-bold text-label-secondary uppercase tracking-wider">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function QuotaRequestsChart({ quotaRequests, loading }) {
  const data = [
    {
      label: "All Time",
      Pending: quotaRequests?.pending ?? 0,
      Approved: quotaRequests?.total_approved ?? 0,
      Rejected: quotaRequests?.total_rejected ?? 0,
    },
    {
      label: "This Month",
      Pending: quotaRequests?.pending ?? 0,
      Approved: quotaRequests?.approved_this_month ?? 0,
      Rejected: quotaRequests?.rejected_this_month ?? 0,
    },
  ];

  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-6 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-label-secondary uppercase tracking-widest">Quota Requests</h3>
        {loading ? (
          <Skeleton className="w-full h-44 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="40%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fontWeight: 700, fill: "var(--text-tertiary)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontWeight: 700, fill: "var(--text-tertiary)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend content={<CustomLegend />} />
              <Bar dataKey="Pending" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={22} />
              <Bar dataKey="Approved" fill="#10b981" radius={[4, 4, 0, 0]} barSize={22} />
              <Bar dataKey="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
