"use client";

import {
  Users,
  Fingerprint,
  Check,
  X,
} from "lucide-react";

export default function SecurityRolesGuidePage() {
  const permissions = [
    { action: "Browse Open/Restricted Files", staff: true, officer: true, director: true, chief: true },
    { action: "Upload/Edit Files (Own & Shared)", staff: true, officer: true, director: true, chief: true },
    { action: "Lock/Unlock Own Files", staff: true, officer: true, director: true, chief: true },
    { action: "Access Shared Folders", staff: true, officer: true, director: true, chief: true },
    { action: "Access Confidential Files", staff: "Shared Only", officer: "Shared Only", director: true, chief: true },
    { action: "Access Secret Board Files", staff: false, officer: false, director: true, chief: true },
    { action: "Submit Lock/Upgrade Request", staff: true, officer: true, director: true, chief: true },
    { action: "Approve Locks, Unlocks & Deletes", staff: false, officer: true, director: true, chief: true },
    { action: "Approve Security Label Changes", staff: false, officer: false, director: true, chief: true },
    { action: "Add/Remove User Accounts", staff: false, officer: false, director: true, chief: true },
    { action: "Erase Files Globally", staff: false, officer: false, director: false, chief: true },
    { action: "Change Global Settings", staff: false, officer: false, director: false, chief: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Users size={10} /> SECTION 4.0
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          User Roles &amp; Security Levels
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The portal matches your account to one of four user roles, depending on your job duties. Your role determines what files you can see and what approvals you can issue.
        </p>
      </div>

      {/* Roster Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
        {/* Staff & Officer */}
        <div className="space-y-4">
          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground font-serif text-xs">Staff Account</span>
              <span className="font-mono text-[8px] font-bold border border-border/40 bg-background-muted/20 text-foreground-subtle px-1.5 py-0.5 rounded uppercase">
                Tier 1
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle leading-relaxed">
              Standard team member account. You can upload and edit documents, share items, and request file locks or classification overrides. You cannot approve requests or modify other users.
            </p>
          </div>

          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-info font-serif text-xs">Officer Account</span>
              <span className="font-mono text-[8px] font-bold border border-info/30 bg-info/10 text-info px-1.5 py-0.5 rounded uppercase">
                Tier 2
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle leading-relaxed">
              Department supervisors. Officers manage team document folders and are authorized to review and approve standard file lock, unlock, move, and trash requests.
            </p>
          </div>
        </div>

        {/* Director & Chief */}
        <div className="space-y-4">
          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-accent/80 font-serif text-xs">Director Account</span>
              <span className="font-mono text-[8px] font-bold border border-accent/20 bg-accent/10 text-accent px-1.5 py-0.5 rounded uppercase">
                Tier 3
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle leading-relaxed">
              Department heads and directors. Directors have broad access to folders within their business unit, including Confidential and Secret Board documents. They can approve security label changes and manage staff accounts.
            </p>
          </div>

          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-accent font-serif text-xs">Chief Account</span>
              <span className="font-mono text-[8px] font-bold border border-accent/30 bg-accent/15 text-accent px-1.5 py-0.5 rounded uppercase">
                Tier 4
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle leading-relaxed">
              Global system administrators. Chiefs have full access to override governance locks, change global system configurations, adjust storage space limits, and delete files permanently.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Who Can Do What?
        </h3>
        <div className="border border-border/25 rounded overflow-hidden">
          <table className="w-full text-left font-mono text-[10px] border-collapse">
            <thead>
              <tr className="bg-background-panel/60 border-b border-border/20 text-foreground-subtle select-none text-[9px] uppercase tracking-wider">
                <th className="p-2.5">Portal Action</th>
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

      {/* Passkey Setup Section */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Fingerprint size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest font-sans">
            Biometric Sign-In (Fingerprint / Face ID)
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          The portal supports fingerprint or face sign-ins (Passkeys). Once registered, you can log in securely without entering your password, using your computer or phone&apos;s built-in scanner.
        </p>

        <div className="p-4 rounded border border-border/20 bg-background/20 space-y-3 font-sans text-xs">
          <h4 className="font-bold text-foreground">How to Register for Fingerprint / Face ID:</h4>
          <ol className="list-decimal pl-4 space-y-2 text-foreground-muted">
            <li>Go to **Portal Settings** (click your profile on the dashboard).</li>
            <li>Select the **Passkey** tab.</li>
            <li>Click the **Register Passkey** button.</li>
            <li>Your browser will show a popup asking for your fingerprint or face scan. Follow the on-screen steps.</li>
            <li>Once complete, you can sign in by simply scanning your fingerprint on the login screen.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// Render Table Cell Helper
function renderCell(val: boolean | string) {
  if (val === true) {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-success/15 text-success">
        <Check size={10} />
      </span>
    );
  }
  if (val === false) {
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
