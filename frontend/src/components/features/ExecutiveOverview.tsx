"use client";

import { useState } from "react";
import {
  CheckCircle,
  ArrowRight,
  Lock,
  Shield,
  User,
  FileText,
  File
} from "lucide-react";
import { useFileStore, FileNode } from "@/store/useFileStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import { cn } from "@/lib/utils";

export default function ExecutiveOverview() {
  // Zustand Operations Store
  const tasks = useOperationsStore((state) => state.tasks);
  const approveTask = useOperationsStore((state) => state.approveTask);
  const rejectTask = useOperationsStore((state) => state.rejectTask);

  // Zustand File Store
  const files = useFileStore((state) => state.files);
  const setActiveFile = useFileStore((state) => state.setActiveFile);
  const mapsToFolder = useFileStore((state) => state.mapsToFolder);
  const setActiveView = useFileStore((state) => state.setActiveView);
  const setAccessSheetOpen = useFileStore((state) => state.setAccessSheetOpen);

  // Local state for smooth queue row transitions (fade out + shrink height before action completes)
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [animatingType, setAnimatingType] = useState<"APPROVE" | "REJECT" | null>(null);

  // Calculate stats dynamically
  const pendingTasks = tasks.filter((t) => t.status === "PENDING");
  const pendingCount = pendingTasks.length;

  // Filter top 5 most recently modified files
  const recentFiles = [...files]
    .filter((f) => f.type === "file")
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))
    .slice(0, 5);

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

  // Triggers visual animation prior to mutating state
  const handleTaskAction = (taskId: string, action: "APPROVE" | "REJECT") => {
    setAnimatingId(taskId);
    setAnimatingType(action);
    
    // Smooth transition timeout matching CSS duration
    setTimeout(() => {
      if (action === "APPROVE") {
        approveTask(taskId);
      } else {
        rejectTask(taskId);
      }
      setAnimatingId(null);
      setAnimatingType(null);
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ── 1. Sovereign Infrastructure Ticker Bar ── */}
      <div className="w-full bg-background-panel/40 border border-border/30 px-4 py-1.5 rounded-sm flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-foreground-subtle select-none">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span>NODE: AXIOM-CORE-01</span>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <span>ENCRYPTION: SHIELD-AES-256</span>
          <span className="text-foreground-subtle/30 select-none">|</span>
          <span>CLUSTER STATUS: DUAL-ROUTED OPTIMAL</span>
          <span className="text-foreground-subtle/30 select-none">|</span>
          <span>SECURITY COMPLIANCE: STAGE 4 SECURE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock size={9} className="text-accent" />
          <span>AUDIT LOG: ACTIVE</span>
        </div>
      </div>

      {/* ── 2. Bento-Box Metrics Grid (1x4) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric Card 1: Active Pipelines */}
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-4 relative flex flex-col justify-between h-[105px] overflow-hidden select-none hover:border-accent/40 transition-colors">
          <div>
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">
              Active Corporate Pipelines
            </span>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
              12
            </div>
          </div>
          {/* Subtle sparkline chart created in pure CSS elements */}
          <div className="h-6 w-full flex items-end gap-1 overflow-hidden mt-2 pt-1 border-t border-border/5">
            <div className="bg-accent/15 hover:bg-accent/40 transition-colors h-[30%] w-full rounded-t-[1px]" />
            <div className="bg-accent/20 hover:bg-accent/40 transition-colors h-[45%] w-full rounded-t-[1px]" />
            <div className="bg-accent/15 hover:bg-accent/40 transition-colors h-[25%] w-full rounded-t-[1px]" />
            <div className="bg-accent/30 hover:bg-accent/40 transition-colors h-[60%] w-full rounded-t-[1px]" />
            <div className="bg-accent/25 hover:bg-accent/40 transition-colors h-[40%] w-full rounded-t-[1px]" />
            <div className="bg-accent/50 hover:bg-accent/40 transition-colors h-[80%] w-full rounded-t-[1px] animate-pulse" />
            <div className="bg-accent/35 hover:bg-accent/40 transition-colors h-[55%] w-full rounded-t-[1px]" />
            <div className="bg-accent/65 hover:bg-accent/40 transition-colors h-[90%] w-full rounded-t-[1px]" />
          </div>
        </div>

        {/* Metric Card 2: Pending Signatures */}
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-4 relative flex flex-col justify-between h-[105px] select-none hover:border-accent/40 transition-colors">
          <div>
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
          </div>
          {/* Micro alerting pulse indicator */}
          <div className="flex items-center gap-1.5 text-[8px] font-bold font-mono text-warning/80 mt-1 uppercase">
            {pendingCount > 0 ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
                </span>
                <span>RESTRICTED SIGN-OFF PENDING</span>
              </>
            ) : (
              <span className="text-success flex items-center gap-1">
                <CheckCircle size={10} className="text-success" /> All Protocols Satisfied
              </span>
            )}
          </div>
        </div>

        {/* Metric Card 3: System Integrity Status */}
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-4 relative flex flex-col justify-between h-[105px] select-none hover:border-accent/40 transition-colors">
          <div>
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">
              System Integrity Status
            </span>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1 flex items-center gap-1">
              <span>99.98%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[8px] font-mono text-foreground-subtle pt-2 border-t border-border/10">
            <span>UPTIME: 365d 6h</span>
            <span className="text-success flex items-center gap-0.5">
              <CheckCircle size={8} /> SECURE
            </span>
          </div>
        </div>

        {/* Metric Card 4: Q2 Budget Allocated */}
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-4 relative flex flex-col justify-between h-[105px] select-none hover:border-accent/40 transition-colors">
          <div>
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">
              Q2 Capital Allocated
            </span>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground mt-1">
              $2.4M
            </div>
          </div>
          {/* Dense High-End Progress utilization bar */}
          <div className="space-y-1.5 mt-1">
            <div className="flex justify-between items-center text-[8px] font-mono text-foreground-subtle leading-none">
              <span>UTILIZATION</span>
              <span className="font-bold text-foreground">45.2%</span>
            </div>
            <div className="h-1 w-full bg-background-subtle rounded-full overflow-hidden border border-border/5">
              <div 
                className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500" 
                style={{ width: "45.2%" }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. Split Layout (Governance vs Recent Files) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Governance / Approval Queue */}
        <div className="lg:col-span-7 border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5 flex flex-col justify-between min-h-[380px]">
          <div className="space-y-4">
            <div className="border-b border-border/20 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">
                  Corporate Governance Queue
                </h2>
                <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
                  Restricted sign-off requests requiring immediate C-Suite authorization.
                </p>
              </div>
              <span className="h-5 px-2 rounded-full bg-accent-subtle border border-accent/20 text-[9px] font-mono font-bold text-accent flex items-center justify-center">
                {pendingCount} Pending
              </span>
            </div>

            {/* List of Tasks */}
            {pendingCount === 0 ? (
              <div className="py-14 text-center space-y-3">
                <div className="mx-auto h-9 w-9 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                  <CheckCircle className="text-success" size={18} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-foreground">All Protocols Satisfied</h3>
                  <p className="text-[10px] text-foreground-subtle max-w-xs mx-auto leading-normal">
                    There are currently no active approval tasks or locking blocks on files within your C-Suite domain.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {pendingTasks.map((task) => {
                  const isAnimating = animatingId === task.id;
                  const isApproved = isAnimating && animatingType === "APPROVE";
                  const isRejected = isAnimating && animatingType === "REJECT";

                  return (
                    <div
                      key={task.id}
                      className={cn(
                        "p-3 rounded-sm border border-border/30 bg-background-panel/40 backdrop-blur-sm transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
                        isAnimating && "opacity-0 scale-95 pointer-events-none translate-x-4",
                        isApproved && "border-success bg-success/5",
                        isRejected && "border-destructive bg-destructive/5"
                      )}
                      style={{
                        transitionProperty: "opacity, transform, background-color, border-color",
                      }}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider font-mono uppercase border",
                              task.type === "FINANCE" && "bg-warning/15 text-warning border-warning/25",
                              task.type === "BLUEPRINT" && "bg-info/15 text-info border-info/25",
                              task.type === "HR_OPS" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                            )}
                          >
                            {task.type}
                          </span>
                          <span className="font-mono text-[9px] text-foreground-subtle">
                            {task.timestamp}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground truncate max-w-sm">
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-foreground-muted font-mono leading-none">
                          <span className="flex items-center gap-1">
                            <User size={10} className="text-foreground-subtle" />
                            {task.requestedBy}
                          </span>
                          <span className="text-foreground-subtle/30">|</span>
                          <span className="font-bold text-foreground">
                            {task.amountValue}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
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
            <span>AXIOM-SECURE CONTRACT ENGINE V1.0</span>
            <span className="flex items-center gap-0.5">
              <Shield size={10} className="text-accent" /> TRUSTED
            </span>
          </div>
        </div>

        {/* Right Side: Recent Secure Files */}
        <div className="lg:col-span-5 border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5 flex flex-col justify-between min-h-[380px]">
          <div className="space-y-4">
            <div className="border-b border-border/20 pb-3">
              <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">
                Recent Secure Files
              </h2>
              <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
                Audit trail of recently modified corporate documents.
              </p>
            </div>

            {/* List of files */}
            <div className="divide-y divide-border/10 max-h-[300px] overflow-y-auto pr-1">
              {recentFiles.map((file) => (
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
                        <span>•</span>
                        <span>{file.modifiedAt}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {file.lockedBy && (
                      <span title={`LOCKED: ${file.lockReason || 'Pending Corporate Approval'} (Locked by ${file.lockedBy})`}>
                        <Lock
                          size={10}
                          className="text-accent fill-accent/15 cursor-help"
                        />
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
              ))}
            </div>
          </div>

          <div className="border-t border-border/10 pt-3 flex justify-between items-center text-[9px] font-mono text-foreground-subtle select-none mt-4">
            <span>STORAGE HEALTH STATUS</span>
            <span className="text-success font-bold">OPTIMAL</span>
          </div>
        </div>

      </div>

    </div>
  );
}
