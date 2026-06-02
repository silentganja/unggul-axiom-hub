"use client";

import Link from "next/link";
import { ArrowLeft, Shield, ShieldAlert, Key, Lock, CheckCircle2 } from "lucide-react";

export default function SecurityPage() {
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
              Security Operations
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
            <Shield size={11} /> Security Center
          </span>
          <h2 className="text-3xl font-serif font-bold text-foreground">
            Defensive Architecture &amp; Shielding
          </h2>
          <p className="text-sm text-foreground-subtle leading-relaxed max-w-2xl">
            The platform enforces multiple defensive barriers to isolate corporate data from unauthorized users and external threats.
          </p>
        </div>

        {/* Security Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          <div className="border border-border/30 rounded-xl bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-lg bg-accent/5 border border-accent/25 flex items-center justify-center text-accent">
              <Key size={18} />
            </div>
            <h4 className="font-bold text-foreground text-sm font-serif">WebAuthn Biometrics</h4>
            <p className="text-xs text-foreground-subtle leading-relaxed">
              Standard passkey protocols are enforced for user authentication. Cryptographic device challenges stored in Redis prevent session replays and eliminate credentials spoofing threats.
            </p>
          </div>

          <div className="border border-border/30 rounded-xl bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-lg bg-accent/5 border border-accent/25 flex items-center justify-center text-accent">
              <Lock size={18} />
            </div>
            <h4 className="font-bold text-foreground text-sm font-serif">AES-256-GCM Encryption</h4>
            <p className="text-xs text-foreground-subtle leading-relaxed">
              Uploaded files are stored encrypted on disk servers. Encrypted payloads are prefixed with random 12 byte nonces and protected by 16 byte authentication tags to confirm content integrity.
            </p>
          </div>

          <div className="border border-border/30 rounded-xl bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-lg bg-accent/5 border border-accent/25 flex items-center justify-center text-accent">
              <ShieldAlert size={18} />
            </div>
            <h4 className="font-bold text-foreground text-sm font-serif">Lua Rate Limiter</h4>
            <p className="text-xs text-foreground-subtle leading-relaxed">
              Active endpoint protection uses sliding-window rate limiters compiled as Redis Lua operations. Brute force attempts on logins are throttled to 5 requests per minute per IP.
            </p>
          </div>
        </div>

        {/* Security Disclosure Info */}
        <div className="border border-border/30 rounded-xl bg-background-panel/20 p-6 sm:p-8 space-y-4">
          <h3 className="font-serif font-bold text-base text-foreground">
            Vulnerability Disclosure Policy
          </h3>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed font-sans">
            We value responsible security bug discovery. If you find vulnerabilities (such as bypass options, rate limit failures, or SQL injections) inside the Unggul Axiom Workspace Hub, please email our Security Operations Command Center.
          </p>
          <div className="pt-2">
            <span className="font-mono text-xs font-bold text-accent">Security Reporting Contact:</span>
            <pre className="p-3 mt-1.5 rounded border border-border/10 bg-background text-[11px] text-foreground font-mono select-all w-fit">
              security@unggulaxiom.com
            </pre>
          </div>
        </div>

        {/* System Safeguards */}
        <div className="flex gap-2.5 p-4 rounded border border-border/25 bg-background-panel/10 font-mono text-[10px] text-foreground-subtle/80 leading-relaxed select-none">
          <CheckCircle2 size={14} className="text-accent shrink-0 mt-0.5" />
          <p>
            COMPLIANCE: The intranet platform satisfies basic SOC 2 and ISO 27001 validation standards. Row lock operations, database SSL constraints, and structured tracing mechanisms are applied continuously.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-4 px-6 text-center text-[10px] font-mono text-foreground-subtle/50 mt-auto select-none">
        UNF-IT OPS // SYSTEM SECURITY MANIFEST // SECURITY_LEVEL: HIGH
      </footer>
    </div>
  );
}
