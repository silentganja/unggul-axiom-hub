"use client";

import Link from "next/link";
import { Shield, ArrowRight, Lock, Users, TrendingUp, FolderHeart, Globe } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="relative min-h-dvh flex flex-col bg-background overflow-hidden selection:bg-accent selection:text-accent-foreground">
      
      {/* ── Background Aesthetics (Ambient Glowing Mesh) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[50%] h-[50%] rounded-full bg-accent/10 blur-[130px] ambient-glow-1" />
        <div className="absolute top-[30%] -right-[10%] w-[45%] h-[45%] rounded-full bg-info/8 blur-[110px] ambient-glow-2" />
        <div className="absolute -bottom-[10%] left-[15%] w-[40%] h-[40%] rounded-full bg-accent-hover/8 blur-[100px] ambient-glow-3" />
        <div className="absolute inset-0 scan-grid opacity-[0.015] dark:opacity-[0.035]" />
      </div>

      {/* ── Floating Header Command Center ── */}
      <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between border-b border-border/40 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent-subtle shadow-[0_0_20px_rgba(205,127,50,0.15)]">
            <Shield size={18} className="text-accent" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-foreground leading-none">
              Unggul Axiom
            </span>
            <span className="font-mono text-[9px] font-bold tracking-[0.25em] text-accent uppercase mt-1 leading-none">
              Workspace Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Main Hero Section & Portal Grid ── */}
      <main className="relative flex-grow flex flex-col justify-center items-center px-6 py-16 lg:py-24 z-10 space-y-16">
        
        {/* Brand visual header block */}
        <div className="text-center space-y-4 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/5 px-3 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-accent">
            Corporate Gateway
          </span>
          
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight leading-[1.15]">
            <span className="bg-gradient-to-r from-foreground via-foreground-muted to-accent bg-clip-text text-transparent block">
              Access the Unggul Axiom
            </span>
            <span className="bg-gradient-to-r from-foreground via-accent to-accent-hover bg-clip-text text-transparent font-bold mt-1 inline-block">
              Workspace Ecosystem
            </span>
          </h1>

          <p className="text-sm sm:text-base text-foreground-muted max-w-xl mx-auto leading-relaxed font-sans">
            A secure directory gateway connecting executives, operations divisions, allocators, and strategic partners to dedicated corporate applications.
          </p>
        </div>

        {/* Portal Directory Selector Grid (2x2 Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[880px]">
          
          {/* Active Foundation Command Portal */}
          <div className="glass-premium rounded-2xl p-6 flex flex-col justify-between text-left space-y-6 shadow-xl border border-accent/15 relative group hover:border-accent/35 transition-all duration-300">
            <div className="absolute top-0 right-0 mt-6 mr-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/5 px-2.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-success">
                Active Portal
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-all duration-300">
                <Shield size={22} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground tracking-tight font-sans">
                  Strategic Hub
                </h3>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Dedicated environment for authorized staff. Oversee internal frameworks and manage core enterprise operations.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link 
                href="/login?portal=foundation"
                className="btn-shimmer flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-bold tracking-widest uppercase font-mono shadow-md"
              >
                Sign In to Portal
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* HR & Operations Card (Disabled Phase 2) */}
          <div className="glass-premium rounded-2xl p-6 flex flex-col justify-between text-left space-y-6 shadow-md opacity-75 relative group border border-border/10">
            <div className="absolute top-0 right-0 mt-6 mr-6">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-background-panel px-2.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-foreground-subtle">
                Development Pipeline
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background-muted border border-border text-foreground-subtle">
                <Users size={22} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground-muted tracking-tight font-sans">
                  HR & Operations Portal
                </h3>
                <p className="text-xs text-foreground-subtle/80 leading-relaxed">
                  Access active staff registers, corporate organizational logs, administrative resource indices, and payroll records.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled
                className="h-10 w-full border border-border bg-background-panel text-foreground-subtle/50 rounded-lg text-xs font-bold tracking-widest uppercase font-mono cursor-not-allowed flex items-center justify-center"
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Investor Relations Card (Disabled Phase 2) */}
          <div className="glass-premium rounded-2xl p-6 flex flex-col justify-between text-left space-y-6 shadow-md opacity-75 relative group border border-border/10">
            <div className="absolute top-0 right-0 mt-6 mr-6">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-background-panel px-2.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-foreground-subtle">
                Scheduled Integration
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background-muted border border-border text-foreground-subtle">
                <TrendingUp size={22} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground-muted tracking-tight font-sans">
                  Investor Portal
                </h3>
                <p className="text-xs text-foreground-subtle/80 leading-relaxed">
                  Review shareholder records, dividend ledgers, statutory filings, and strategic capitalization sheets.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled
                className="h-10 w-full border border-border bg-background-panel text-foreground-subtle/50 rounded-lg text-xs font-bold tracking-widest uppercase font-mono cursor-not-allowed flex items-center justify-center"
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Partner Telemetry Gate Card (Disabled Phase 2) */}
          <div className="glass-premium rounded-2xl p-6 flex flex-col justify-between text-left space-y-6 shadow-md opacity-75 relative group border border-border/10">
            <div className="absolute top-0 right-0 mt-6 mr-6">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/30 bg-background-panel px-2.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-foreground-subtle">
                Authorized Access
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background-muted border border-border text-foreground-subtle">
                <Globe size={22} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground-muted tracking-tight font-sans">
                  Partner Portal
                </h3>
                <p className="text-xs text-foreground-subtle/80 leading-relaxed">
                  Dedicated interface for external strategic partners, logistics pipelines, and collaborative project progress logs.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                disabled
                className="h-10 w-full border border-border bg-background-panel text-foreground-subtle/50 rounded-lg text-xs font-bold tracking-widest uppercase font-mono cursor-not-allowed flex items-center justify-center"
              >
                Inactive
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* ── Professional Minimalist Footer ── */}
      <footer className="w-full border-t border-border/40 py-6 px-6 bg-background-panel/30 backdrop-blur-md z-10 text-[11px] font-sans text-foreground-subtle">
        <div className="max-w-[880px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; {new Date().getFullYear()} Unggul Axiom. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-foreground transition-colors cursor-pointer">Support</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Security</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Platform Status</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
