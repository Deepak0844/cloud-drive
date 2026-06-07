import React from "react";
import { Cloud, Send, Image as ImageIcon, PlayCircle, Mic, FileText, Archive, File } from "lucide-react";
import { motion } from "framer-motion";

// Utils
import { formatBytes } from "@shared-utils/utils";

// Constants
import { CATEGORY_CONFIG } from "@constants/uiConstants";

// Components
import { Button } from "@components/ui/button";
import { Card } from "@components/ui/card";
import { Progress } from "@components/ui/progress";
import { Skeleton } from "@components/ui/skeleton";

const CATEGORY_ICONS = {
  image: <ImageIcon size={14} />,
  video: <PlayCircle size={14} />,
  audio: <Mic size={14} />,
  document: <FileText size={14} />,
  archive: <Archive size={14} />,
  other: <File size={14} />,
};

function StorageDashboardCard({ usage, usageLoading, sortedBreakdown, breakdownLoading, isAdmin, onRequestQuota }) {
  return (
    <div className="lg:col-span-4 flex flex-col gap-6">
      <Card className="glass-card rounded-4xl border-transparent relative overflow-hidden p-8 bg-sidebar-nav-active-bg/30 shadow-glow-sm">
        {/* Glossy background Effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[80px] opacity-30" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary/15 rounded-full blur-[80px] opacity-30" />

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center border border-primary/30 shadow-glow-sm">
              <Cloud size={20} />
            </div>
            <h3 className="font-black text-label">Storage Overview</h3>
          </div>
          <div className="px-2.5 py-1 bg-success/10 border border-success/20 rounded-lg">
            <span className="text-[10px] font-black uppercase tracking-widest text-success">Active</span>
          </div>
        </div>

        {usageLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <div className="relative z-10">
            <div className="flex items-end justify-between mb-3">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-label tabular-nums">
                  {usage?.data?.percentage.toFixed(1)}
                  <span className="text-lg font-bold opacity-40 ml-0.5">%</span>
                </span>
                <span className="text-[10px] font-bold text-label-tertiary uppercase tracking-widest">Used Space</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-primary block">
                  {formatBytes(usage?.data?.used_bytes)}
                </span>
                <span className="text-[10px] font-bold text-label-tertiary opacity-80">
                  of {formatBytes(usage?.data?.quota_bytes)}
                </span>
              </div>
            </div>

            <Progress
              value={usage?.data?.percentage}
              className="h-3.5 bg-line/20 overflow-hidden rounded-full shadow-inner"
            />

            <div className="mt-8 space-y-4">
              {breakdownLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : (
                sortedBreakdown.map((item) => {
                  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
                  const percentage = (item.total_size_bytes / usage?.data?.quota_bytes) * 100 || 0;

                  return (
                    <div key={item.category} className="group cursor-default">
                      <div className="flex items-center justify-between text-xs mb-2 px-0.5">
                        <div className="flex items-center gap-2.5">
                          <span style={{ color: config.color }} className="opacity-90">
                            {CATEGORY_ICONS[item.category] || CATEGORY_ICONS.other}
                          </span>
                          <span className="font-bold text-label-secondary tracking-tight">{config.label}</span>
                        </div>
                        <span className="font-black text-label tabular-nums">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-line/10 rounded-full overflow-hidden border border-line/5 shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1.2, ease: "circOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 px-0.5">
                        <span className="text-[9px] font-bold text-label-tertiary uppercase">{item.count} items</span>
                        <span className="text-[9px] font-black text-label-tertiary">
                          {formatBytes(item.total_size_bytes)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {!isAdmin && (
              <Button
                variant="aurora"
                size="pill"
                fullWidth
                icon={<Send size={14} />}
                onClick={onRequestQuota}
                className="mt-10 h-12 uppercase tracking-[0.15em] text-xs"
              >
                Request Quota Increase
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="glass-card rounded-4xl border-dashed border-white/10 p-6 flex flex-col gap-3 bg-white/5 shadow-inner">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-sm text-label tracking-tight">NAS Engine Status</h4>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_var(--success)] animate-pulse" />
            <span className="text-[10px] font-extrabold text-success uppercase tracking-widest">Normal</span>
          </div>
        </div>
        <p className="text-[10px] text-label-tertiary leading-[1.6] font-medium italic opacity-80">
          Your storage is physically managed by the Cloud Drive NAS core. Encryption and versioning are active on all
          blocks.
        </p>
      </Card>
    </div>
  );
}

export default StorageDashboardCard;
