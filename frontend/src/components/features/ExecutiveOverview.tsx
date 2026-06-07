"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  ArrowRight,
  Lock,
  Shield,
  User,
  FileText,
  File,
  HardDrive,
  Folder,
  AlertTriangle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useFileStore, FileNode } from "@/store/useFileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import { activityApi, authApi, governanceApi, ActivityEntry, formatTimestamp, publicApi, PublicClassificationEntry } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ExecutiveOverview() {
  const tasks = useOperationsStore((state) => state.tasks);
  const fetchTasks = useOperationsStore((state) => state.fetchTasks);
  const files = useFileStore((state) => state.files);
  const sharedFiles = useFileStore((state) => state.sharedFiles);
  const setActiveFile = useFileStore((state) => state.setActiveFile);
  const mapsToFolder = useFileStore((state) => state.mapsToFolder);
  const setActiveView = useFileStore((state) => state.setActiveView);
  const setAccessSheetOpen = useFileStore((state) => state.setAccessSheetOpen);

  const user = useAuthStore((state) => state.user);

  // ── Effective permissions for governance approval gating ─────────────────
  const [effectivePerms, setEffectivePerms] = useState<string[]>([]);

  useEffect(() => {
    authApi
      .mePermissions()
      .then((ep) => setEffectivePerms(ep.permissions))
      .catch(() => setEffectivePerms([]));
  }, []);

  const canApproveGovernance = (task: { requestedByEmail: string }): boolean => {
    if (!user) return false;
    if (user.email === task.requestedByEmail) return false;
    if (["chief", "director", "officer"].includes(user.role)) return true;
    return effectivePerms.includes("governance:approve");
  };

  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // ── Confirm/reason modal state ──────────────────────────────────────────────
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    taskId: string;
    action: "APPROVE" | "REJECT";
  } | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    activityApi.getFeed().then((entries) => {
      if (!cancelled) setActivityEntries(entries);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── Zustand Store Hooks for Quota ──────────────────────────────────────────
  const quotaUsed = useFileStore((state) => state.quotaUsed);
  const quotaTotal = useFileStore((state) => state.quotaTotal);
  const fetchQuota = useFileStore((state) => state.fetchQuota);

  useEffect(() => {
    fetchQuota().catch(() => {});
  }, [fetchQuota]);

  // ── Dynamic classification tiers ──────────────────────────────────────────
  const [classificationTiers, setClassificationTiers] = useState<
    PublicClassificationEntry[]
  >([]);

  useEffect(() => {
    publicApi
      .listClassifications()
      .then(setClassificationTiers)
      .catch(() => {});
  }, []);

  // ── Real computed metrics ──────────────────────────────────────────────────
  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const pendingCount = pendingTasks.length;
  const totalFiles = files.filter((f) => f.type === "file").length;
  const totalFolders = files.filter((f) => f.type === "folder").length;
  const totalStorageBytes = quotaUsed || files.reduce((sum, f) => sum + f.sizeBytes, 0);

  // ── Trend indicators ───────────────────────────────────────────────────────
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const filesThisWeek = files.filter((f) => {
    const d = new Date(f.modifiedAt).getTime();
    return d >= oneWeekAgo;
  }).length;

  const dailyLabels: string[] = [];
  const dailyCounts: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
    dailyLabels.push(dayStart.toLocaleDateString("en", { weekday: "short" }));
    const count = files.filter((f) => {
      const d = new Date(f.modifiedAt);
      return d.toDateString() === dayStart.toDateString();
    }).length;
    dailyCounts.push(count);
  }
  const maxDaily = Math.max(...dailyCounts, 1);



  // ── Classification ratio calculation ───────────────────────────────────────
  const defaultTiers = ["TERBUKA", "TERHAD", "SULIT", "RAHSIA"];
  const classificationCounts: Record<string, number> = {};

  if (classificationTiers.length > 0) {
    classificationTiers.forEach((tier) => {
      classificationCounts[tier.key.toUpperCase()] = 0;
    });
  } else {
    defaultTiers.forEach((tier) => {
      classificationCounts[tier] = 0;
    });
  }

  let totalClassifiedFiles = 0;
  files.forEach((f) => {
    if (f.type === "file") {
      const c = f.classification.toUpperCase();
      if (c in classificationCounts) {
        classificationCounts[c] += 1;
      } else {
        classificationCounts[c] = 1;
      }
      totalClassifiedFiles++;
    }
  });

  const getLevelBgColor = (tierKey: string): string => {
    const key = tierKey.toUpperCase();
    if (classificationTiers.length > 0) {
      const tierEntry = classificationTiers.find((t) => t.key.toUpperCase() === key);
      const level = tierEntry ? tierEntry.level : 0;
      if (level >= 3) return "bg-destructive";
      if (level >= 2) return "bg-warning";
      if (level >= 1) return "bg-info";
      return "bg-background-muted";
    }
    if (key === "RAHSIA") return "bg-destructive";
    if (key === "SULIT") return "bg-warning";
    if (key === "TERHAD") return "bg-info";
    return "bg-background-muted";
  };

  const recentFiles = [...files]
    .filter((f) => f.type === "file")
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, 5);

  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, i);
    return `${i === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[i]}`;
  };

  const getFileIcon = (file: FileNode) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || ext === "docx" || ext === "txt") {
      return <FileText className="text-info shrink-0" size={14} />;
    }
    return <File className="text-foreground-subtle shrink-0" size={14} />;
  };

  const handleOpenFile = (file: FileNode) => {
    setActiveFile(file);
    mapsToFolder(file.parentId);
    setActiveView("files");
    setAccessSheetOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    if (!confirmReason.trim() || confirmReason.trim().length < 10) {
      setConfirmError("Reason is required (minimum 10 characters).");
      return;
    }
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const id = confirmModal.taskId;
      const reason = confirmReason.trim();
      if (confirmModal.action === "APPROVE") {
        await governanceApi.approve(id, reason);
      } else {
        await governanceApi.reject(id, reason);
      }
      setConfirmModal(null);
      setConfirmReason("");
      // Refresh tasks after mutation
      fetchTasks({ page: 1, perPage: 20, status: "PENDING" });
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Circle progress parameters for storage gauge ───────────────────────────
  const limit = quotaTotal || 5368709120; // 5 GB
  const percentageUsed = Math.min(100, (totalStorageBytes / limit) * 100);
  const strokeRadius = 38;
  const strokeCircumference = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = strokeCircumference - (percentageUsed / 100) * strokeCircumference;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <div className="glass-premium rounded p-5 flex flex-col justify-between h-[128px] select-none hover:border-accent/40 transition-all duration-300 group hover:-translate-y-0.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors pointer-events-none" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-1.5">
            <Folder size={12} className="text-accent" />
            Total Files
          </span>
          <div className="text-3xl font-bold font-sans tracking-tight text-foreground mt-2">
            {totalFiles.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-[10px] font-sans text-foreground-muted mt-auto pt-3 border-t border-border/10">
            <span>Folders: {totalFolders}</span>
            <span className="text-accent/80 font-mono text-[9px]">ACTIVE</span>
          </div>
        </div>

        {/* Pending Signatures */}
        <div className="glass-premium rounded p-5 flex flex-col justify-between h-[128px] select-none hover:border-accent/40 transition-all duration-300 group hover:-translate-y-0.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-warning/5 rounded-full blur-2xl group-hover:bg-warning/10 transition-colors pointer-events-none" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-1.5">
            <Shield size={12} className="text-warning" />
            Pending Signatures
          </span>
          <div className="text-3xl font-bold font-sans tracking-tight text-foreground mt-2 flex items-baseline justify-between gap-2">
            <span>{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="text-[9px] font-mono font-medium text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20 leading-none">
                ATTN
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold font-sans mt-auto pt-3 border-t border-border/10">
            {pendingCount > 0 ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
                </span>
                <span className="text-warning/80 uppercase tracking-wide font-mono text-[9px]">Awaiting Sign-off</span>
              </>
            ) : (
              <span className="text-success flex items-center gap-1.5 uppercase tracking-wide font-mono text-[9px]">
                <CheckCircle size={10} /> Protocols Clean
              </span>
            )}
          </div>
        </div>

        {/* Storage Used */}
        <div className="glass-premium rounded p-5 flex flex-col justify-between h-[128px] select-none hover:border-accent/40 transition-all duration-300 group hover:-translate-y-0.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors pointer-events-none" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-1.5">
            <HardDrive size={12} className="text-accent" />
            Storage Used
          </span>
          <div className="text-3xl font-bold font-sans tracking-tight text-foreground mt-2">
            {formatStorage(totalStorageBytes)}
          </div>
          <div className="flex items-center justify-between text-[10px] font-sans text-foreground-subtle mt-auto pt-3 border-t border-border/10">
            <span className="flex items-center gap-1.5">
              Quota: {formatStorage(limit)}
            </span>
            <span className="font-mono text-[9px] text-accent/80">{percentageUsed.toFixed(1)}%</span>
          </div>
        </div>

        {/* Shared with Me */}
        <div className="glass-premium rounded p-5 flex flex-col justify-between h-[128px] select-none hover:border-accent/40 transition-all duration-300 group hover:-translate-y-0.5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-info/5 rounded-full blur-2xl group-hover:bg-info/10 transition-colors pointer-events-none" />
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground-subtle flex items-center gap-1.5">
            <User size={12} className="text-info" />
            Shared with Me
          </span>
          <div className="text-3xl font-bold font-sans tracking-tight text-foreground mt-2">
            {sharedFiles.length}
          </div>
          <div className="flex items-center text-[10px] font-sans text-foreground-muted mt-auto pt-3 border-t border-border/10">
            <span>Collaborator objects</span>
          </div>
        </div>
      </div>

      {/* ── Analytics & Trends ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Weekly Activity mini chart */}
        <div className="lg:col-span-4 glass-premium rounded p-5 select-none shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">
                Added This Week
              </span>
              <div className="text-2xl font-bold font-sans tracking-tight text-foreground mt-1">
                {filesThisWeek} files
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2 h-20 mt-4">
            {dailyCounts.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-mono text-foreground-subtle/70 leading-none">{count || "0"}</span>
                <div
                  className="w-full rounded-t bg-accent/30 hover:bg-accent/60 transition-all duration-200 cursor-pointer"
                  style={{ height: `${Math.max(4, (count / maxDaily) * 48)}px` }}
                />
                <span className="text-[9px] font-sans text-foreground-subtle/50 leading-none">{dailyLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Circular SVG Storage Gauge */}
        <div className="lg:col-span-4 glass-premium rounded p-5 select-none shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">
            Capacity Utilization
          </span>
          <div className="flex items-center justify-center py-2">
            <div className="relative h-28 w-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={strokeRadius}
                  className="stroke-background-subtle/30"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={strokeRadius}
                  className="stroke-accent transition-all duration-500 ease-out"
                  strokeWidth="6"
                  strokeDasharray={strokeCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center font-mono select-none">
                <span className="text-sm font-bold text-foreground">{percentageUsed.toFixed(1)}%</span>
                <span className="text-[7px] text-foreground-subtle uppercase tracking-widest mt-0.5">USED</span>
              </div>
            </div>
          </div>
          <div className="border-t border-border/10 pt-2 text-[10px] font-mono text-foreground-subtle flex justify-between">
            <span>USED: {formatStorage(totalStorageBytes)}</span>
            <span>LIMIT: {formatStorage(limit)}</span>
          </div>
        </div>

        {/* Classification Distribution Stacked Bar */}
        <div className="lg:col-span-4 glass-premium rounded p-5 select-none shadow-sm flex flex-col justify-between">
          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">
            Classification Distribution
          </span>
          <div className="space-y-4 py-2">
            {totalClassifiedFiles === 0 ? (
              <div className="text-center py-6 text-xs text-foreground-subtle font-mono">
                NO ENCRYPTED FILES IN DIRECTORY
              </div>
            ) : (
              <>
                {/* Horizontal Stacked Bar */}
                <div className="h-4 w-full bg-background-subtle/40 rounded-sm overflow-hidden border border-border/10 flex">
                  {Object.entries(classificationCounts).map(([tier, count]) => {
                    if (count === 0) return null;
                    const pct = (count / totalClassifiedFiles) * 100;
                    return (
                      <div
                        key={tier}
                        className={cn(
                          "h-full transition-all duration-300 relative group/segment cursor-help",
                          getLevelBgColor(tier)
                        )}
                        style={{ width: `${pct}%` }}
                        title={`${tier}: ${count} file(s) (${pct.toFixed(0)}%)`}
                      />
                    );
                  })}
                </div>
                {/* Legend list */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {Object.entries(classificationCounts).map(([tier, count]) => {
                    return (
                      <div key={tier} className="flex items-center gap-1.5">
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          getLevelBgColor(tier)
                        )} />
                        <span className="text-foreground-subtle truncate">{tier}</span>
                        <span className="text-foreground ml-auto font-bold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          <div className="border-t border-border/10 pt-2 text-[10px] font-mono text-foreground-subtle text-right">
            Total Classified: {totalClassifiedFiles} files
          </div>
        </div>
      </div>

      {/* ── Split Layout: Governance Queue vs Recent Files ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Governance / Approval Queue */}
        <div className="lg:col-span-7 border border-border/20 rounded bg-background-panel/20 backdrop-blur-sm p-6 flex flex-col justify-between min-h-[380px] shadow-sm">
          <div className="space-y-4">
            <div className="border-b border-border/20 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold tracking-tight text-foreground font-sans">
                  Corporate Governance Queue
                </h2>
                <p className="text-xs text-foreground-subtle font-sans mt-0.5">
                  Restricted sign-off requests requiring C-Suite authorization.
                </p>
              </div>
              <span className="h-6 px-3 rounded-full bg-accent/10 border border-accent/20 text-xs font-sans font-bold text-accent flex items-center justify-center">
                {pendingCount} Pending
              </span>
            </div>

            {pendingCount === 0 ? (
              <div className="py-16 text-center space-y-4">
                <div className="mx-auto h-10 w-10 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <CheckCircle className="text-success" size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground font-sans">All Protocols Satisfied</h3>
                  <p className="text-xs text-foreground-subtle max-w-xs mx-auto leading-relaxed font-sans">
                    There are currently no active approval tasks or locking blocks on files within your domain.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {pendingTasks.map((task) => {
                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-sm border border-border/20 bg-background-panel/50 backdrop-blur-sm transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider font-sans uppercase border",
                            task.type === "FILE_LOCK" && "bg-destructive/15 text-destructive border-destructive/25",
                            task.type === "FILE_UNLOCK" && "bg-success/15 text-success border-success/25",
                            task.type === "CLASSIFICATION" && "bg-warning/15 text-warning border-warning/25",
                            task.type === "FILE_MOVE" && "bg-info/15 text-info border-info/25",
                            task.type === "FILE_DELETE" && "bg-destructive/15 text-destructive border-destructive/25"
                          )}>
                            {task.type.replace("_", " ")}
                          </span>
                          <span className="font-mono text-xs text-foreground-subtle">{task.timestamp}</span>
                        </div>
                        <h4 className="text-sm font-bold text-foreground truncate max-w-sm font-sans">{task.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-foreground-muted font-sans leading-none">
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-foreground-subtle" />
                            {task.requestedBy}
                          </span>
                          <span className="text-foreground-subtle/30">|</span>
                          <span className="font-bold text-foreground">{task.amountValue}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-sans">
                        {canApproveGovernance(task) ? (
                          <>
                            <button
                              onClick={() => {
                                setConfirmModal({ show: true, taskId: task.id, action: "REJECT" });
                                setConfirmReason("");
                                setConfirmError(null);
                              }}
                              className="h-9 px-4 rounded-sm border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors text-xs font-semibold uppercase cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => {
                                setConfirmModal({ show: true, taskId: task.id, action: "APPROVE" });
                                setConfirmReason("");
                                setConfirmError(null);
                              }}
                              className="h-9 px-4 rounded-sm border border-success/30 text-success bg-success/5 hover:bg-success/10 transition-colors text-xs font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
                            >
                              Approve
                            </button>
                          </>
                        ) : (
                          <span className={cn(
                            "px-3 py-1 rounded text-xs font-semibold uppercase border",
                            task.status === "PENDING" && "bg-warning/10 text-warning border-warning/20",
                            task.status === "APPROVED" && "bg-success/10 text-success border-success/20",
                            task.status === "REJECTED" && "bg-destructive/10 text-destructive border-destructive/20",
                          )}>
                            {task.status === "PENDING" ? "Pending" : task.status === "APPROVED" ? "Approved" : "Rejected"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border/10 pt-4 flex justify-between items-center text-xs font-sans font-medium text-foreground-subtle select-none mt-4">
            <span>GOVERNANCE REGISTER</span>
            <span className="flex items-center gap-1 text-accent font-semibold">
              <Shield size={12} className="text-accent" /> ACTIVE
            </span>
          </div>
        </div>

        {/* Recent Secure Files */}
        <div className="lg:col-span-5 border border-border/20 rounded bg-background-panel/20 backdrop-blur-sm p-6 flex flex-col justify-between min-h-[380px] shadow-sm">
          <div className="space-y-4">
            <div className="border-b border-border/20 pb-4">
              <h2 className="text-base font-bold tracking-tight text-foreground font-sans">
                Recent Files
              </h2>
              <p className="text-xs text-foreground-subtle font-sans mt-0.5">
                Recently modified corporate documents in your repository.
              </p>
            </div>

            <div className="divide-y divide-border/10 max-h-[300px] overflow-y-auto pr-1">
              {recentFiles.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <File className="mx-auto text-foreground-subtle/30" size={24} />
                  <p className="text-xs text-foreground-subtle font-sans">No files yet</p>
                </div>
              ) : (
                recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="py-3 flex items-center justify-between gap-3 group/row transition-all hover:bg-background-subtle/10 px-2 rounded-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-sm border border-border/20 bg-background/50 flex items-center justify-center shrink-0">
                        {getFileIcon(file)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-[200px] font-sans">
                          {file.name}
                        </h4>
                        <p className="text-xs text-foreground-subtle font-sans mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono text-[10px]">{file.size}</span>
                          <span>&bull;</span>
                          <span className="font-mono text-[10px]">{file.modifiedAt}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {file.lockedBy && (
                        <span title={`LOCKED: ${file.lockReason || ''} (${file.lockedBy})`}>
                          <Lock size={12} className="text-accent fill-accent/15 cursor-help" />
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenFile(file)}
                        className="h-8 w-16 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-foreground transition-all text-xs font-semibold font-sans uppercase flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-border/10 pt-4 flex justify-between items-center text-xs font-sans font-medium text-foreground-subtle select-none mt-4">
            <span>REPOSITORY</span>
            <span className="text-success font-bold">
              {totalFiles + totalFolders} items
            </span>
          </div>
        </div>
      </div>

      {/* ── Activity Feed ── */}
      <div className="border border-border/20 rounded bg-background-panel/20 backdrop-blur-sm p-6 shadow-sm">
        <div className="border-b border-border/20 pb-4 mb-4">
          <h2 className="text-base font-bold tracking-tight text-foreground font-sans">Recent Activity</h2>
          <p className="text-xs text-foreground-subtle font-sans mt-0.5">Latest actions, shares, and governance events.</p>
        </div>
        <div className="divide-y divide-border/10 max-h-[220px] overflow-y-auto">
          {activityEntries.length === 0 ? (
            <p className="py-6 text-center text-xs text-foreground-subtle font-sans">No recent activity</p>
          ) : (
            activityEntries.slice(0, 15).map((entry) => (
              <div key={entry.id} className="py-2.5 flex items-center justify-between gap-3 text-xs font-sans">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider uppercase border shrink-0 font-sans",
                    entry.action.includes("SHARED") && "bg-info/10 text-info border-info/20",
                    entry.action.includes("UPLOAD") && "bg-success/10 text-success border-success/20",
                    entry.action.includes("GOV_APPROVED") && "bg-success/10 text-success border-success/20",
                    entry.action.includes("GOV_REJECTED") && "bg-destructive/10 text-destructive border-destructive/20",
                    entry.action.includes("LOCK") && "bg-warning/10 text-warning border-warning/20",
                    entry.action.includes("DELETE") && "bg-destructive/10 text-destructive border-destructive/20",
                    entry.action.includes("TRASH") && "bg-destructive/10 text-destructive border-destructive/20",
                    (!entry.action.includes("SHARED") && !entry.action.includes("UPLOAD") && !entry.action.includes("GOV") && !entry.action.includes("LOCK") && !entry.action.includes("DELETE") && !entry.action.includes("TRASH")) && "bg-background-muted/40 text-foreground-subtle border-border/40"
                  )}>{entry.action.replace(/_/g, " ")}</span>
                  <span className="truncate text-foreground-muted font-sans">{entry.targetResource || "-"}</span>
                  {entry.actor && <span className="text-foreground-subtle/60 hidden sm:inline font-sans">by {entry.actor}</span>}
                </div>
                <span className="text-foreground-subtle/60 shrink-0 font-mono text-[10px]">{formatTimestamp(entry.occurredAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Confirm / Reason Modal ── */}
      {confirmModal?.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded border border-border/40 bg-background-panel shadow-2xl shadow-black/20 p-6 space-y-6">
            <div className="flex items-start gap-3.5">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                confirmModal.action === "APPROVE"
                  ? "bg-success/10 border border-success/20"
                  : "bg-destructive/10 border border-destructive/20"
              )}>
                <AlertTriangle size={18} className={cn(
                  confirmModal.action === "APPROVE" ? "text-success" : "text-destructive"
                )} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground font-sans">
                  {confirmModal.action === "APPROVE" ? "Approve" : "Decline"} Request
                </h3>
                <p className="text-xs text-foreground-subtle font-sans">
                  This action requires a written justification.
                </p>
              </div>
            </div>

            <div className="rounded-sm border border-warning/20 bg-warning/5 px-4 py-3 text-xs text-foreground-subtle flex items-start gap-2.5 font-sans">
              <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
              <span>This action cannot be undone - though you may use the Undo option on completed requests.</span>
            </div>

            {confirmError && (
              <div className="flex items-start gap-2.5 rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive font-sans">
                <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{confirmError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold font-sans uppercase tracking-wider text-foreground-subtle mb-1.5">
                Reason <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Provide a detailed reason (minimum 10 characters)..."
                value={confirmReason}
                onChange={(e) => setConfirmReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-sm border border-border bg-background text-sm text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none transition-all duration-200"
                autoFocus
              />
              <p className="text-[10px] font-mono text-foreground-subtle/60 mt-1.5">
                {confirmReason.length}/10 characters minimum
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setConfirmModal(null); setConfirmReason(""); setConfirmError(null); }}
                className="h-10 px-4 rounded-sm text-sm font-semibold font-sans text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={confirmLoading || confirmReason.trim().length < 10}
                className={cn(
                  "h-10 px-5 rounded-sm font-sans text-sm font-semibold tracking-wide transition-colors cursor-pointer disabled:opacity-50",
                  confirmModal.action === "APPROVE"
                    ? "btn-shimmer text-accent-foreground"
                    : "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive transition-colors"
                )}
              >
                {confirmLoading ? <Loader2 size={14} className="animate-spin" /> : confirmModal.action === "APPROVE" ? "Confirm Approve" : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
