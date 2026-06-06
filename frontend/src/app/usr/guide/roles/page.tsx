"use client";

import {
  Users,
  Fingerprint,
  Check,
  X,
} from "lucide-react";

export default function SecurityRolesGuidePage() {
  const permissions = [
    { action: "files:read", desc: "View and download files", staff: "Group Only", officer: true, director: true, chief: true },
    { action: "files:write", desc: "Upload and edit files", staff: "Group Only", officer: true, director: true, chief: true },
    { action: "files:delete", desc: "Soft-delete or purge file versions", staff: "Group Only", officer: "Group Only", director: true, chief: true },
    { action: "files:classify", desc: "Change security classifications", staff: "Group Only", officer: "Group Only", director: true, chief: true },
    { action: "users:read", desc: "View corporate user directory", staff: "Group Only", officer: true, director: true, chief: true },
    { action: "users:manage", desc: "Create, update, and toggle users", staff: "Group Only", officer: "Group Only", director: true, chief: true },
    { action: "users:delete", desc: "Permanently delete user accounts", staff: "Group Only", officer: "Group Only", director: true, chief: true },
    { action: "governance:approve", desc: "Authorize governance requests", staff: "Group Only", officer: true, director: true, chief: true },
    { action: "governance:reject", desc: "Decline governance requests", staff: "Group Only", officer: true, director: true, chief: true },
    { action: "admin:access", desc: "Access administration panel", staff: "Group Only", officer: "Group Only", director: true, chief: true },
    { action: "shares:manage", desc: "Manage document sharing records", staff: "Group Only", officer: "Group Only", director: true, chief: true },
    { action: "audit:read", desc: "View compliance audit ledger logs", staff: "Group Only", officer: true, director: true, chief: true },
    { action: "storage:manage", desc: "Configure global/user storage limits", staff: "Group Only", officer: "Group Only", director: true, chief: true },
    { action: "config:read", desc: "Read global system configuration", staff: "Group Only", officer: "Group Only", director: true, chief: true },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Users size={10} /> SECTION 4.0
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          User Roles &amp; Security Levels
        </h2>
        <p className="text-sm text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The portal maps user identities to one of four clearance roles. These roles determine implicit permissions, while dynamic group memberships permit modular access escalation.
        </p>
      </div>

      {/* Roster Guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
        {/* Staff & Officer */}
        <div className="space-y-4">
          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground font-serif text-sm">staff account</span>
              <span className="font-mono text-[10px] font-bold border border-border/40 bg-background-muted/20 text-foreground-subtle px-1.5 py-0.5 rounded uppercase">
                Tier 1
              </span>
            </div>
            <p className="text-sm text-foreground-subtle leading-relaxed">
              Standard team member clearance. staff accounts inherit no implicit permissions, relying entirely on dynamic group mappings configured by administrators.
            </p>
          </div>

          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-info font-serif text-sm">officer account</span>
              <span className="font-mono text-[10px] font-bold border border-info/30 bg-info/10 text-info px-1.5 py-0.5 rounded uppercase">
                Tier 2
              </span>
            </div>
            <p className="text-sm text-foreground-subtle leading-relaxed">
              Supervisory account. officer accounts are authorized to manage team sharing groups and review standard file locking, unlocking, relocation, and deletion requests.
            </p>
          </div>
        </div>

        {/* Director & Chief */}
        <div className="space-y-4">
          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-accent/80 font-serif text-sm">director account</span>
              <span className="font-mono text-[10px] font-bold border border-accent/20 bg-accent/10 text-accent px-1.5 py-0.5 rounded uppercase">
                Tier 3
              </span>
            </div>
            <p className="text-sm text-foreground-subtle leading-relaxed">
              Senior executive account. director accounts inherit all 14 platform permissions implicitly, allowing full access to SULIT and RAHSIA classification segments, role building, and user management.
            </p>
          </div>

          <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-accent font-serif text-sm">chief account</span>
              <span className="font-mono text-[10px] font-bold border border-accent/30 bg-accent/15 text-accent px-1.5 py-0.5 rounded uppercase">
                Tier 4
              </span>
            </div>
            <p className="text-sm text-foreground-subtle leading-relaxed">
              Global administrator clearance. chief accounts carry system override authority, including lock releases, global configurations management, quota modifications, and permanent hard deletions.
            </p>
          </div>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-accent uppercase tracking-widest">
          Who Can Do What?
        </h3>
        <div className="border border-border/25 rounded overflow-hidden">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-background-panel/60 border-b border-border/20 text-foreground-subtle select-none text-[11px] uppercase tracking-wider">
                <th className="p-2.5">Platform Permission Key</th>
                <th className="p-2.5 text-center">Staff</th>
                <th className="p-2.5 text-center">Officer</th>
                <th className="p-2.5 text-center">Director</th>
                <th className="p-2.5 text-center">Chief</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 text-xs">
              {permissions.map((row) => (
                <tr key={row.action} className="hover:bg-background-panel/20 transition-colors">
                  <td className="p-2.5 font-sans text-foreground">
                    <div className="font-mono text-xs font-bold text-accent">{row.action}</div>
                    <div className="text-[10px] text-foreground-subtle/80 mt-0.5">{row.desc}</div>
                  </td>
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
          <h3 className="font-mono text-xs font-bold text-accent uppercase tracking-widest font-sans">
            Biometric Sign-In (Fingerprint / Face ID)
          </h3>
        </div>
        <p className="text-sm text-foreground-subtle leading-relaxed font-sans">
          The portal supports fingerprint or face sign-ins (Passkeys). Once registered, you can log in securely without entering your password, using your computer or phone&apos;s built-in scanner.
        </p>

        <div className="p-4 rounded border border-border/20 bg-background/20 space-y-3 font-sans text-sm">
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
    <span className="inline-block px-1.5 py-0.5 rounded border border-border bg-background-subtle/50 text-[10px] font-bold uppercase tracking-wider text-foreground-subtle select-none">
      {val}
    </span>
  );
}
