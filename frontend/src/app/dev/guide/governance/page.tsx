"use client";

import {
  Shield,
  Lock,
  Unlock,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle,
  HelpCircle,
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

      {/* Lock States Explained */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            File Lock States &amp; Protections
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          To maintain data integrity during critical operations or audits, files can be locked. Locks behave differently depending on the lock trigger:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded border border-border/10 bg-background/25 space-y-2">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-foreground uppercase">
              <Lock size={12} className="text-accent" />
              <span>FILE_LOCK Request</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
              Freezes the document. A locked file cannot be modified, renamed, moved to other folders, or deleted. Ideal for protecting finished reports or locking assets during audits.
            </p>
          </div>
          <div className="p-4 rounded border border-border/10 bg-background/25 space-y-2">
            <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-foreground uppercase">
              <Unlock size={12} className="text-accent" />
              <span>FILE_UNLOCK Request</span>
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
              Releases the lock constraints on the file. Editors can write new content or replace the file binary once the unlock request is approved by a director.
            </p>
          </div>
        </div>
      </div>

      {/* Classification Overrides */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Classification Upgrades &amp; Downgrades
        </h3>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          Security rating changes must follow formal administrative requests:
        </p>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 border border-border/10 rounded bg-background/20 flex gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-accent/20 bg-accent-subtle/30 shrink-0">
              <ArrowUp size={14} className="text-accent" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Classification Upgrade</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Increases security rating (e.g., TERBUKA → SULIT). Required when files contain confidential department metrics. Approved immediately if the requester is the file owner, or queued for supervisor confirmation.
              </p>
            </div>
          </div>

          <div className="p-3 border border-border/10 rounded bg-background/20 flex gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-destructive/20 bg-destructive/5 shrink-0">
              <ArrowDown size={14} className="text-destructive" />
            </div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Classification Downgrade</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Decreases security rating (e.g., SULIT → TERBUKA). Subject to high security validation. Requesters must provide a valid business explanation detailing why the sensitive information is now safe for public dissemination.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Lifecycle Grid */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            The Approval Gate Lifecycle
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans font-semibold">
          How a governance request is processed:
        </p>

        <div className="space-y-3 font-mono text-[10px]">
          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full border border-accent bg-accent/15 text-accent flex items-center justify-center font-bold text-[9px] shrink-0">1</div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Submission</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                The staff select file(s), open the **Governance Request Modal**, select the operation type, and enter a detailed business justification.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full border border-accent bg-accent/15 text-accent flex items-center justify-center font-bold text-[9px] shrink-0">2</div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Verification Roster</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                The request appears in the **Pending Requests queue** inside the Governance Tab. Administrators check the requester identity, current file state, and classification tags.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full border border-accent bg-accent/15 text-accent flex items-center justify-center font-bold text-[9px] shrink-0">3</div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Review Verdict</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                The supervisor issues an **Approval** or **Rejection** verdict. If rejected, they must enter a rejection note. System notifications alert the requester of the decision status.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-5 w-5 rounded-full border border-accent bg-accent/15 text-accent flex items-center justify-center font-bold text-[9px] shrink-0">4</div>
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Execution</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Once approved, the file metadata updates, or lock toggles are applied directly by the database transaction. The action generates a permanent cryptographic audit log.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Guidelines warning */}
      <div className="p-4 rounded border border-destructive/30 bg-destructive/5 flex items-start gap-3">
        <ShieldAlert size={18} className="text-destructive shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-foreground font-sans">Security Standard Operating Procedure</span>
          <p className="text-foreground-muted leading-relaxed font-sans">
            Under section 8.2 of the Information Governance policy, submitting falsified lock justifications or downgrading classifications without corporate oversight will result in account suspension and auditing logs review.
          </p>
        </div>
      </div>
    </div>
  );
}
