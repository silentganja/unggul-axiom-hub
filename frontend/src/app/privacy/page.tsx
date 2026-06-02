"use client";

import Link from "next/link";
import { ArrowLeft, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="relative min-h-dvh flex flex-col bg-background overflow-hidden selection:bg-accent selection:text-accent-foreground">
      {/* Background glowing mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[45%] h-[45%] rounded-full bg-accent/5 blur-[120px] hidden md:block" />
        <div className="absolute top-[40%] right-[5%] w-[40%] h-[40%] rounded-full bg-info/5 blur-[130px] hidden md:block" />
        <div className="absolute inset-0 scan-grid opacity-[0.015] dark:opacity-[0.03]" />
      </div>

      {/* Floating Header */}
      <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between border-b border-border/40 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-8 w-8 flex items-center justify-center rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
            title="Return to Main Portal Gateway"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
          </Link>
          <div>
            <span className="text-sm font-semibold tracking-tight text-foreground leading-none block">
              Privacy &amp; Data Policies
            </span>
            <span className="font-mono text-[8px] font-bold tracking-[0.25em] text-accent uppercase mt-1 leading-none block">
              Unggul Axiom Intranet
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="relative flex-grow max-w-4xl w-full mx-auto px-6 py-12 z-10 space-y-10">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded border border-accent/20 bg-accent-subtle/30 px-3 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider text-accent">
            <FileText size={11} /> Privacy manual
          </span>
          <h2 className="text-3xl font-serif font-bold text-foreground">
            Data Containment &amp; Logging Policy
          </h2>
          <p className="text-sm text-foreground-subtle leading-relaxed max-w-2xl font-sans">
            This policy outlines how employee user profiles, activity streams, and file metadata metrics are collected and managed within the corporate intranet portal.
          </p>
        </div>

        {/* Policy Details */}
        <div className="border border-border/30 rounded-xl bg-background-panel/20 p-6 sm:p-8 space-y-6 text-sm font-sans text-foreground-subtle leading-relaxed">
          
          <div className="space-y-2">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">1. Internal Activity Tracking</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              Every operation executed within the Strategic Hub (such as document uploads, shared link generations, directory creations, or file classification changes) triggers a row insertion in the database `audit_logs` table. Stored properties include user ID references, HTTP request method names, targeted files, and active IP addresses.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">2. Log Retention and Archival Window</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              Compliance logs remain active and queryable by security staff for 30 days. After 30 days, old records are automatically rotated out and transferred to offline security audit storage to limit space overhead and protect privacy records.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">3. User Profile Privacy</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              Authentication relies on WebAuthn biometrics. Biometric fingerprints and face scan vectors are stored locally on user hardware devices. The backend database holds only the public cryptographic key and signature counter to verify sign in assertions, ensuring no private biometric records are sent to company servers.
            </p>
          </div>

          <div className="space-y-2 border-t border-border/10 pt-4">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">4. Confidentiality &amp; NDA Scope</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              All documents labeled under SULIT (Confidential) and RAHSIA (Secret) ratings are bound by corporate Non-Disclosure Agreements (NDAs). Unauthorized duplication, downloading to public host volumes, or classification downgrades will trigger security alerts and direct internal investigations.
            </p>
          </div>

        </div>

        {/* Policy Safeguard Notice */}
        <div className="flex gap-2.5 p-4 rounded border border-border/25 bg-background-panel/10 font-mono text-[10px] text-foreground-subtle/80 leading-relaxed select-none">
          <ShieldAlert size={14} className="text-accent shrink-0 mt-0.5" />
          <p>
            WARNING: Employee activity on the intranet is monitored in compliance with corporate safety rules. Mismatched usage or unapproved file exports are subject to review.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-4 px-6 text-center text-[10px] font-mono text-foreground-subtle/50 mt-auto select-none">
        UNF-IT COMPLIANCE // CO-PRIVACY POLICY // v1.0.0
      </footer>
    </div>
  );
}
