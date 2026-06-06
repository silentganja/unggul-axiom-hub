"use client";

import { Lock, Shield, ShieldCheck, Check, X } from "lucide-react";

export default function InfoSecurityPage() {
  const permissions = [
    { action: "Browse Open/Restricted Files", staff: true, officer: true, director: true, chief: true },
    { action: "Upload/Edit Shared Files", staff: true, officer: true, director: true, chief: true },
    { action: "Lock/Unlock Own Files", staff: true, officer: true, director: true, chief: true },
    { action: "Access Confidential Files", staff: "Shared Only", officer: "Shared Only", director: true, chief: true },
    { action: "Access Secret Board Files", staff: false, officer: false, director: true, chief: true },
    { action: "Submit Governance Requests", staff: true, officer: true, director: true, chief: true },
    { action: "Approve File Locks/Unlocks/Moves", staff: false, officer: true, director: true, chief: true },
    { action: "Approve Classification Changes", staff: false, officer: false, director: true, chief: true },
    { action: "Manage Staff Accounts & Tiers", staff: false, officer: false, director: true, chief: true },
    { action: "Erase Files Globally", staff: false, officer: false, director: false, chief: true },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Lock size={12} /> SECTION 4.0 : ACCESS AND GOVERNANCE
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Access Control &amp; Security Tiers
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          The Strategic Hub manages digital resource isolation through hierarchical user clearance levels and automated request verification pipelines.
        </p>
      </div>

      {/* Security Level Matrix */}
      <div className="space-y-4">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Clearance Level Matrix
        </h3>
        <div className="border border-border/25 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-background-panel/60 border-b border-border/20 text-foreground-subtle select-none text-[9px] uppercase tracking-wider">
                <th className="p-3">Platform Action</th>
                <th className="p-3 text-center">Staff</th>
                <th className="p-3 text-center">Officer</th>
                <th className="p-3 text-center">Director</th>
                <th className="p-3 text-center">Chief</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 text-xs sm:text-sm">
              {permissions.map((row) => (
                <tr key={row.action} className="hover:bg-background-panel/20 transition-colors">
                  <td className="p-3 font-sans font-semibold text-foreground">{row.action}</td>
                  <td className="p-3 text-center">{renderCell(row.staff)}</td>
                  <td className="p-3 text-center">{renderCell(row.officer)}</td>
                  <td className="p-3 text-center">{renderCell(row.director)}</td>
                  <td className="p-3 text-center">{renderCell(row.chief)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Core Security Mechanics */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 sm:p-8 space-y-6 shadow-sm hover:border-border/60 transition-all duration-300">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Intranet Security Implementations
        </h3>
        <div className="space-y-4 text-xs sm:text-sm font-sans text-foreground-subtle leading-relaxed">
          <div>
            <h4 className="font-bold text-foreground font-serif mb-1 text-base text-accent">1. Classification Transition Verification</h4>
            <p className="text-foreground-muted">
              When a user requests to change a file classification rating, the backend performs array index lookup validation. It verifies that upgrade requests choose a target clearance strictly higher than the current state (e.g. from Terhad to Sulit). Downgrade requests are flagged as high risk and require senior Director authorization before database execution.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground font-serif mb-1 text-base text-accent">2. Soft Deletions and Lifecycle Recovery</h4>
            <p className="text-foreground-muted">
              When files or folders are deleted, they are not initially purged. The system executes soft deletions by writing a timestamp to the `deleted_at` column. Trashed files remain in the DB and are hidden from active file viewports. File owners can restore their items, preserving sharing relationships. Permanent hard deletions require Chief Administrator authentication.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground font-serif mb-1 text-base text-accent">3. Locking Rules and Folder Relocations</h4>
            <p className="text-foreground-muted">
              To maintain document integrity during drafting, files can be locked. Once locked, other collaborators cannot rename, move, edit, or delete the file. When relocating folders, the system executes recursive parent checks to prevent circular directory structures (e.g. attempting to move a parent directory into one of its subfolders).
            </p>
          </div>
        </div>
      </div>

      {/* Locking & Override Logic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans text-sm">
        <div className="border border-border/30 rounded-lg bg-background-panel/20 p-5 space-y-2 hover:border-accent/30 transition-all duration-300 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-accent" />
            <h4 className="font-bold text-foreground font-serif text-base">File Locking Rules</h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            Files can be locked to prevent concurrent write overrides. Standard staff can lock a document they own or edit. Higher authorization tiers (Directors/Chiefs) have direct bypass capability to override or release locks set by staff.
          </p>
        </div>

        <div className="border border-border/30 rounded-lg bg-background-panel/20 p-5 space-y-2 hover:border-accent/30 transition-all duration-300 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-accent" />
            <h4 className="font-bold text-foreground font-serif text-base">Immutable Activity Trails</h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            Every file access (upload, download, edit, classification shift) generates a system audit log. Logs store caller session tokens, remote address IPs, action verbs, target entity hashes, and timestamps, serving as a non-repudiation ledger.
          </p>
        </div>
      </div>
    </div>
  );
}

// Render Table Cell Helper
function renderCell(val: boolean | string | undefined) {
  if (val === true) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success shadow-sm">
        <Check size={11} />
      </span>
    );
  }
  if (val === false || val === undefined) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive/15 text-destructive shadow-sm">
        <X size={11} />
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded border border-border bg-background-subtle/50 text-[9px] font-bold uppercase tracking-wider text-foreground-subtle select-none shadow-sm">
      {val}
    </span>
  );
}
