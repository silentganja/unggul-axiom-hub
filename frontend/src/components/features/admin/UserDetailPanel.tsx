"use client";
import { useEffect, useState } from "react";
import {
  Loader2, ArrowLeft, AlertCircle, Lock, Shield,
  File, Folder, Activity,
} from "lucide-react";
import {
  adminApi, UserDetail, formatFileSize, formatTimestamp,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export default function UserDetailPanel({ userId, onBack, onRefresh }: Props) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    adminApi.getUserDetail(userId)
      .then(setDetail)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="py-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>;
  }

  if (error) {
    return <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></div>;
  }

  if (!detail) return null;

  const storagePct = detail.storageQuotaBytes && detail.storageQuotaBytes > 0
    ? Math.round((detail.storageUsedBytes / detail.storageQuotaBytes) * 100)
    : 0;

  const isOverQuota = detail.storageQuotaBytes != null && detail.storageUsedBytes > detail.storageQuotaBytes;

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-sm border border-border bg-background-panel hover:bg-background-subtle/50 text-[10px] font-mono text-foreground-subtle hover:text-foreground transition-all cursor-pointer">
        <ArrowLeft size={12} /> Back to Users
      </button>

      {/* Profile Card */}
      <div className="border border-border/40 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-accent font-bold font-mono text-sm">
                {detail.fullName.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground font-serif">{detail.fullName}</h2>
                <p className="text-[10px] font-mono text-foreground-subtle">{detail.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase border",
              detail.role === "chief" ? "bg-accent/15 text-accent border-accent/30" :
              detail.role === "director" ? "bg-accent/10 text-accent border-accent/20" :
              detail.role === "officer" ? "bg-info/10 text-info border-info/20" :
              "bg-background-muted/40 text-foreground-subtle border-border/40"
            )}>{detail.role}</span>
            {detail.active === false && (
              <span className="px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase border bg-destructive/10 text-destructive border-destructive/20">Inactive</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const pw = prompt("Enter new password (min 6 chars):");
            if (pw && pw.length >= 6) {
              adminApi.resetUserPassword(detail.id, pw).then(() => { alert("Password reset"); onRefresh(); }).catch(e => alert(e.message));
            }
          }}
            className="h-7 px-2.5 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[9px] font-bold uppercase font-mono transition-colors flex items-center gap-1.5 cursor-pointer">
            <Lock size={10} /> Reset Password
          </button>
          <button onClick={() => {
            adminApi.toggleUserActive(detail.id).then(async () => { await onRefresh(); onBack(); }).catch(e => alert(e.message));
          }}
            className="h-7 px-2.5 rounded-sm border border-warning/30 text-warning bg-warning/5 hover:bg-warning/15 text-[9px] font-bold uppercase font-mono transition-colors flex items-center gap-1.5 cursor-pointer">
            <Shield size={10} /> Toggle Active
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border/30 rounded-sm bg-background-panel/35 p-3">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">Storage Used</span>
          <div className="text-lg font-bold font-mono text-foreground mt-0.5">{formatFileSize(detail.storageUsedBytes)}</div>
          {detail.storageQuotaBytes != null && (
            <div className="mt-1.5">
              <div className="h-1.5 w-full bg-background-subtle rounded-full overflow-hidden border border-border/10">
                <div className={cn("h-full transition-all", isOverQuota ? "bg-destructive" : "bg-accent")}
                  style={{ width: `${Math.min(storagePct, 100)}%` }} />
              </div>
              <span className={cn("text-[8px] font-mono mt-0.5 block", isOverQuota ? "text-destructive" : "text-foreground-subtle")}>
                {storagePct}% of {formatFileSize(detail.storageQuotaBytes)}
              </span>
            </div>
          )}
        </div>
        <div className="border border-border/30 rounded-sm bg-background-panel/35 p-3">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">Files</span>
          <div className="flex items-center gap-2 mt-1">
            <File size={14} className="text-info" />
            <span className="text-lg font-bold font-mono text-foreground">{detail.fileCount}</span>
          </div>
        </div>
        <div className="border border-border/30 rounded-sm bg-background-panel/35 p-3">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">Folders</span>
          <div className="flex items-center gap-2 mt-1">
            <Folder size={14} className="text-accent" />
            <span className="text-lg font-bold font-mono text-foreground">{detail.folderCount}</span>
          </div>
        </div>
        <div className="border border-border/30 rounded-sm bg-background-panel/35 p-3">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">Governance</span>
          <div className="flex items-center gap-2 mt-1">
            <Activity size={14} className="text-warning" />
            <span className="text-lg font-bold font-mono text-foreground">{detail.governanceTotal}</span>
            {detail.governancePending > 0 && (
              <span className="text-[8px] font-mono text-warning bg-warning/10 border border-warning/20 px-1 py-0.5 rounded">{detail.governancePending} pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Info Row */}
      <div className="border border-border/30 rounded-sm bg-background-panel/35 p-3 flex flex-wrap gap-6 text-[10px] font-mono">
        <div><span className="text-foreground-subtle">Created:</span> <span className="text-foreground">{formatTimestamp(detail.createdAt)}</span></div>
        <div><span className="text-foreground-subtle">Last Login:</span> <span className="text-foreground">{detail.lastLoginAt ? formatTimestamp(detail.lastLoginAt) : "Never"}</span></div>
        <div><span className="text-foreground-subtle">Quota:</span> <span className="text-foreground">{detail.storageQuotaBytes ? formatFileSize(detail.storageQuotaBytes) : "Default"}</span></div>
      </div>

      {/* Recent Activity */}
      <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/30 bg-background-panel/80">
          <span className="font-mono text-[10px] font-bold tracking-wider text-foreground-subtle uppercase">Recent Activity</span>
        </div>
        {detail.recentActivity.length === 0 ? (
          <div className="p-6 text-center text-[10px] font-mono text-foreground-subtle">No recent activity</div>
        ) : (
          <div className="divide-y divide-border/10 max-h-[200px] overflow-y-auto">
            {detail.recentActivity.map(a => (
              <div key={a.id} className="px-4 py-2 flex items-center justify-between text-[10px] font-mono">
                <div className="flex items-center gap-2">
                  <span className={cn("px-1.5 py-0.5 rounded-sm text-[7px] font-bold uppercase border",
                    a.action.includes("UPLOAD") && "bg-success/10 text-success border-success/20",
                    a.action.includes("DELETE") && "bg-destructive/10 text-destructive border-destructive/20",
                    a.action.includes("SHARE") && "bg-info/10 text-info border-info/20",
                  )}>{a.action.replace(/_/g, " ")}</span>
                  <span className="text-foreground-muted truncate max-w-[200px]">{a.targetResource || "—"}</span>
                </div>
                <span className="text-foreground-subtle shrink-0">{formatTimestamp(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
