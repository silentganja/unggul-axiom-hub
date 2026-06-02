"use client";

import { ShieldCheck, Lock, Shield, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HardeningItem {
  title: string;
  category: string;
  status: "IMPLEMENTED" | "ENFORCED" | "MONITORED";
  description: string;
  threatMitigation: string;
  complianceControl: string;
}

export default function InfoHardeningPage() {
  const [filter, setFilter] = useState<string>("ALL");

  const checklist: HardeningItem[] = [
    {
      title: "Content Security Policy (CSP)",
      category: "Network & Headers",
      status: "ENFORCED",
      description: "Restricts source origins for scripts, styles, frames, and images, rejecting arbitrary browser injection scripts.",
      threatMitigation: "Mitigates Cross Site Scripting (XSS) and frame injection clickjacking attacks.",
      complianceControl: "SOC 2 CC6.1 / ISO 27001 A.12.6.1"
    },
    {
      title: "WebAuthn Cryptographic Bindings",
      category: "Identity & Access",
      status: "IMPLEMENTED",
      description: "Verifies the signature origin against the registered Relying Party Identifier (rpId) and compares stored hardware sign counters.",
      threatMitigation: "Blocks phishing attempts, credential sharing, and replay authentication actions.",
      complianceControl: "SOC 2 CC6.3 / ISO 27001 A.9.4.3"
    },
    {
      title: "AES-256-GCM At-Rest Encryption",
      category: "Data Protection",
      status: "ENFORCED",
      description: "Encrypts documents on disk storage. Prefixes files with a random 12 byte nonce and appends a 16 byte authentication tag.",
      threatMitigation: "Prevents raw document visibility in the event of directory breach or storage volume exposure.",
      complianceControl: "SOC 2 CC6.7 / ISO 27001 A.18.1.5"
    },
    {
      title: "Redis Sliding-Window Rate Limiter",
      category: "Network & Headers",
      status: "MONITORED",
      description: "Applies Lua script rate limiting boundaries on authentication and sensitive endpoints (5 requests/60s for logins).",
      threatMitigation: "Blocks brute-force scans and Denial of Service (DoS) API execution floods.",
      complianceControl: "SOC 2 CC6.8 / ISO 27001 A.13.1.1"
    },
    {
      title: "SQL Parameterization Constraints",
      category: "Data Protection",
      status: "ENFORCED",
      description: "Binds queries using SQLx prepared variables, isolating string concatenation from database query compilers.",
      threatMitigation: "Eliminates SQL injection vulnerability vectors from backend database operations.",
      complianceControl: "SOC 2 CC6.6 / ISO 27001 A.14.1.2"
    },
    {
      title: "Audit Log Immutability Ledger",
      category: "Compliance & Audit",
      status: "IMPLEMENTED",
      description: "Logs every change (user logins, uploads, moves, classification updates) with remote IP addresses and session IDs.",
      threatMitigation: "Guarantees trace history for post-incident investigations, preventing audit edits.",
      complianceControl: "SOC 2 CC2.1 / ISO 27001 A.12.4.1"
    }
  ];

  const categories = ["ALL", "Network & Headers", "Identity & Access", "Data Protection", "Compliance & Audit"];

  const filteredChecklist = filter === "ALL" 
    ? checklist 
    : checklist.filter(item => item.category === filter);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <ShieldCheck size={12} /> SECTION 12.0 : PRODUCTION HARDENING
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Production Hardening &amp; Compliance Matrix
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          Security is maintained through multiple layers of system isolation. Below is the production hardening matrix mapped directly to international compliance guidelines.
        </p>
      </div>

      {/* Interactive Filters */}
      <div className="flex flex-wrap gap-2 select-none border-b border-border/10 pb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-3 py-1 text-xs font-mono rounded border transition-all cursor-pointer",
              filter === cat
                ? "bg-accent border-accent text-accent-foreground font-bold shadow-sm"
                : "border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-panel/40"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Hardening Checklist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredChecklist.map((item) => (
          <div
            key={item.title}
            className="group border border-border/25 rounded-lg bg-background-panel/20 p-5 space-y-4 hover:border-accent/30 hover:bg-background-panel/30 transition-all duration-300 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Item Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] font-bold text-accent uppercase tracking-wider block">
                    {item.category}
                  </span>
                  <h4 className="font-serif font-bold text-foreground text-base">
                    {item.title}
                  </h4>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded font-mono text-[8px] font-extrabold tracking-wider border shrink-0",
                    item.status === "ENFORCED"
                      ? "bg-success/15 border-success/30 text-success"
                      : item.status === "IMPLEMENTED"
                      ? "bg-accent/15 border-accent/30 text-accent"
                      : "bg-info/15 border-info/30 text-info"
                  )}
                >
                  {item.status}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-foreground-muted font-sans leading-relaxed">
                {item.description}
              </p>

              {/* Threat Mitigation Detail */}
              <div className="p-3 rounded border border-border/10 bg-background/30 space-y-1">
                <span className="font-mono text-[9px] font-bold text-accent uppercase block">Threat Mitigation Vector</span>
                <p className="text-foreground-subtle text-[11px] sm:text-xs leading-relaxed font-sans">
                  {item.threatMitigation}
                </p>
              </div>
            </div>

            {/* Compliance Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border/10 font-mono text-[10px] text-foreground-subtle/80">
              <span className="flex items-center gap-1.5">
                <Shield size={11} className="text-accent" />
                <span>Audit Target:</span>
              </span>
              <span className="font-bold text-foreground">{item.complianceControl}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Defensive Infrastructure Summary */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 sm:p-8 space-y-6 shadow-sm hover:border-border/60 transition-all duration-300 font-sans text-sm">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Defensive Infrastructure Architecture
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-foreground-subtle leading-relaxed">
          <div className="space-y-2 p-4 rounded border border-border/10 bg-background/20">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">1. Network Filtering</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              All APIs run inside secure subnets. Public client entry is restricted to predefined subdomains, and invalid requests are rejected at the edge layer to secure server capacity.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded border border-border/10 bg-background/20">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">2. Key Protection</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              Crypto keys are supplied at initialization via secure OS environment variables. Keys remain resident in memory and are never written to source logs or code repositories.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded border border-border/10 bg-background/20">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">3. Input Sanitization</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              User files and text inputs undergo character checks before file system execution. Structured queries bypass string parsing, preventing secondary execution threats.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
