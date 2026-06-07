"use client";
import { useEffect, useState } from "react";
import {
  Loader2, ArrowLeft, AlertCircle, Lock, Shield,
  File, Folder, Activity, Users, Key, Check, Save,
} from "lucide-react";
import { useToastStore } from "@/components/ui/Toast";
import PasswordResetModal from "@/components/features/admin/PasswordResetModal";
import {
  adminApi, UserDetail, formatFileSize, formatTimestamp, UserGroupEntry, Permission,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRoleLabels, roleLabel } from "@/hooks/useRoleLabels";

interface Props {
  userId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export default function UserDetailPanel({ userId, onBack, onRefresh }: Props) {
  const { labels: roleLabels } = useRoleLabels();
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [groups, setGroups] = useState<UserGroupEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // ── Per-user permissions ──────────────────────────────────────────────────
  const [userPerms, setUserPerms] = useState<Permission[]>([]);
  const [allPerms, setAllPerms] = useState<Permission[]>([]);
  const [editingPerms, setEditingPerms] = useState(false);
  const [editPermIds, setEditPermIds] = useState<Set<string>>(new Set());
  const [savingPerms, setSavingPerms] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setEditingPerms(false);
    Promise.all([
      adminApi.getUserDetail(userId),
      adminApi.listUserGroups(userId).catch(() => [] as UserGroupEntry[]),
      adminApi.listUserPermissions(userId).catch(() => [] as Permission[]),
    ])
      .then(([d, g, p]) => { setDetail(d); setGroups(g); setUserPerms(p); })
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [userId]);

  const startEditingPerms = async () => {
    try {
      const perms = await adminApi.listPermissions();
      setAllPerms(perms);
      setEditPermIds(new Set(userPerms.map(p => p.id)));
      setEditingPerms(true);
    } catch { useToastStore.getState().error("Failed to load permissions"); }
  };

