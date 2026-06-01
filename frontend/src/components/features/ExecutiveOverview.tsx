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
} from "lucide-react";
import { useFileStore, FileNode } from "@/store/useFileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import { activityApi, ActivityEntry, formatTimestamp } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ExecutiveOverview() {
  const tasks = useOperationsStore((state) => state.tasks);
  const approveTask = useOperationsStore((state) => state.approveTask);
  const rejectTask = useOperationsStore((state) => state.rejectTask);

  const files = useFileStore((state) => state.files);
  const sharedFiles = useFileStore((state) => state.sharedFiles);
  const setActiveFile = useFileStore((state) => state.setActiveFile);
  const mapsToFolder = useFileStore((state) => state.mapsToFolder);
  const setActiveView = useFileStore((state) => state.setActiveView);
  const setAccessSheetOpen = useFileStore((state) => state.setAccessSheetOpen);

  const user = useAuthStore((state) => state.user);

  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  useEffect(() => {
    activityApi.getFeed().then(setActivityEntries).catch(() => {});
  }, []);

  // ── Real computed metrics ──────────────────────────────────────────────────
  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const pendingCount = pendingTasks.length;
  const totalFiles = files.filter((f) => f.type === "file").length;
  const totalFolders = files.filter((f) => f.type === "folder").length;
  const totalStorageBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

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

  const handleTaskAction = (taskId: string, action: "APPROVE" | "REJECT") => {
    setAnimatingId(taskId);
    setTimeout(() => {
      if (action === "APPROVE") approveTask(taskId);
      else rejectTask(taskId);
      setAnimatingId(null);
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Session Status Bar ── */}
      <div className="w-full bg-background-panel/40 border border-border/30 px-4 py-1.5 rounded-sm flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-foreground-subtle select-none">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span>SESSION ACTIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{user?.fullName || user?.email || "—"}</span>
          <span className="text-foreground-subtle/30">|</span>
          <span>ROLE: {user?.role || "—"}</span>
          <span className="text-foreground-subtle/30">|</span>
          <span className="flex items-center gap-1.5">
            <Lock size={9} className="text-accent" /> SECURE
          </span>
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-4 flex flex-col justify-between h-[105px] select-none hover:border-accent/40 transition-colors">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">
            Total Files
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
            {totalFiles.toLocaleString()}
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono text-foreground-muted mt-auto pt-2 border-t border-border/10">
            <Folder size={10} className="text-accent" />
            <span>{totalFolders} folder{totalFolders !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* Pending Signatures */}
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-4 flex flex-col justify-between h-[105px] select-none hover:border-accent/40 transition-colors">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">
            Pending Signatures
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1 flex items-baseline gap-2">
            <span>{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="text-[10px] font-sans font-normal text-warning bg-warning/15 px-1.5 py-0.5 rounded border border-warning/20 leading-none">
                Action Required
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[8px] font-bold font-mono mt-auto pt-2 border-t border-border/10">
            {pendingCount > 0 ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
                </span>
                <span className="text-warning/80 uppercase">Awaiting Authorization</span>
              </>
            ) : (
              <span className="text-success flex items-center gap-1 uppercase">
                <CheckCircle size={10} /> All Satisfied
              </span>
            )}
          </div>
        </div>

        {/* Storage Used */}
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-4 flex flex-col justify-between h-[105px] select-none hover:border-accent/40 transition-colors">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">
            Storage Used
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
            {formatStorage(totalStorageBytes)}
          </div>
          <div className="flex items-center justify-between text-[8px] font-mono text-foreground-subtle mt-auto pt-2 border-t border-border/10">
            <span className="flex items-center gap-1">
              <HardDrive size={10} /> {totalFiles + totalFolders} object{totalFiles + totalFolders !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Shared with Me */}
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-4 flex flex-col justify-between h-[105px] select-none hover:border-accent/40 transition-colors">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">
            Shared with Me
          </span>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
            {sharedFiles.length}
          </div>
          <div className="flex items-center text-[9px] font-mono text-foreground-muted mt-auto pt-2 border-t border-border/10">
            <span>Files from colleagues</span>
          </div>
        </div>
      </div>

      {/* ── Split Layout: Governance Queue vs Recent Files ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Governance / Approval Queue */}
        <div className="lg:col-span-7 border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5 flex flex-col justify-between min-h-[380px]">
          <div className="space-y-4">
            <div className="border-b border-border/20 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">
                  Corporate Governance Queue
                </h2>
                <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
                  Restricted sign-off requests requiring C-Suite authorization.
                </p>
              </div>
              <span className="h-5 px-2 rounded-full bg-accent-subtle border border-accent/20 text-[9px] font-mono font-bold text-accent flex items-center justify-center">
                {pendingCount} Pending
              </span>
            </div>

            {pendingCount === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="mx-auto h-9 w-9 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <CheckCircle className="text-success" size={18} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-foreground">All Protocols Satisfied</h3>
                  <p className="text-[10px] text-foreground-subtle max-w-xs mx-auto leading-normal">
                    There are currently no active approval tasks or locking blocks on files within your domain.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {pendingTasks.map((task) => {
                  const isAnimating = animatingId === task.id;
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-3 rounded-sm border border-border/30 bg-background-panel/40 backdrop-blur-sm transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                        isAnimating && "opacity-0 scale-95 pointer-events-none translate-x-4"
                      )}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider font-mono uppercase border",
                            task.type === "FINANCE" && "bg-warning/15 text-warning border-warning/25",
                            task.type === "BLUEPRINT" && "bg-info/15 text-info border-info/25",
                            task.type === "HR_OPS" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                          )}>
                            {task.type}
                          </span>
                          <span className="font-mono text-[9px] text-foreground-subtle">{task.timestamp}</span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground truncate max-w-sm">{task.title}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-foreground-muted font-mono leading-none">
                          <span className="flex items-center gap-1">
                            <User size={10} className="text-foreground-subtle" />
                            {task.requestedBy}
                          </span>
                          <span className="text-foreground-subtle/30">|</span>
                          <span className="font-bold text-foreground">{task.amountValue}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-mono">
                        <button
                          onClick={() => handleTaskAction(task.id, "REJECT")}
                          disabled={isAnimating}
                          className="h-7 px-3 rounded-sm border border-destructive/25 text-destructive bg-destructive/5 hover:bg-destructive/15 transition-all text-[10px] font-bold tracking-wider uppercase cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleTaskAction(task.id, "APPROVE")}
                          disabled={isAnimating}
                          className="h-7 px-3 rounded-sm border border-success/30 text-success bg-success/5 hover:bg-success/20 transition-all text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border/10 pt-3 flex justify-between items-center text-[9px] font-mono text-foreground-subtle select-none mt-4">
            <span>GOVERNANCE REGISTER</span>
            <span className="flex items-center gap-0.5">
              <Shield size={10} className="text-accent" /> ACTIVE
            </span>
          </div>
        </div>

        {/* Recent Secure Files */}
        <div className="lg:col-span-5 border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5 flex flex-col justify-between min-h-[380px]">
          <div className="space-y-4">
            <div className="border-b border-border/20 pb-3">
              <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">
                Recent Files
              </h2>
              <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
                Recently modified corporate documents in your repository.
              </p>
            </div>

            <div className="divide-y divide-border/10 max-h-[300px] overflow-y-auto pr-1">
              {recentFiles.length === 0 ? (
                <div className="py-12 text-center">
                  <File className="mx-auto text-foreground-subtle/30 mb-2" size={20} />
                  <p className="text-[10px] text-foreground-subtle font-mono">No files yet</p>
                </div>
              ) : (
                recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="py-2.5 flex items-center justify-between gap-3 group/row transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded border border-border/20 bg-background/30 flex items-center justify-center shrink-0">
                        {getFileIcon(file)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-foreground truncate max-w-[160px] sm:max-w-[200px]">
                          {file.name}
                        </h4>
                        <p className="text-[9px] text-foreground-subtle font-mono mt-0.5 flex items-center gap-1.5">
                          <span>{file.size}</span>
                          <span>&bull;</span>
                          <span>{file.modifiedAt}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {file.lockedBy && (
                        <span title={`LOCKED: ${file.lockReason || ''} (${file.lockedBy})`}>
                          <Lock size={10} className="text-accent fill-accent/15 cursor-help" />
                        </span>
                      )}
                      <button
                        onClick={() => handleOpenFile(file)}
                        className="h-6 w-14 rounded-sm border border-border/60 hover:border-accent hover:bg-accent-subtle/20 text-foreground-muted hover:text-accent transition-all text-[9px] font-bold tracking-wider font-mono uppercase flex items-center justify-center gap-0.5 cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-border/10 pt-3 flex justify-between items-center text-[9px] font-mono text-foreground-subtle select-none mt-4">
            <span>REPOSITORY</span>
            <span className="text-success font-bold">
              {totalFiles + totalFolders} items
            </span>
          </div>
        </div>
      </div>

      {/* ── Activity Feed ── */}
      <div className="border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5">
        <div className="border-b border-border/20 pb-3 mb-3">
          <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">Recent Activity</h2>
          <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">Latest actions, shares, and governance events.</p>
        </div>
        <div className="divide-y divide-border/10 max-h-[220px] overflow-y-auto">
          {activityEntries.length === 0 ? (
            <p className="py-6 text-center text-[10px] text-foreground-subtle font-mono">No recent activity</p>
          ) : (
            activityEntries.slice(0, 15).map((entry) => (
              <div key={entry.id} className="py-2 flex items-center justify-between gap-3 text-[10px] font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider uppercase border shrink-0",
                    entry.action.includes("SHARED") && "bg-info/10 text-info border-info/20",
                    entry.action.includes("UPLOAD") && "bg-success/10 text-success border-success/20",
                    entry.action.includes("GOV_APPROVED") && "bg-success/10 text-success border-success/20",
                    entry.action.includes("GOV_REJECTED") && "bg-destructive/10 text-destructive border-destructive/20",
                    entry.action.includes("LOCK") && "bg-warning/10 text-warning border-warning/20",
                    entry.action.includes("DELETE") && "bg-destructive/10 text-destructive border-destructive/20",
                    entry.action.includes("TRASH") && "bg-destructive/10 text-destructive border-destructive/20",
                    (!entry.action.includes("SHARED") && !entry.action.includes("UPLOAD") && !entry.action.includes("GOV") && !entry.action.includes("LOCK") && !entry.action.includes("DELETE") && !entry.action.includes("TRASH")) && "bg-background-muted/40 text-foreground-subtle border-border/40"
                  )}>{entry.action.replace(/_/g, " ")}</span>
                  <span className="truncate text-foreground-muted">{entry.targetResource || "—"}</span>
                  {entry.actor && <span className="text-foreground-subtle/60 hidden sm:inline">by {entry.actor}</span>}
                </div>
                <span className="text-foreground-subtle/60 shrink-0">{formatTimestamp(entry.occurredAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
