"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { adminApi, AdminDashboard, formatFileSize } from "@/lib/api";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const dashboardRef = useRef<AdminDashboard | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminApi.getDashboard();
      if (!mountedRef.current) return;
      setDashboard(data);
      dashboardRef.current = data;
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Failed to load metrics";
      // If we already have cached data, keep showing it instead of flashing error
      if (dashboardRef.current) {
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboard();
    return () => {
      mountedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time update subscriptions
  useEffect(() => {
    const unsub = useNotificationStore.getState().subscribe();
    useNotificationStore.getState().setOnGovernanceUpdate(() => {
      fetchDashboard().catch(() => {});
    });
    return () => {
      unsub();
      useNotificationStore.getState().setOnGovernanceUpdate(null);
    };
  }, [fetchDashboard]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 font-mono text-xs text-foreground-subtle">
        <Loader2 size={18} className="animate-spin text-accent mr-2" />
        LOADING DASHBOARD DATA...
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle size={24} className="text-destructive/60" />
        <p className="font-mono text-xs text-destructive">Failed to load dashboard metrics</p>
        {error && (
          <code className="font-mono text-[10px] text-destructive/80 bg-destructive/5 px-3 py-1.5 rounded border border-destructive/20 max-w-lg break-all">
            {error}
          </code>
        )}
        <button
          onClick={fetchDashboard}
          className="h-8 px-4 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[10px] font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: dashboard.totalUsers, href: "/dev/admin/users" },
    { label: "Active Users", value: dashboard.activeUsers, href: "/dev/admin/users" },
    { label: "Total Files", value: dashboard.totalFiles, href: "/dev/admin/files" },
    { label: "Folders", value: dashboard.totalFolders, href: "/dev/admin/files" },
    { label: "Storage Used", value: formatFileSize(dashboard.storageUsedBytes), href: "/dev/admin/storage" },
    { label: "Pending Approvals", value: dashboard.pendingGovernance, href: "/dev/admin/governance" },
    { label: "Locked Files", value: dashboard.lockedFiles, href: "/dev/admin/files?filter=locked" },
    { label: "Shared Files", value: dashboard.sharedFiles, href: "/dev/admin/shares" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statCards.map(({ label, value, href }) => (
        <button
          key={label}
          onClick={() => router.push(href)}
          className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3 text-left hover:border-accent/50 transition-colors cursor-pointer"
        >
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">
            {label}
          </span>
          <div className="text-lg font-bold font-mono text-foreground mt-0.5">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        </button>
      ))}
    </div>
  );
}
