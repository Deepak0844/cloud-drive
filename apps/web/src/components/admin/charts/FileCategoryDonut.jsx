// React core & third-party libraries
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Constants
import { CATEGORY_CONFIG } from "@constants/uiConstants";

// Components
import { Card, CardContent } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="glass-card border border-white/10 rounded-xl px-4 py-3 text-xs space-y-1 shadow-2xl">
      <p className="font-black text-label capitalize">{name}</p>
      <p className="text-label-secondary font-bold">{value} files</p>
      <p className="text-label-tertiary font-medium">{formatBytes(p.total_size)}</p>
    </div>
  );
}

function CustomLegend({ payload }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
      {payload.map((entry) => (
        <li key={entry.value} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-[10px] font-bold text-label-secondary uppercase tracking-wider">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function FileCategoryDonut({ distribution = [], loading }) {
  const data = distribution.map((d) => ({
    name: CATEGORY_CONFIG[d._id]?.label ?? d._id,
    value: d.count,
    total_size: d.total_size,
    color: CATEGORY_CONFIG[d._id]?.color ?? "var(--text-tertiary)",
  }));

  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-6 flex flex-col gap-4">
        <h3 className="text-xs font-bold text-label-secondary uppercase tracking-widest">File Categories</h3>
        {loading ? (
          <Skeleton className="w-full h-52 rounded-xl" />
        ) : data.length === 0 ? (
          <p className="text-center text-label-tertiary text-sm py-12">No files yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={58}
                outerRadius={80}
                dataKey="value"
                stroke="none"
                paddingAngle={3}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
