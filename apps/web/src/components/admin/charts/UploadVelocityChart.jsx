import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Components
import { Card, CardContent } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card border border-white/10 rounded-xl px-4 py-3 text-xs shadow-2xl">
      <p className="font-black text-label">{label}</p>
      <p className="text-label-secondary font-bold">{payload[0].value} uploads</p>
    </div>
  );
}

const COLORS = ["#818cf8", "#7c3aed", "#4f46e5"];

export default function UploadVelocityChart({ fileStats, loading }) {
  const data = [
    { label: "Last 24h", value: fileStats?.uploads_last_24h ?? 0 },
    { label: "Last 7d", value: fileStats?.uploads_last_7d ?? 0 },
    { label: "Last 30d", value: fileStats?.uploads_last_30d ?? 0 },
  ];

  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-6 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-label-secondary uppercase tracking-widest">Upload Velocity</h3>
        {loading ? (
          <Skeleton className="w-full h-44 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
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
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
