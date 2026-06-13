// React core & third-party libraries
import React, { useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCircle, Server, Trash2, Info, AlertTriangle, CheckCheck } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

// Constants
import { NotificationTypes } from "@shared-constants/constants";

// Services (RTK Query hooks)
import {
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
} from "@services/api/notificationApi";

// Hooks
import useTabNotification from "@hooks/useTabNotification";

// Shadcn UI
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@components/ui/dropdown-menu";
import { Button } from "@components/ui/button";

dayjs.extend(relativeTime);

function getNotificationIcon(type) {
  switch (type) {
    case NotificationTypes.STORAGE_ALERT:
      return <Server size={18} className="text-warning" />;
    case NotificationTypes.SECURITY_ALERT:
      return <AlertTriangle size={18} className="text-error" />;
    case NotificationTypes.QUOTA_APPROVED:
      return <CheckCircle size={18} className="text-success" />;
    case NotificationTypes.QUOTA_REJECTED:
      return <AlertTriangle size={18} className="text-error" />;
    case NotificationTypes.QUOTA_CHANGE:
    case NotificationTypes.QUOTA_REQUEST:
      return <Server size={18} className="text-info" />;
    case NotificationTypes.TRASH_CLEANUP:
      return <Trash2 size={18} className="text-secondary" />;
    case NotificationTypes.SYSTEM_ALERT:
    default:
      return <Info size={18} className="text-primary" />;
  }
}

export default function NotificationDropdown() {
  // Local state
  const [open, setOpen] = useState(false);

  // RTK Query hooks
  const { data: notificationsData, isLoading: notificationsLoading } = useGetNotificationsQuery();
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  // Derived / computed variables
  const notifications = notificationsData?.data || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useTabNotification(unreadCount);

  // Event handlers
  async function handleNotificationClick(item) {
    if (!item.is_read) {
      try {
        await markAsRead({ id: item._id }).unwrap();
      } catch {
        // Silently fail — the UI will refetch
      }
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    try {
      await markAllAsRead().unwrap();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {/* 
        Use asChild=false (default) so DropdownMenuTrigger renders its own <button>.
        We render an absolutely-positioned badge div separately, not wrapped inside.
      */}
      <div className="relative">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Notifications"
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all
              ${open ? "bg-primary-light text-primary" : "text-label-secondary hover:bg-surface-alt hover:text-primary"}
            `}
          >
            <Bell size={20} />
          </button>
        </DropdownMenuTrigger>
        {unreadCount > 0 && (
          <div className="absolute top-0.5 right-0.5 pointer-events-none w-[18px] h-[18px] rounded-full bg-error border-2 border-surface flex items-center justify-center shadow-sm">
            <span className="text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </div>
        )}
      </div>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 p-0 glass-card border-line shadow-premium rounded-2xl overflow-hidden z-50"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-surface-dim/60">
          <span className="font-bold text-sm text-label">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg"
              onClick={handleMarkAllRead}
            >
              <CheckCheck size={13} className="mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Body */}
        <div className="max-h-[360px] overflow-y-auto">
          {notificationsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface-dim rounded-xl animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-14 text-center text-label-tertiary flex flex-col items-center gap-2">
              <Bell size={32} className="opacity-25" />
              <p className="text-sm font-medium">No new notifications</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item._id}
                className={`px-4 py-3 hover:bg-surface-dim/60 cursor-pointer transition-colors border-b border-line/50 last:border-0 flex gap-3 items-start ${
                  !item.is_read ? "bg-primary/5" : ""
                }`}
                onClick={() => handleNotificationClick(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleNotificationClick(item);
                }}
                role="button"
                tabIndex={0}
              >
                <div
                  className={`flex-none w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${
                    !item.is_read ? "bg-surface shadow-sm border border-primary/20" : "bg-surface-alt"
                  }`}
                >
                  {getNotificationIcon(item.type)}
                </div>
                <div className="grow min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <span
                      className={`text-xs truncate ${!item.is_read ? "font-bold text-label" : "text-label-secondary"}`}
                    >
                      {item.title}
                    </span>
                    <span className="flex-none text-[10px] text-label-tertiary font-medium whitespace-nowrap">
                      {dayjs(item.createdAt).fromNow()}
                    </span>
                  </div>
                  <p className="text-[11px] text-label-secondary line-clamp-2 mt-0.5 leading-relaxed">{item.message}</p>
                </div>
                {!item.is_read && <div className="flex-none w-1.5 h-1.5 rounded-full bg-primary mt-2 self-center" />}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
