"use client";

import {
  Users,
  Shield,
  Fingerprint,
  Check,
  X,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function SecurityRolesGuidePage() {
  const permissions = [
    { action: "Browse Open/Terhad Files", staff: true, officer: true, director: true, chief: true },
    { action: "Upload/Edit Files (Owned/Shared)", staff: true, officer: true, director: true, chief: true },
    { action: "Lock/Unlock Own Files", staff: true, officer: true, director: true, chief: true },
    { action: "Access Shared Folders", staff: true, officer: true, director: true, chief: true },
    { action: "Access SULIT Files", staff: "Shared Only", officer: "Shared Only", director: true, chief: true },
    { action: "Access RAHSIA Files", staff: false, officer: false, director: true, chief: true },
    { action: "Submit Governance Request", staff: true, officer: true, director: true, chief: true },
    { action: "Approve standard locks/moves/deletes", staff: false, officer: true, director: true, chief: true },
    { action: "Approve classification changes", staff: false, officer: false, director: true, chief: true },
    { action: "User Creation & Deactivation", staff: false, officer: false, director: true, chief: true },
    { action: "Force Delete Files Globally", staff: false, officer: false, director: false, chief: true },
    { action: "System Config Override", staff: false, officer: false, director: false, chief: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Users size={10} /> SECTION 4.0
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          Security Roles &amp; Credentials
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The Strategic Portal operates on a structured Role-Based Access Control (RBAC) mechanism. User accounts are classified into four main tiers.
        </p>
      </div>

      {/* Roster Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Staff & Officer */}
        <div className="space-y-4">
          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground font-serif text-xs">Staff Account</span>
              <span className="font-mono text-[8px] font-bold border border-border/40 bg-background-muted/20 text-foreground-subtle px-1.5 py-0.5 rounded uppercase">
                Tier 1 (level 1)
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Basic operational accounts. Staff can upload documents, create folders, share resources with other team members, and request locks or security overrides. Cannot bypass governance policies or approve requests.
            </p>
          </div>

          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-info font-serif text-xs">Officer Account</span>
              <span className="font-mono text-[8px] font-bold border border-info/30 bg-info/10 text-info px-1.5 py-0.5 rounded uppercase">
                Tier 2 (level 2)
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Operational supervisors. Officers possess standard governance access (<code className="font-mono text-[10px]">can_govern</code>) allowing them to approve standard locks, unlocks, moves, and soft deletes. Cannot approve classification overrides.
            </p>
          </div>
        </div>

        {/* Director & Chief */}
        <div className="space-y-4">
          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-accent/80 font-serif text-xs">Director Account</span>
              <span className="font-mono text-[8px] font-bold border border-accent/20 bg-accent/10 text-accent px-1.5 py-0.5 rounded uppercase">
                Tier 3 (level 3)
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Executive business unit leaders. Directors have access to files rated up to RAHSIA within their scope. They possess <code className="font-mono text-[10px]">can_govern_classified</code> and <code className="font-mono text-[10px]">can_manage_users</code>, allowing them to approve classification updates and edit standard user accounts.
            </p>
          </div>

          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-accent font-serif text-xs">Chief Account</span>
              <span className="font-mono text-[8px] font-bold border border-accent/30 bg-accent/15 text-accent px-1.5 py-0.5 rounded uppercase">
                Tier 4 (level 4)
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Global system administrators. Chiefs possess full operational privileges, including force-approving administrative governance requests, overriding global config variables, managing storage metrics, and deleting files globally.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Permissions Matrix
        </h3>
        <div className="border border-border/25 rounded overflow-hidden">
          <table className="w-full text-left font-mono text-[10px] border-collapse">
            <thead>
              <tr className="bg-background-panel/60 border-b border-border/20 text-foreground-subtle select-none text-[9px] uppercase tracking-wider">
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

      {/* Passkey Setup Section */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Fingerprint size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            FIDO2 / WebAuthn Biometric Passkeys
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          Strategic Portal implements hardware-backed FIDO2 Passkey authentication to secure logins. Once registered, staff can skip entering passwords and authenticate using their device&apos;s biometrics (fingerprint scanner, face recognition, or hardware pin).
        </p>

        <div className="p-4 rounded border border-border/20 bg-background/20 space-y-3 font-sans text-xs">
          <h4 className="font-bold text-foreground">How to Register a Passkey:</h4>
          <ol className="list-decimal pl-4 space-y-2 text-foreground-muted">
            <li>Navigate to **Portal Settings** from the dashboard.</li>
            <li>Select the **Passkey** tab.</li>
            <li>Click the **Register Passkey** button.</li>
            <li>Your browser will trigger the secure system dialog. Follow the instructions to register your biometric lock.</li>
            <li>On your next login, simply enter your email and click the biometric sign-in button.</li>
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
