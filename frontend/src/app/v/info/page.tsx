"use client";

import Link from "next/link";
import { Layers, Shield, Sparkles, BookOpen, ChevronRight, Terminal } from "lucide-react";

export default function InfoOverviewPage() {
  const portalObjectives = [
    {
      title: "Asynchronous Rust Core",
      desc: "An high-performance server built with Actix-Web, asynchronous SQLx connections to Postgres, and Redis caching for low-latency request-response cycles.",
      badge: "High Performance Backend",
    },
    {
      title: "Cryptographic Access Clearance",
      desc: "Four data classification levels (Terbuka, Terhad, Sulit, Rahsia) coupled with passwordless WebAuthn (Passkeys) for bulletproof user authentication.",
      badge: "State-of-the-Art Security",
    },
    {
      title: "Audited Governance Flow",
      desc: "A custom 4-stage approval workflow. Changes like classification shifts, file unlocking, or trashing require formal supervisor review.",
      badge: "Enterprise Governance",
    },
    {
      title: "Immutable Activity Ledger",
      desc: "Comprehensive audit logging tracking every transaction: IP tracking, HTTP verb methods, user associations, and payload metadata.",
      badge: "Compliance Logs",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Intro Hero Section */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Layers size={10} /> SECTION 1.0 — OVERVIEW &amp; CONTEXT
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">
          The Strategic Hub Project
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The **Strategic Hub** is an enterprise-grade document containment system and workspace coordination portal. Built as a mock intranet for a high-security corporate entity, the project represents a showcase of secure API design, transactional SQL, and glassmorphic micro-animations. 
        </p>
      </div>

      {/* Compliance / Resume Value Banner */}
      <div className="p-4 rounded border border-accent/30 bg-accent-subtle/10 flex items-start gap-3">
        <Terminal size={18} className="text-accent shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-foreground font-sans">Portfolio Resume Value</span>
          <p className="text-foreground-muted leading-relaxed font-sans">
            This project showcases full-stack expertise: writing low-level systems logic in Rust, structuring strict relational database integrity, creating responsive Next.js apps with smooth client-side state, and designing aesthetic modern interfaces without bloated layouts.
          </p>
        </div>
      </div>

      {/* Grid of Core Objectives */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Core Project Pillars
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portalObjectives.map((obj) => (
            <div key={obj.title} className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-accent" />
                  <h3 className="text-xs font-bold font-serif text-foreground">{obj.title}</h3>
                </div>
                <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                  {obj.desc}
                </p>
              </div>
              <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-accent mt-3">
                {obj.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation to chapters */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Portfolio Chapters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/v/info/architecture"
            className="group border border-border/30 rounded bg-background-panel/30 hover:bg-background-panel/60 p-4 flex gap-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background-panel shrink-0 transition-colors group-hover:border-accent/40">
              <BookOpen size={18} className="text-accent" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-bold text-foreground font-serif group-hover:text-accent transition-colors">
                  System Architecture
                </h4>
                <ChevronRight size={12} className="text-foreground-subtle/50 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Review the server-side, client-side, caching, and storage architecture.
              </p>
            </div>
          </Link>

          <Link
            href="/v/info/features"
            className="group border border-border/30 rounded bg-background-panel/30 hover:bg-background-panel/60 p-4 flex gap-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background-panel shrink-0 transition-colors group-hover:border-accent/40">
              <Shield size={18} className="text-accent" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-bold text-foreground font-serif group-hover:text-accent transition-colors">
                  Features &amp; Code Walkthrough
                </h4>
                <ChevronRight size={12} className="text-foreground-subtle/50 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Dive deep into code implementations, WebAuthn flows, and API design.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
