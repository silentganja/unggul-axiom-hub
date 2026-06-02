"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shield,
  Layers,
  Cpu,
  Lock,
  Database,
  Menu,
  X,
  Code,
  Terminal,
  Play,
  LineChart,
  Settings,
  Flame,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/v/info", label: "1. Overview & Context", icon: <Layers size={14} /> },
    { href: "/v/info/architecture", label: "2. System Architecture", icon: <Cpu size={14} /> },
    { href: "/v/info/features", label: "3. Features & Code", icon: <Code size={14} /> },
    { href: "/v/info/security", label: "4. Access & Governance", icon: <Lock size={14} /> },
    { href: "/v/info/database", label: "5. Database Schema", icon: <Database size={14} /> },
    { href: "/v/info/deployment", label: "6. DevOps & Deployment", icon: <Terminal size={14} /> },
    { href: "/v/info/simulation", label: "7. System Simulation", icon: <Play size={14} /> },
    { href: "/v/info/telemetry", label: "8. Observability & Logs", icon: <LineChart size={14} /> },
    { href: "/v/info/database-ops", label: "9. Database Operations", icon: <Settings size={14} /> },
    { href: "/v/info/benchmarks", label: "10. Performance Benchmarks", icon: <Flame size={14} /> },
    { href: "/v/info/api-reference", label: "11. API Specification", icon: <BookOpen size={14} /> },
    { href: "/v/info/hardening", label: "12. Production Hardening", icon: <ShieldCheck size={14} /> },
  ];

  return (
    <div className="min-h-dvh bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground relative flex flex-col">
      {/* Background Gradients (Optimized for Mobile) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[45%] h-[45%] rounded-full bg-accent/5 blur-[120px] hidden md:block" />
        <div className="absolute top-[45%] right-[5%] w-[40%] h-[40%] rounded-full bg-info/5 blur-[130px] hidden md:block" />
        <div className="absolute inset-0 scan-grid opacity-[0.015] dark:opacity-[0.03]" />
      </div>

      {/* Global Header */}
      <header className="relative z-20 flex h-14 items-center justify-between border-b border-border/20 bg-background-panel/40 backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="h-8 w-8 flex items-center justify-center rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
            title="Return to Main Portal Gateway"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground font-serif">
              Strategic Hub Specification
            </h1>
            <p className="font-mono text-[8px] text-foreground-subtle tracking-wider uppercase">
              Technical Portfolio Showcase
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground lg:hidden cursor-pointer"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Workspace Wrapper */}
      <div className="flex-1 flex relative z-10">
        {/* Sidebar Nav - Desktop */}
        <aside className="w-64 border-r border-border/20 bg-background-panel/20 backdrop-blur-sm hidden lg:block shrink-0 p-4 space-y-4">
          <div className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest px-3">
            System Chapters
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded border transition-all",
                  pathname === item.href
                    ? "bg-accent-subtle/30 border-accent/30 text-accent font-extrabold"
                    : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-panel/40"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="pt-4 border-t border-border/10 mt-4">
            <div className="p-3 rounded border border-border/20 bg-background-panel/20 space-y-2 text-[10px] font-mono text-foreground-subtle">
              <div className="flex items-center gap-1.5 text-foreground font-semibold">
                <Shield size={12} className="text-accent" />
                <span>Showcase Sandbox</span>
              </div>
              <p className="leading-relaxed">
                This environment displays the developer portfolio explaining full system mechanics, codebase layers, schemas, and security integrations.
              </p>
            </div>
          </div>
        </aside>

        {/* Sidebar Nav - Mobile Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 top-14 z-30 flex lg:hidden animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            
            {/* Menu Panel */}
            <aside className="relative w-64 border-r border-border/20 bg-background-panel/95 p-4 space-y-4 flex flex-col justify-between animate-in slide-in-from-left duration-200">
              <div className="space-y-4">
                <div className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest px-3">
                  System Chapters
                </div>
                <nav className="space-y-1" onClick={() => setMobileMenuOpen(false)}>
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded border transition-all",
                        pathname === item.href
                          ? "bg-accent-subtle/30 border-accent/30 text-accent font-extrabold"
                          : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-panel/40"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="p-3 rounded border border-border/20 bg-background/30 text-[10px] font-mono text-foreground-subtle">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Shield size={12} className="text-accent" />
                  <span>Portfolio Sandbox</span>
                </div>
                <p className="leading-relaxed mt-1">
                  Full stack specifications and technical design details mapping out the complete corporate dashboard ecosystem.
                </p>
              </div>
            </aside>
          </div>
        )}

        {/* Reading Viewport */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:p-8 flex flex-col justify-between min-w-0">
          <div className="max-w-7xl w-full">
            {children}
          </div>

          {/* Footer ticker */}
          <footer className="w-full max-w-7xl border-t border-border/10 pt-6 mt-12 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground-subtle select-none">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span>PORTFOLIO TECHNICAL REVIEW</span>
            </div>
            <div className="flex items-center gap-4">
              <span>SPECIFICATION VERSION 1.0.0</span>
              <span className="hidden sm:inline text-foreground-subtle/30">|</span>
              <span className="hidden sm:inline">DEVELOPER CONTEXT</span>
            </div>
            <span className="flex items-center gap-1">
              <Code size={11} className="text-accent" /> FULL-STACK IMPLEMENTATION
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
