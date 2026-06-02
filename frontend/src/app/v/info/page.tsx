"use client";

import Link from "next/link";
import { Layers, Shield, Sparkles, BookOpen, ChevronRight, Terminal, Globe, UserCheck } from "lucide-react";

export default function InfoOverviewPage() {
  const portalObjectives = [
    {
      title: "Asynchronous Rust Core",
      desc: "A high-performance server built with Actix-Web, asynchronous SQLx connections to Postgres, and Redis caching for low-latency request-response cycles.",
      badge: "High Performance Backend",
      icon: <Terminal className="text-accent" size={16} />,
    },
    {
      title: "Cryptographic Access Clearance",
      desc: "Four data classification levels (Terbuka, Terhad, Sulit, Rahsia) coupled with passwordless WebAuthn (Passkeys) for secure user authentication.",
      badge: "State-of-the-Art Security",
      icon: <Shield className="text-accent" size={16} />,
    },
    {
      title: "Audited Governance Flow",
      desc: "A custom 4-stage approval workflow. Changes like classification shifts, file unlocking, or trashing require formal supervisor review.",
      badge: "Enterprise Governance",
      icon: <UserCheck className="text-accent" size={16} />,
    },
    {
      title: "Immutable Activity Ledger",
      desc: "Comprehensive audit logging tracking every transaction: IP tracking, HTTP verb methods, user associations, and payload metadata.",
      badge: "Compliance Logs",
      icon: <Globe className="text-accent" size={16} />,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Intro Hero Section */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Layers size={12} /> SECTION 1.0 : OVERVIEW AND CONTEXT
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground font-serif">
          The Strategic Hub Project
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          The Strategic Hub is a secure corporate document containment system and workspace coordination portal. Built as a mock intranet for a high-security corporate entity, the project represents a showcase of secure API design, transactional SQL, and glassmorphic micro-animations.
        </p>
      </div>

      {/* Portfolio Value Banner */}
      <div className="p-5 rounded-lg border border-accent/30 bg-accent-subtle/10 flex items-start gap-4 shadow-sm hover:shadow transition-shadow duration-300">
        <Terminal size={22} className="text-accent shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <span className="font-bold text-foreground font-sans text-base">Portfolio Resume Value</span>
          <p className="text-foreground-muted leading-relaxed font-sans">
            This project showcases full-stack expertise: writing low-level systems logic in Rust, structuring strict relational database integrity, creating responsive Next.js apps with smooth client-side state, and designing aesthetic modern interfaces without bloated layouts.
          </p>
        </div>
      </div>

      {/* Practical Platform Usage Section */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 sm:p-8 space-y-6 shadow-md hover:border-border/60 transition-all duration-300">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Platform Operations and Usage
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-sans text-foreground-subtle leading-relaxed">
          <div className="space-y-2 p-4 rounded border border-border/10 bg-background/20 hover:border-accent/20 transition-all duration-300">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">1. File Explorer</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              Users navigate files using a recursive directory tree. The workspace displays folders and files in a clean, paginated data table. Users search, sort by file attributes, and toggle a details drawer. This drawer reveals file ownership, shared collaborators, storage size, current security clearance label, and active editing lock statuses.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded border border-border/10 bg-background/20 hover:border-accent/20 transition-all duration-300">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">2. Access Roles</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              File owners invite teammates by email and assign fine-grained roles. Viewers are restricted to file previewing and downloading. Editors can add new file versions, modify details, and request edit locks. Owners retain administrative rights over file deletions, metadata modifications, and collaborator shares.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded border border-border/10 bg-background/20 hover:border-accent/20 transition-all duration-300">
            <h4 className="font-bold text-foreground font-serif text-base text-accent">3. Governance approvals</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              High-impact actions require supervisor review. To change security ratings, lock a document for drafting, move a file, or permanently trash an item, users submit a request containing a business justification. Officers and Directors access a central pending inbox where they approve or reject requests, instantly updating database records.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Core Objectives */}
      <div className="space-y-4">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Core Project Pillars
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portalObjectives.map((obj) => (
            <div key={obj.title} className="group border border-border/30 rounded-lg bg-background-panel/20 p-5 space-y-3 flex flex-col justify-between hover:scale-[1.01] hover:border-accent/30 hover:bg-background-panel/40 transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300">
                    {obj.icon}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold font-serif text-foreground">{obj.title}</h3>
                </div>
                <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed font-sans">
                  {obj.desc}
                </p>
              </div>
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-accent border border-accent/20 bg-accent-subtle/20 px-2 py-0.5 rounded w-fit mt-3">
                {obj.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation to chapters */}
      <div className="space-y-4">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Portfolio Chapters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/v/info/architecture"
            className="group border border-border/30 rounded-lg bg-background-panel/30 hover:bg-background-panel/60 p-5 flex gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/50 bg-background-panel shrink-0 transition-colors group-hover:border-accent/40">
              <BookOpen size={20} className="text-accent" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <h4 className="text-sm font-bold text-foreground font-serif group-hover:text-accent transition-colors">
                  System Architecture
                </h4>
                <ChevronRight size={14} className="text-foreground-subtle/50 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed font-sans">
                Review the server-side, client-side, caching, and storage architecture.
              </p>
            </div>
          </Link>

          <Link
            href="/v/info/features"
            className="group border border-border/30 rounded-lg bg-background-panel/30 hover:bg-background-panel/60 p-5 flex gap-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/50 bg-background-panel shrink-0 transition-colors group-hover:border-accent/40">
              <Shield size={20} className="text-accent" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <h4 className="text-sm font-bold text-foreground font-serif group-hover:text-accent transition-colors">
                  Features &amp; Code Walkthrough
                </h4>
                <ChevronRight size={14} className="text-foreground-subtle/50 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed font-sans">
                Dive deep into code implementations, WebAuthn flows, and API design.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
