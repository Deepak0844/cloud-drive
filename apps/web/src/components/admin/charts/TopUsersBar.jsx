// React core & third-party libraries
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Components
import { Card, CardContent } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="glass-card border border-white/10 rounded-xl px-4 py-3 text-xs space-y-1 shadow-2xl max-w-52">
      <p className="font-black text-label truncate">{label}</p>
      <p className="text-label-secondary font-bold">{formatBytes(d.used_bytes)} used</p>
      <p className="text-label-tertiary font-medium">of {formatBytes(d.quota_bytes)}</p>
      <p className="font-black" style={{ color: d.barColor }}>
        {d.usage_percent.toFixed(1)}%
      </p>
    </div>
  );
}

export default function TopUsersBar({ topUsers = [], loading }) {
  const data = topUsers.map((u) => ({
    name: u.name.length > 14 ? `${u.name.slice(0, 13)}…` : u.name,
    value: parseFloat(u.usage_percent.toFixed(1)),
    used_bytes: u.used_bytes,
    quota_bytes: u.quota_bytes,
    usage_percent: u.usage_percent,
    barColor: u.usage_percent >= 90 ? "#ef4444" : u.usage_percent >= 70 ? "#f59e0b" : "#7c3aed",
  }));

  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-6 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-label-secondary uppercase tracking-widest">Top 10 Users by Storage</h3>
        {loading ? (
          <Skeleton className="w-full h-64 rounded-xl" />
        ) : data.length === 0 ? (
          <p className="text-center text-label-tertiary text-sm py-12">No users yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10, fontWeight: 700, fill: "var(--text-tertiary)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fontSize: 10, fontWeight: 700, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.barColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
