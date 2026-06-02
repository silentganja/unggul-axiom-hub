"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import type { NotificationEvent } from "@/lib/api";

function notificationSummary(event: NotificationEvent): string {
  switch (event.type) {
    case "governance_update":
      return `Governance ${event.status || "update"}: ${event.title || event.fileName || ""}`;
    case "share_added":
      return `${event.sharedBy || "Someone"} shared "${event.fileName || "a file"}" with you`;
    case "file_locked":
      return `File locked: ${event.fileName || "Unknown file"}`;
    case "file_unlocked":
      return `File unlocked: ${event.fileName || "Unknown file"}`;
    case "file_uploaded":
      return `File uploaded: ${event.fileName || "Unknown"}${event.sizeBytes ? ` (${(event.sizeBytes / 1024).toFixed(1)} KB)` : ""}`;
    default:
      return `Notification: ${(event as unknown as Record<string, unknown>).title || ""}`;
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const subscribe = useNotificationStore((state) => state.subscribe);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Subscribe to SSE on mount when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = subscribe();
    return () => unsub();
  }, [isAuthenticated, subscribe]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-8 w-8 rounded border border-border bg-background/50 hover:bg-background-subtle/30 flex items-center justify-center transition-colors"
        title="Notifications"
      >
        <Bell size={14} className="text-foreground-muted" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[14px] px-1 rounded-full bg-destructive text-[8px] font-bold font-mono text-destructive-foreground flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-80 rounded border border-border/80 bg-background-panel shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
              <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-foreground-subtle">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[9px] font-bold font-mono uppercase tracking-wider text-accent hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[300px] overflow-y-auto divide-y divide-border/10">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-[10px] text-foreground-subtle font-mono">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 hover:bg-background-subtle/30 transition-colors cursor-pointer",
                      !n.read && "bg-accent-subtle/5"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                      )}
                      <div className={cn("flex-1 min-w-0", n.read && "ml-[14px]")}>
                        <p className="text-[10px] text-foreground font-semibold font-sans leading-tight">
                          {notificationSummary(n.event)}
                        </p>
                        <p className="text-[8px] text-foreground-subtle font-mono mt-0.5">
                          {new Date(n.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-border/10 px-3 py-1.5 text-[8px] font-mono text-foreground-subtle text-center">
              Real-time via SSE
            </div>
          </div>
        </>
      )}
    </div>
  );
}
