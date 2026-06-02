"use client";

import {
  Shield,
  Lock,
  Unlock,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Clock,
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
          To protect sensitive records, the portal uses an approval system. This ensures major actions—like editing locked documents or lowering file security ratings—are reviewed by supervisors.
        </p>
      </div>

      {/* Lock States Explained */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            File Locking Rules
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          To prevent teammates from accidentally editing or overwriting files, you can lock a document. Here is how locks work based on your role in the company:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 font-sans text-xs">
          <div className="p-4 rounded border border-border/10 bg-background/25 space-y-2">
            <span className="font-bold text-foreground block">How a Lock Protects Files</span>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              When a file is locked, standard users cannot edit, rename, move, or delete it. They will see an error message indicating the file is locked and showing who locked it.
            </p>
          </div>
          <div className="p-4 rounded border border-border/10 bg-background/25 space-y-2">
            <span className="font-bold text-accent block">Lock Hierarchy (Manager Override)</span>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              A user with a higher role can edit or unlock files locked by standard staff. E.g., if a staff member locks a draft, a department head or chief executive can still edit or unlock it directly if needed.
            </p>
          </div>
        </div>
      </div>

      {/* Core Request Types */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          The 6 Governance Actions
        </h3>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          You can request permission to perform 6 main actions on protected files:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* FILE_LOCK */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <Lock size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground font-sans block">Lock File</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Request to freeze a file. This blocks edits or deletes from other staff while a document is under official review.
              </p>
            </div>
          </div>
          {/* FILE_UNLOCK */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <Unlock size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground font-sans block">Unlock File</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Request to release a lock. You must explain what edits you need to make to the file.
              </p>
            </div>
          </div>
          {/* CLASSIFICATION_UPGRADE */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <ArrowUp size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground font-sans block">Increase Security Level</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Move a file to a higher security tier (e.g., from Open to Confidential) to restrict who can see it.
              </p>
            </div>
          </div>
          {/* CLASSIFICATION_DOWNGRADE */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <ArrowDown size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground font-sans block">Lower Security Level</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Decrease security restrictions. Requires strict justification to ensure sensitive information is not exposed.
              </p>
            </div>
          </div>
          {/* FILE_MOVE */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <FolderOpen size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground font-sans block">Move File</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Move a protected file to a different folder. You must select the target destination folder.
              </p>
            </div>
          </div>
          {/* FILE_DELETE */}
          <div className="border border-border/20 rounded p-3 bg-background-panel/20 flex gap-3">
            <Trash size={16} className="text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground font-sans block">Delete File</span>
              <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                Request to move files or folders to the Trash bin for deletion. Requires review to prevent accidental data loss.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Classification Direction Check */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest font-sans">
            How Security Label Changes are Checked
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          The portal guards file security ratings through automated verification rules:
        </p>
        <div className="space-y-3 text-xs font-sans text-foreground-muted leading-relaxed">
          <p>
            When you request to change a file&apos;s security rating, the system automatically checks the current label against the new label:
          </p>
          <ul className="list-style-type-disc pl-4 space-y-2 text-[11px]">
            <li>
              <strong>Upgrading a Label:</strong> The system verifies you are changing the rating to a higher security label (e.g., from Open to Confidential, or Restricted to Secret). If the target rating is actually lower or identical, the request will be automatically rejected.
            </li>
            <li>
              <strong>Downgrading a Label:</strong> The system verifies you are lowering the label (e.g., from Secret to Confidential). Lowering a label receives extra verification steps to protect company privacy.
            </li>
          </ul>
        </div>
      </div>

      {/* Approval Lifecycle */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest font-sans">
            Simple Request Lifecycle
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans font-semibold">
          How approval requests proceed:
        </p>

        <div className="space-y-3 font-sans text-[11px] text-foreground-subtle">
          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full border border-accent bg-accent/15 text-accent flex items-center justify-center font-bold text-[9px] shrink-0 font-mono">1</div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground block">Submission</span>
              <p className="text-foreground-muted leading-relaxed">
                Select a file, open the **Governance Request Panel**, pick the action you want, and enter a quick reason explaining your work.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full border border-accent bg-accent/15 text-accent flex items-center justify-center font-bold text-[9px] shrink-0 font-mono">2</div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground block">Supervisor Review</span>
              <p className="text-foreground-muted leading-relaxed">
                Your request is sent to your supervisor or department lead. They check the file details and read your explanation.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full border border-accent bg-accent/15 text-accent flex items-center justify-center font-bold text-[9px] shrink-0 font-mono">3</div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground block">Verdict</span>
              <p className="text-foreground-muted leading-relaxed">
                The supervisor approves or rejects the request. System notifications immediately inform you of their decision.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full border border-accent bg-accent/15 text-accent flex items-center justify-center font-bold text-[9px] shrink-0 font-mono">4</div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground block">Execution</span>
              <p className="text-foreground-muted leading-relaxed">
                Once approved, the system automatically applies the change (e.g. unlocks the file or updates the security rating label).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
