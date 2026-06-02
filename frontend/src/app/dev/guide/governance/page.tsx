"use client";

import {
  Shield,
  Lock,
  Unlock,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Clock,
  HelpCircle,
  FolderOpen,
  Trash,
} from "lucide-react";

export default function GovernanceGuidePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Shield size={10} /> SECTION 3.0
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          Governance &amp; Approvals Flow
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          Strategic Portal integrates a strict governance request system to manage sensitive file operations. Staff must request authorization for locks, unlocks, and security rating overrides.
        </p>
      </div>

      {/* Hierarchical Lock System */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            Hierarchical Lock Protection Rules
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          To maintain data integrity during critical draft writing or official reviews, files can be locked. Locks enforce a **role-based hierarchy check** on all writes, renames, moves, and deletions:
        </p>

        <div className="space-y-3 font-mono text-[10px] text-foreground-subtle">
          <div className="p-3 border border-border/10 rounded bg-background/25 flex flex-col gap-1 font-sans">
            <span className="font-mono text-[9px] font-bold text-foreground uppercase">Basic Lock Rules</span>
            <p className="text-[11px] text-foreground-subtle leading-relaxed">
              If User A locks a file, User B is blocked from modifying, moving, renaming, or deleting it, and will receive a <code className="font-mono text-xs text-accent">403 Forbidden ("File is locked")</code> code.
            </p>
          </div>
          
          <div className="p-3 border border-border/10 rounded bg-background/25 flex flex-col gap-1 font-sans">
            <span className="font-mono text-[9px] font-bold text-accent uppercase">Hierarchical Bypass Exception</span>
            <p className="text-[11px] text-foreground-subtle leading-relaxed">
              The backend enforces lock checks based on your role level. If your role level is **greater than or equal to** the locker&apos;s role, you bypass the lock block and can perform edits:
            </p>
            <ul className="list-disc pl-4 mt-1.5 space-y-1 text-[11px] text-foreground-muted">
              <li>A file locked by <code className="text-foreground text-[10px] font-mono">staff</code> (level 1) can be edited or unlocked directly by an <code className="text-foreground text-[10px] font-mono">officer</code>, <code className="text-foreground text-[10px] font-mono">director</code>, or <code className="text-foreground text-[10px] font-mono">chief</code>.</li>
              <li>A file locked by a <code className="text-foreground text-[10px] font-mono">director</code> (level 3) can only be edited or unlocked directly by another <code className="text-foreground text-[10px] font-mono">director</code> or <code className="text-foreground text-[10px] font-mono">chief</code>.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Core Request Types */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          The 6 Core Governance Request Types
        </h3>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          All major file actions are submitted as governance requests. Here are the 6 request types supported by the system:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* FILE_LOCK */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <Lock size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono font-bold text-foreground">FILE_LOCK</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Applies a secure lock to a file. Prevents any standard editing, moves, or deletions by lower-tier staff.
              </p>
            </div>
          </div>
          {/* FILE_UNLOCK */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <Unlock size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono font-bold text-foreground">FILE_UNLOCK</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Requests release of a locked file to allow modifications. Must state the purpose of the upcoming edit.
              </p>
            </div>
          </div>
          {/* CLASSIFICATION_UPGRADE */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <ArrowUp size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono font-bold text-foreground">CLASSIFICATION_UPGRADE</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Increases the file classification rating. Restricted to Folder Owners or Director+ validation checks.
              </p>
            </div>
          </div>
          {/* CLASSIFICATION_DOWNGRADE */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <ArrowDown size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono font-bold text-foreground">CLASSIFICATION_DOWNGRADE</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Lowers the file classification. Subjects file to intense administrative audit review to prevent data exposure.
              </p>
            </div>
          </div>
          {/* FILE_MOVE */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <FolderOpen size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono font-bold text-foreground">FILE_MOVE</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Relocates a file to a different directory. Requires specifying the destination <code className="font-mono text-[10px]">targetFolderId</code> in the metadata.
              </p>
            </div>
          </div>
          {/* FILE_DELETE */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <Trash size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono font-bold text-foreground">FILE_DELETE</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Triggers soft deletion. Moves files to the Trash system. Requires administrative verify approval.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Classification Index Validation Direction */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            Classification Direction Check Logic
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          The Rust backend validates classification upgrades and downgrades against the Malaysian Government security index array order:
        </p>
        <pre className="p-3 rounded border border-border/30 bg-background/80 font-mono text-[10px] leading-relaxed text-foreground-subtle overflow-x-auto select-all">
          const VALID_CLASSIFICATIONS: &[&str] = &[&quot;RAHSIA&quot;, &quot;SULIT&quot;, &quot;TERHAD&quot;, &quot;TERBUKA&quot;];
          // index 0 = RAHSIA (Highest) | index 3 = TERBUKA (Lowest)
        </pre>
        <div className="space-y-2 text-xs font-sans text-foreground-muted leading-relaxed">
          <p>
            When a transaction attempts to modify a rating, the backend queries the current file index (<code className="font-mono text-[10px]">ci</code>) and target index (<code className="font-mono text-[10px]">ni</code>):
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            <li>
              <strong>Upgrades validation:</strong> Verified if the current index is strictly larger than the target index (<code className="font-mono text-[10px]">ci &gt; ni</code>). Attempting an upgrade where <code className="font-mono text-[10px]">ci &lt;= ni</code> (e.g., SULIT (1) to TERHAD (2)) returns a <code className="font-mono text-[10px] text-destructive">400 Bad Request</code> error.
            </li>
            <li>
              <strong>Downgrades validation:</strong> Verified if the current index is strictly smaller than the target index (<code className="font-mono text-[10px]">ci &lt; ni</code>). Attempting a downgrade where <code className="font-mono text-[10px]">ci &gt;= ni</code> (e.g., TERHAD (2) to SULIT (1)) returns a <code className="font-mono text-[10px] text-destructive">400 Bad Request</code> error.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
