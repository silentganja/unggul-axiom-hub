"use client";

import Link from "next/link";
import { ArrowLeft, LifeBuoy, Mail, Phone, Clock, FileText, CheckCircle2 } from "lucide-react";

export default function SupportPage() {
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
              Support Center
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
            <LifeBuoy size={11} /> Support Manual
          </span>
          <h2 className="text-3xl font-serif font-bold text-foreground">
            IT Helpdesk &amp; Technical Support
          </h2>
          <p className="text-sm text-foreground-subtle leading-relaxed max-w-2xl">
            Authorized users can submit system tickets, verify system configurations, request temporary credential overrides, or contact our security operations command center.
          </p>
        </div>

        {/* Support Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border/30 rounded-xl bg-background-panel/20 p-5 space-y-4 hover:border-accent/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-lg bg-accent/5 border border-accent/25 flex items-center justify-center text-accent">
              <FileText size={18} />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-foreground text-sm font-serif">Submit IT Ticket</h4>
              <p className="text-xs text-foreground-subtle leading-relaxed">
                Log technical glitches, request folder relocations, or report access issues directly to our system administrators.
              </p>
            </div>
            <button className="w-full h-8 border border-border bg-background-panel hover:bg-background-subtle/50 text-[10px] font-mono font-bold uppercase tracking-wider rounded text-foreground transition-all cursor-pointer">
              Open Portal Ticket
            </button>
          </div>

          <div className="border border-border/30 rounded-xl bg-background-panel/20 p-5 space-y-4 hover:border-accent/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-lg bg-accent/5 border border-accent/25 flex items-center justify-center text-accent">
              <Phone size={18} />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-foreground text-sm font-serif">Security Override Command</h4>
              <p className="text-xs text-foreground-subtle leading-relaxed">
                Emergency override channel for locked documents, biometric reset approvals, and high priority classification shifts.
              </p>
            </div>
            <pre className="p-2 rounded border border-border/10 bg-background text-[10px] text-foreground font-mono text-center select-all">
              +603-2788-9000
            </pre>
          </div>

          <div className="border border-border/30 rounded-xl bg-background-panel/20 p-5 space-y-4 hover:border-accent/30 transition-all duration-300">
            <div className="h-10 w-10 rounded-lg bg-accent/5 border border-accent/25 flex items-center justify-center text-accent">
              <Mail size={18} />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-foreground text-sm font-serif">E-mail Administration</h4>
              <p className="text-xs text-foreground-subtle leading-relaxed">
                Send encryption key recovery files, access certificates, or user account modification files directly to IT Operations.
              </p>
            </div>
            <pre className="p-2 rounded border border-border/10 bg-background text-[10px] text-foreground font-mono text-center select-all">
              ops@unggulaxiom.com
            </pre>
          </div>
        </div>

        {/* Priority SLAs Tiers */}
        <div className="border border-border/30 rounded-xl bg-background-panel/20 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b border-border/10 pb-2">
            <Clock size={14} className="text-accent" />
            <h3 className="font-mono text-[10px] font-semibold text-accent uppercase tracking-widest">
              Service Level Agreement (SLA) Priority Tiers
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm font-sans text-foreground-subtle leading-relaxed">
            <div className="space-y-1.5">
              <span className="font-mono text-[9px] font-bold text-accent uppercase block">Tier 1: Chief Admins</span>
              <p className="text-foreground font-semibold text-xs">Immediate Response</p>
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Emergency biometrics resets and system configuration modifications are handled with zero delays.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[9px] font-bold text-accent uppercase block">Tier 2: Directors</span>
              <p className="text-foreground font-semibold text-xs">60 Minute Window</p>
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Classification upgrades, downgrades, and folder relocation requests are reviewed within one hour.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[9px] font-bold text-accent uppercase block">Tier 3: Officers</span>
              <p className="text-foreground font-semibold text-xs">4 Hour Window</p>
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Access sharing requests, audit log queries, and file lock releases are processed within four hours.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-mono text-[9px] font-bold text-accent uppercase block">Tier 4: Staff Accounts</span>
              <p className="text-foreground font-semibold text-xs">Next Business Day</p>
              <p className="text-foreground-muted text-[11px] leading-relaxed">
                Standard client configuration questions, metadata typing updates, and generic ticket queues.
              </p>
            </div>
          </div>
        </div>

        {/* IT Compliance Notice */}
        <div className="flex gap-2.5 p-4 rounded border border-border/25 bg-background-panel/10 font-mono text-[10px] text-foreground-subtle/80 leading-relaxed select-none">
          <CheckCircle2 size={14} className="text-accent shrink-0 mt-0.5" />
          <p>
            NOTICE: Support lines are fully logged for audit compliance purposes. By opening support tickets or contacting IT lines, you consent to remote session diagnostics and location IP tracing checks.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-4 px-6 text-center text-[10px] font-mono text-foreground-subtle/50 mt-auto select-none">
        UNF-IT OPS // TECHNICAL SERVICE SUPPORT MANUAL // v1.0.0
      </footer>
    </div>
  );
}
