import React from "react";

// Components
import { Card, CardContent } from "@components/ui/card";
import { Skeleton } from "@components/ui/skeleton";
import MiniRing from "./MiniRing";

/**
 * Stat card used in the admin dashboard stats grid.
 */
export default function StatCard({ title, value, subtext, percentage, icon, color, loading, isTotal = false }) {
  return (
    <Card className="glass-card border-white/10 hover:border-white/20 transition-all duration-300 group relative overflow-hidden h-40">
      <div
        className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 rounded-full pointer-events-none -mr-16 -mt-16 transition-opacity group-hover:opacity-20"
        style={{ backgroundColor: color }}
      />
      <CardContent className="p-0 h-full flex items-center px-6">
        {loading ? (
          <div className="w-full flex justify-between items-center">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-14 w-14 rounded-full" />
          </div>
        ) : (
          <div className="w-full flex justify-between items-center relative">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-label-tertiary group-hover:text-label transition-colors">
                  {React.cloneElement(icon, { size: 16 })}
                </div>
                <h3 className="text-xs font-bold text-label-secondary uppercase tracking-widest">{title}</h3>
              </div>
              <div className="text-3xl font-black text-label tracking-tighter truncate leading-tight">{value}</div>
              <p className="text-[10px] font-bold text-label-tertiary uppercase truncate max-w-[120px]">{subtext}</p>
            </div>
            {!isTotal ? (
              <MiniRing percentage={percentage} color={color} size={64} strokeWidth={6} />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center border border-white/10 bg-white/5 shadow-inner transition-transform group-hover:scale-105"
                style={{ color }}
              >
                {React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