  const savePerms = async () => {
    setSavingPerms(true);
    try {
      await adminApi.setUserPermissions(userId, Array.from(editPermIds));
      useToastStore.getState().success("Permissions saved");
      setEditingPerms(false);
      setUserPerms(await adminApi.listUserPermissions(userId));
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSavingPerms(false); }
  };

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
    <div className="space-y-6">
      {/* Back Button */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-border bg-background-panel hover:bg-background-subtle/50 text-xs font-semibold text-foreground-subtle hover:text-foreground transition-all cursor-pointer">
        <ArrowLeft size={14} /> Back to Users
      </button>

      {/* Profile Card */}
      <div className="border border-border/20 rounded-lg bg-background-panel/40 p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center text-accent font-bold font-sans text-base">
                {detail.fullName.split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground font-serif">{detail.fullName}</h2>
                <p className="text-xs text-foreground-subtle mt-0.5">{detail.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase border",
              detail.role === "chief" ? "bg-accent/15 text-accent border-accent/30" :
              detail.role === "director" ? "bg-accent/10 text-accent border-accent/20" :
              detail.role === "officer" ? "bg-info/10 text-info border-info/20" :
              "bg-background-muted/40 text-foreground-subtle border-border/40"
            )}>{roleLabel(roleLabels, detail.role)}</span>
            {detail.active === false && (
              <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase border bg-destructive/10 text-destructive border-destructive/20">Inactive</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <button onClick={() => setIsPasswordModalOpen(true)}
            className="h-9 px-4 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer">
            <Lock size={13} /> Reset Password
          </button>
          <button onClick={() => {
            adminApi.toggleUserActive(detail.id).then(async () => { await onRefresh(); onBack(); }).catch(e => useToastStore.getState().error(e.message));
          }}
            className="h-9 px-4 rounded-md border border-warning/30 text-warning bg-warning/5 hover:bg-warning/15 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer">
            <Shield size={13} /> Toggle Active
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-border/20 rounded-lg bg-background-panel/35 p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground-subtle font-sans">Storage Used</span>
          <div className="text-xl font-bold font-mono text-foreground mt-1">{formatFileSize(detail.storageUsedBytes)}</div>
          {detail.storageQuotaBytes != null && (
            <div className="mt-2.5">
              <div className="h-2.5 w-full bg-background-subtle rounded-full overflow-hidden border border-border/10">
                <div className={cn("h-full transition-all rounded-full", isOverQuota ? "bg-destructive" : "bg-accent")}
                  style={{ width: `${Math.min(storagePct, 100)}%` }} />
              </div>
              <span className={cn("text-xs font-mono mt-1.5 block", isOverQuota ? "text-destructive" : "text-foreground-subtle")}>
                {storagePct}% of {formatFileSize(detail.storageQuotaBytes)}
              </span>
            </div>
          )}
        </div>
        <div className="border border-border/20 rounded-lg bg-background-panel/35 p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground-subtle font-sans">Files</span>
          <div className="flex items-center gap-2 mt-2">
            <File size={16} className="text-info" />
            <span className="text-xl font-bold font-mono text-foreground">{detail.fileCount}</span>
          </div>
        </div>
        <div className="border border-border/20 rounded-lg bg-background-panel/35 p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground-subtle font-sans">Folders</span>
          <div className="flex items-center gap-2 mt-2">
            <Folder size={16} className="text-accent" />
            <span className="text-xl font-bold font-mono text-foreground">{detail.folderCount}</span>
          </div>
        </div>
        <div className="border border-border/20 rounded-lg bg-background-panel/35 p-5">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground-subtle font-sans">Governance</span>
          <div className="flex items-center gap-2 mt-2">
            <Activity size={16} className="text-warning" />
            <span className="text-xl font-bold font-mono text-foreground">{detail.governanceTotal}</span>
            {detail.governancePending > 0 && (
              <span className="text-[10px] font-mono text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-md">{detail.governancePending} pending</span>
            )}
          </div>
        </div>
      </div>

      {/* Info Row */}
      <div className="border border-border/20 rounded-lg bg-background-panel/35 p-5 flex flex-wrap gap-6 text-xs text-foreground-subtle font-sans">
        <div><span>Created:</span> <span className="text-foreground font-mono ml-1">{formatTimestamp(detail.createdAt)}</span></div>
        <div><span>Last Login:</span> <span className="text-foreground font-mono ml-1">{detail.lastLoginAt ? formatTimestamp(detail.lastLoginAt) : "Never"}</span></div>
        <div><span>Quota:</span> <span className="text-foreground font-mono ml-1">{detail.storageQuotaBytes ? formatFileSize(detail.storageQuotaBytes) : "Default"}</span></div>
      </div>

      {/* Role Groups */}
      <div className="border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80 flex items-center gap-2.5">
          <Users size={14} className="text-accent" />
          <span className="text-xs font-bold tracking-wider text-foreground-subtle uppercase">
            Role Groups ({groups.length})
          </span>
        </div>
        {groups.length === 0 ? (
          <div className="p-6 text-center text-xs text-foreground-subtle">
            Not a member of any custom role groups.
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {groups.map(g => (
              <div key={g.id} className="px-5 py-3 flex items-center gap-2.5 text-xs text-foreground">
                <Shield size={13} className="text-accent shrink-0" />
                <span className="font-bold">{g.name}</span>
                {g.description && (
                  <span className="text-foreground-subtle/60 truncate">— {g.description}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Permissions */}
      <div className="border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Key size={14} className="text-accent" />
            <span className="text-xs font-bold tracking-wider text-foreground-subtle uppercase">
              Direct Permissions ({userPerms.length})
            </span>
          </div>
          {!editingPerms ? (
            <button onClick={startEditingPerms}
              className="h-8 px-3 rounded-md border border-border/30 bg-background/40 text-xs text-foreground-subtle hover:text-accent transition-colors cursor-pointer">
              Edit
            </button>
          ) : (
            <button onClick={savePerms} disabled={savingPerms}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-bold uppercase transition-colors cursor-pointer disabled:opacity-50">
              {savingPerms ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Save
            </button>
          )}
        </div>
        {editingPerms ? (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
            {allPerms.map(p => {
              const sel = editPermIds.has(p.id);
              return (
                <button key={p.id} type="button"
                  onClick={() => setEditPermIds(prev => {
                    const next = new Set(prev);
                    if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                    return next;
                  })}
                  title={`${p.key}: ${p.description}`}
                  className={cn("flex items-center gap-2 px-3 py-2.5 rounded-md border text-left transition-colors cursor-pointer",
                    sel ? "border-accent/30 bg-accent/10 text-accent" : "border-border/20 bg-background/30 text-foreground-subtle hover:border-border/50"
                  )}>
                  <div className={cn("h-4 w-4 rounded-md border flex items-center justify-center shrink-0",
                    sel ? "border-accent bg-accent" : "border-border bg-background"
                  )}>
                    {sel && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span className="text-xs font-mono font-bold truncate">{p.key.replace(/^.+:/, "")}</span>
                </button>
              );
            })}
          </div>
        ) : userPerms.length === 0 ? (
          <div className="p-6 text-center text-xs text-foreground-subtle">
            No direct permissions assigned (relies on base role + groups).
          </div>
        ) : (
          <div className="divide-y divide-border/10">
            {userPerms.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-2.5 text-xs text-foreground">
                <Key size={13} className="text-accent shrink-0" />
                <span className="font-bold font-mono">{p.key}</span>
                <span className="text-foreground-subtle/60 ml-2">{p.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80">
          <span className="text-xs font-bold tracking-wider text-foreground-subtle uppercase">Recent Activity</span>
        </div>
        {detail.recentActivity.length === 0 ? (
          <div className="p-8 text-center text-xs text-foreground-subtle">No recent activity</div>
        ) : (
          <div className="divide-y divide-border/10 max-h-[220px] overflow-y-auto">
            {detail.recentActivity.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between text-xs font-sans">
                <div className="flex items-center gap-3">
                  <span className={cn("px-2 py-1 rounded-md text-[9px] font-bold uppercase border shrink-0",
                    a.action.includes("UPLOAD") && "bg-success/10 text-success border-success/20",
                    a.action.includes("DELETE") && "bg-destructive/10 text-destructive border-destructive/20",
                    a.action.includes("SHARE") && "bg-info/10 text-info border-info/20",
                  )}>{a.action.replace(/_/g, " ")}</span>
                  <span className="text-foreground-muted truncate max-w-[200px]">{a.targetResource || "-"}</span>
                </div>
                <span className="text-foreground-subtle shrink-0 font-mono">{formatTimestamp(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        <PasswordResetModal
          key={isPasswordModalOpen ? "open" : "closed"}
          open={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          onSubmit={async (password) => {
            await adminApi.resetUserPassword(userId, password);
            useToastStore.getState().success("Password reset");
            setIsPasswordModalOpen(false);
            onRefresh();
          }}
          userName={detail?.fullName}
        />
      </div>
    </div>
  );
}
