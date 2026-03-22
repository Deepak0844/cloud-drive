// React core & third-party libraries
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

// Components
import { Card, CardContent } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card border border-white/10 rounded-xl px-4 py-3 text-xs shadow-2xl">
      <p className="font-black text-label">{payload[0].name}</p>
      <p className="text-label-secondary font-bold">{payload[0].value} users</p>
    </div>
  );
}

const COLORS = ["#10b981", "#ef4444"];

export default function UserStatusDonut({ userStats, loading }) {
  const data = [
    { name: "Active", value: userStats?.active ?? 0 },
    { name: "Inactive", value: userStats?.inactive ?? 0 },
  ];

  const total = userStats?.total ?? 0;

  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-6 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-label-secondary uppercase tracking-widest">User Status</h3>
        {loading ? (
          <Skeleton className="w-full h-44 rounded-xl" />
        ) : (
          <>
            <div className="relative flex items-center justify-center h-44">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={72}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={3}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centre stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-label tracking-tighter">{total}</span>
                <span className="text-[10px] font-bold text-label-tertiary uppercase tracking-wider">Total</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex justify-center gap-6">
              {data.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-[10px] font-bold text-label-secondary uppercase tracking-wider">
                    {d.name} <span className="text-label font-black">{d.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
