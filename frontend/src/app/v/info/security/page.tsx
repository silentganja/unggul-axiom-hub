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
    { action: "Erase Files Globally", staff: false, officer: false, block: false, chief: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Lock size={10} /> SECTION 4.0 — ACCESS &amp; GOVERNANCE
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          Access Control &amp; Security Tiers
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The Strategic Hub manages digital resource isolation through hierarchical user clearance levels and automated request verification pipelines.
        </p>
      </div>

      {/* Security Level Matrix */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Clearance Level Matrix
        </h3>
        <div className="border border-border/25 rounded overflow-hidden">
          <table className="w-full text-left font-mono text-[10px] border-collapse">
            <thead>
              <tr className="bg-background-panel/60 border-b border-border/20 text-foreground-subtle select-none text-[8px] uppercase tracking-wider">
                <th className="p-2.5">Platform Action</th>
                <th className="p-2.5 text-center">Staff</th>
                <th className="p-2.5 text-center">Officer</th>
                <th className="p-2.5 text-center">Director</th>
                <th className="p-2.5 text-center">Chief</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 text-[10px]">
              {permissions.map((row) => (
                <tr key={row.action} className="hover:bg-background-panel/20 transition-colors">
                  <td className="p-2.5 font-sans font-semibold text-foreground">{row.action}</td>
                  <td className="p-2.5 text-center">{renderCell(row.staff)}</td>
                  <td className="p-2.5 text-center">{renderCell(row.officer)}</td>
                  <td className="p-2.5 text-center">{renderCell(row.director)}</td>
                  <td className="p-2.5 text-center">{renderCell(row.chief)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Locking & Override Logic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-accent" />
            <h4 className="font-bold text-foreground font-serif">File Locking Rules</h4>
          </div>
          <p className="text-[11px] text-foreground-subtle leading-relaxed">
            Files can be locked to prevent concurrent write overrides. Standard staff can lock a document they own or edit. Higher authorization tiers (Directors/Chiefs) have direct bypass capability to override or release locks set by staff.
          </p>
        </div>

        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-accent" />
            <h4 className="font-bold text-foreground font-serif">Immutable Activity Trails</h4>
          </div>
          <p className="text-[11px] text-foreground-subtle leading-relaxed">
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
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success/15 text-success">
        <Check size={10} />
      </span>
    );
  }
  if (val === false || val === undefined) {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <X size={10} />
      </span>
    );
  }
  return (
    <span className="inline-block px-1.5 py-0.5 rounded border border-border bg-background-subtle/50 text-[8px] font-bold uppercase tracking-wider text-foreground-subtle select-none">
      {val}
    </span>
  );
}
