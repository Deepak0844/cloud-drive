import { PieChart, Pie, Cell } from "recharts";

// Components
import { Card, CardContent } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";

/**
 * Circular arc gauge card — used for CPU, Memory, and Disk utilisation.
 * Receives either REST-seeded or live-socket data via props.
 */
export default function HardwareGaugeCard({ title, percent, subtext, icon, color, loading, isLive = false }) {
  const safePercent = Math.min(100, Math.max(0, parseFloat(percent) || 0));
  const data = [{ value: safePercent }, { value: 100 - safePercent }];

  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300 group relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-40 h-40 blur-3xl opacity-5 rounded-full pointer-events-none -mr-20 -mt-20 group-hover:opacity-10 transition-opacity"
        style={{ backgroundColor: color }}
      />
      <CardContent className="p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border border-white/10 bg-white/5"
              style={{ color }}
            >
              {icon}
            </div>
            <span className="text-xs font-bold text-label-secondary uppercase tracking-widest">{title}</span>
          </div>
          {isLive && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">Live</span>
            </div>
          )}
        </div>

        {/* Gauge */}
        {loading ? (
          <div className="flex items-center justify-center h-36">
            <Skeleton className="w-32 h-32 rounded-full" />
          </div>
        ) : (
          <div className="relative flex items-center justify-center h-36">
            <PieChart width={140} height={140}>
              <Pie
                data={data}
                cx={65}
                cy={75}
                innerRadius={46}
                outerRadius={60}
                startAngle={220}
                endAngle={-40}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="rgba(255,255,255,0.06)" />
              </Pie>
            </PieChart>
            {/* Centre text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pb-2">
              <span className="text-2xl font-black text-label tracking-tighter">{safePercent.toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* Subtext */}
        <p className="text-[11px] font-bold text-label-tertiary text-center uppercase tracking-wider truncate">
          {loading ? <Skeleton className="h-3 w-32 mx-auto" /> : subtext}
        </p>
      </CardContent>
    </Card>
  );
}
