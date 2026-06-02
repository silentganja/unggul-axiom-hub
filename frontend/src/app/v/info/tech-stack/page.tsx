"use client";

import React, { useState } from "react";
import {
  Layers,
  Lock,
  Database,
  Terminal,
  Server,
  Code2,
  Package,
  Boxes,
  Zap,
} from "lucide-react";

type TabId = "overview" | "frontend" | "backend" | "security" | "tradeoffs";

export default function TechStackPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: <Layers size={14} /> },
    { id: "frontend", label: "Frontend Stack", icon: <Code2 size={14} /> },
    { id: "backend", label: "Backend Core", icon: <Terminal size={14} /> },
    { id: "security", label: "Security & Cryptography", icon: <Lock size={14} /> },
    { id: "tradeoffs", label: "Tradeoffs & Rationale", icon: <Zap size={14} /> },
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Layers size={12} /> SECTION 13.0 : TECH STACK & DEPENDENCIES
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          System Technologies &amp; Manifest
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          The Strategic Hub runs on a optimized, high-performance web architecture combining type-safe systems programming in Rust with a fluid, reactive Next.js 16 user interface. Review the complete technology ledger below.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b border-border/10 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-t border-x rounded-t transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-background-panel/40 border-border/30 text-accent font-bold -mb-[1px]"
                : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-panel/20"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Grid summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-border/30 rounded-lg bg-background-panel/40 p-5 space-y-3 hover:border-border/60 transition-all duration-300">
                <div className="flex items-center gap-2 text-accent">
                  <Code2 size={16} />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">Frontend Architecture</span>
                </div>
                <h3 className="text-lg font-bold font-serif text-foreground">Next.js &amp; Tailwind v4</h3>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  A high-fidelity client-side interface compiled with Next.js 16, utilizing React 19 Server/Client Components, Tailwind v4 design tokens, and lightweight state management.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[9px]">
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">React 19.2.4</span>
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">Zustand 5.0.13</span>
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">React Query 5.100</span>
                </div>
              </div>

              <div className="border border-border/30 rounded-lg bg-background-panel/40 p-5 space-y-3 hover:border-border/60 transition-all duration-300">
                <div className="flex items-center gap-2 text-accent">
                  <Terminal size={16} />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">Systems Backend</span>
                </div>
                <h3 className="text-lg font-bold font-serif text-foreground">Rust &amp; Actix-Web</h3>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  An enterprise-grade, asynchronous systems server written in Rust using Actix-Web. Manages high-throughput API routing, WebAuthn sessions, and file encryption streams.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[9px]">
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">Actix-Web 4.x</span>
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">SQLx 0.8.x</span>
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">Tokio 1.x</span>
                </div>
              </div>

              <div className="border border-border/30 rounded-lg bg-background-panel/40 p-5 space-y-3 hover:border-border/60 transition-all duration-300">
                <div className="flex items-center gap-2 text-accent">
                  <Database size={16} />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider">Persistence &amp; Cache</span>
                </div>
                <h3 className="text-lg font-bold font-serif text-foreground">Postgres &amp; Redis</h3>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Relational storage backed by PostgreSQL for transactional isolation and complex document trees. Redis handles real-time sessions, token revocations, and rate limiters.
                </p>
                <div className="pt-2 flex flex-wrap gap-1.5 font-mono text-[9px]">
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">PostgreSQL 16</span>
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">Redis 7.x</span>
                  <span className="px-2 py-0.5 rounded border border-border/30 bg-background/55 text-foreground-subtle">Row Locks</span>
                </div>
              </div>
            </div>

            {/* Core Stack Architecture walkthrough */}
            <div className="border border-border/20 rounded-lg bg-background-panel/20 p-6 space-y-6">
              <h4 className="text-base font-bold text-foreground font-serif border-b border-border/10 pb-2 flex items-center gap-2">
                <Server size={16} className="text-accent" /> Full-Stack System Architecture Diagram
              </h4>
              
              {/* CSS Keyframes for animated lines */}
              <style>{`
                @keyframes flowLine {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
                .animate-flow-line {
                  stroke-dasharray: 6, 4;
                  animation: flowLine 1.5s linear infinite;
                }
              `}</style>

              {/* Desktop Aspect Ratio Canvas */}
              <div className="relative w-full max-w-[900px] aspect-[900/520] hidden md:block select-none mx-auto bg-radial-grid rounded border border-border/5 p-4">
                
                {/* SVG Connections Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 520">
                  <defs>
                    <filter id="diagram-neon" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Flow 1: Client -> Backend */}
                  <line
                    x1="500"
                    y1="130"
                    x2="500"
                    y2="210"
                    stroke="var(--color-accent, #e11d48)"
                    strokeWidth="2"
                    className="animate-flow-line"
                    style={{ filter: "url(#diagram-neon)" }}
                  />

                  {/* Flow 2: Backend -> PostgreSQL */}
                  <path
                    d="M 350 320 C 350 370, 300 360, 300 400"
                    fill="none"
                    stroke="var(--color-accent, #e11d48)"
                    strokeWidth="2"
                    className="animate-flow-line"
                    style={{ filter: "url(#diagram-neon)" }}
                  />

                  {/* Flow 3: Backend -> Redis */}
                  <path
                    d="M 650 320 C 650 370, 700 360, 700 400"
                    fill="none"
                    stroke="var(--color-accent, #e11d48)"
                    strokeWidth="2"
                    className="animate-flow-line"
                    style={{ filter: "url(#diagram-neon)" }}
                  />
                </svg>

                {/* Absolute positioned HTML Cards */}

                {/* Card 1: Client Layer */}
                <div className="absolute left-[20%] top-[3.8%] w-[60%] h-[21.1%] z-10 p-4 rounded-xl border border-border/20 bg-background-panel/40 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
                    <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Code2 size={14} className="text-accent" /> CLIENT PRESENTATION LAYER
                    </span>
                    <span className="font-mono text-[8px] text-foreground-subtle border border-border/10 px-2 py-0.5 rounded bg-background/55">Web Browser</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[9px] py-1">
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">Next.js 16 (React 19)</span>
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">Zustand State Store</span>
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">TanStack Query</span>
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">Tailwind CSS v4</span>
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">WebAuthn API</span>
                  </div>
                </div>

                {/* Label: HTTPS API */}
                <div className="absolute left-[50%] top-[32.6%] translate-x-[-50%] translate-y-[-50%] z-20 font-mono text-[9px] bg-background border border-border/20 text-foreground-subtle px-3 py-1 rounded-full shadow-md font-semibold select-none">
                  HTTP / REST (HTTPS) Secure Protocols
                </div>

                {/* Card 2: Backend Layer */}
                <div className="absolute left-[20%] top-[40.4%] w-[60%] h-[21.1%] z-10 p-4 rounded-xl border border-border/20 bg-background-panel/40 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-border/10 pb-1.5">
                    <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Server size={14} className="text-accent" /> API ROUTING &amp; SERVICES LAYER
                    </span>
                    <span className="font-mono text-[8px] text-foreground-subtle border border-border/10 px-2 py-0.5 rounded bg-background/55">Actix-Web (Rust)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 font-mono text-[9px] py-1">
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">Tokio Executor Pool</span>
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">AES-256-GCM Crypt Engine</span>
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">JWT Claims Filter</span>
                    <span className="px-2 py-0.5 rounded border border-border/10 bg-background/30 text-accent font-semibold">WebAuthn Verifier</span>
                  </div>
                </div>

                {/* Left Connector label */}
                <div className="absolute left-[30%] top-[68%] translate-x-[-50%] translate-y-[-50%] z-20 font-mono text-[8px] bg-background-panel border border-border/10 text-foreground-subtle/80 px-2 py-0.5 rounded shadow-sm">
                  SQLx Connection Pool
                </div>

                {/* Right Connector label */}
                <div className="absolute left-[70%] top-[68%] translate-x-[-50%] translate-y-[-50%] z-20 font-mono text-[8px] bg-background-panel border border-border/10 text-foreground-subtle/80 px-2 py-0.5 rounded shadow-sm">
                  redis-rs Client Protocol
                </div>

                {/* Card 3: PostgreSQL Database */}
                <div className="absolute left-[14.5%] top-[77%] w-[31%] h-[23%] z-10 p-4 rounded-xl border border-border/20 bg-background-panel/40 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 border-b border-border/10 pb-1.5 mb-1">
                    <Database size={14} className="text-accent" />
                    <span className="font-mono text-xs font-bold text-foreground uppercase">Postgres Database</span>
                  </div>
                  <p className="font-sans text-[10px] text-foreground-subtle leading-normal">
                    Manages relational schema, recursive folder nodes, governance workflows, and audit ledgers.
                  </p>
                </div>

                {/* Card 4: Redis Cache */}
                <div className="absolute left-[54.5%] top-[77%] w-[31%] h-[23%] z-10 p-4 rounded-xl border border-border/20 bg-background-panel/40 backdrop-blur-md flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 border-b border-border/10 pb-1.5 mb-1">
                    <Zap size={14} className="text-accent" />
                    <span className="font-mono text-xs font-bold text-foreground uppercase">Redis Cache Layer</span>
                  </div>
                  <p className="font-sans text-[10px] text-foreground-subtle leading-normal">
                    Sub-millisecond memory caching for JWT token blacklists, WebAuthn challenges, and rate limits.
                  </p>
                </div>
              </div>

              {/* Mobile Viewport Flowchart (flex stack) */}
              <div className="md:hidden space-y-4 font-mono text-xs select-none">
                
                {/* Client Node */}
                <div className="border border-border/20 rounded-lg bg-background-panel/40 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 text-accent">
                    <Code2 size={14} />
                    <span className="font-bold text-foreground">1. Client Viewport</span>
                  </div>
                  <p className="text-[10px] text-foreground-subtle leading-relaxed">
                    Next.js 16 • React 19 • Zustand stores • WebAuthn Browser Biometrics API
                  </p>
                </div>

                {/* Connection */}
                <div className="flex flex-col items-center">
                  <span className="h-4 w-[1px] bg-border/40" />
                  <span className="text-[8px] bg-background border border-border/10 px-2 py-0.5 rounded text-foreground-subtle">
                    HTTPS REST / API Requests
                  </span>
                  <span className="h-4 w-[1px] bg-border/40" />
                </div>

                {/* Gateway Node */}
                <div className="border border-border/20 rounded-lg bg-background-panel/40 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 text-accent">
                    <Server size={14} />
                    <span className="font-bold text-foreground">2. API Gateway (Rust)</span>
                  </div>
                  <p className="text-[10px] text-foreground-subtle leading-relaxed">
                    Actix-Web API core • Tokio execution scheduler • AES-256-GCM stream encryption
                  </p>
                </div>

                {/* Split indicator */}
                <div className="flex justify-around items-center px-4">
                  <div className="flex flex-col items-center w-1/2">
                    <span className="h-4 w-[1px] bg-border/40" />
                    <span className="text-[7px] text-foreground-subtle uppercase">SQLx Pool</span>
                    <span className="h-4 w-[1px] bg-border/40" />
                  </div>
                  <div className="flex flex-col items-center w-1/2">
                    <span className="h-4 w-[1px] bg-border/40" />
                    <span className="text-[7px] text-foreground-subtle uppercase">redis-rs KV</span>
                    <span className="h-4 w-[1px] bg-border/40" />
                  </div>
                </div>

                {/* Stack Row Postgres / Redis */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-border/20 rounded-lg bg-background-panel/40 p-3">
                    <div className="flex items-center gap-1 text-accent border-b border-border/10 pb-1 mb-1">
                      <Database size={12} />
                      <span className="font-bold text-foreground text-[10px]">3. PostgreSQL</span>
                    </div>
                    <p className="text-[9px] text-foreground-subtle leading-normal">
                      ACID transactions, tree nodes, audit.
                    </p>
                  </div>

                  <div className="border border-border/20 rounded-lg bg-background-panel/40 p-3">
                    <div className="flex items-center gap-1 text-accent border-b border-border/10 pb-1 mb-1">
                      <Zap size={12} />
                      <span className="font-bold text-foreground text-[10px]">4. Redis Cache</span>
                    </div>
                    <p className="text-[9px] text-foreground-subtle leading-normal">
                      JWT blacklists, rate limits cache.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "frontend" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/10 pb-2">
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Boxes size={14} /> Frontend Declarations (package.json)
              </span>
              <span className="font-mono text-[10px] text-foreground-subtle">29 Routes Compiled</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* NextJS */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> next
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">16.2.6</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Serves as the foundation framework. Handles static page optimization, client-side routing, compilation via Turbopack, and hydration patterns for fast initial loads.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Core Framework</span>
                  <span>Scope: Runtime Dependency</span>
                </div>
              </div>

              {/* React */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> react / react-dom
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">19.2.4</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Powers component composition. Utilizes React 19 features including async transition states, new hook APIs (`useActionState`), and deep styling compiler integration.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: View Library</span>
                  <span>Scope: Runtime Dependency</span>
                </div>
              </div>

              {/* TanStack React Query */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> @tanstack/react-query
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">^5.100.10</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Coordinates data synchronization. Manages query caching, optimistic UI updates, request retry backoff schedules, and automatic cache invalidation policies.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Server State Manager</span>
                  <span>Scope: Runtime Dependency</span>
                </div>
              </div>

              {/* Zustand */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> zustand
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">^5.0.13</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Controls client global state. Manages the transient UI states like explorer active files, mobile menu overrides, theme selections, and quick-access flags.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Client State Manager</span>
                  <span>Scope: Runtime Dependency</span>
                </div>
              </div>

              {/* Tailwind CSS */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> tailwindcss
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">^4.0.0</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Orchestrates the custom design system. Features Tailwind CSS v4, which compiled styling variables natively using lightning CSS without legacy configuration code.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Design Engine</span>
                  <span>Scope: Dev &amp; Build Dependency</span>
                </div>
              </div>

              {/* Lucide React */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> lucide-react
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">^1.16.0</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Renders crisp UI vectors. Supplies responsive icons, allowing visual elements to remain scaling-friendly across diverse density screens.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Asset Toolkit</span>
                  <span>Scope: Runtime Dependency</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "backend" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/10 pb-2">
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Boxes size={14} /> Systems Crate Manifest (Cargo.toml)
              </span>
              <span className="font-mono text-[10px] text-foreground-subtle">Native Rust compilation (Profile: Release)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Actix Web */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> actix-web
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">4.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Acts as the API router. Offers an extremely fast multi-threaded web runtime. Its strict typing ensures safe HTTP request parsing, payload limits, and middleware setups.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Web Framework</span>
                  <span>Features: multi-threaded executor</span>
                </div>
              </div>

              {/* SQLx */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> sqlx
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">0.8.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Runs database persistent operations. Operates as an asynchronous, compiled-checked SQL client. Compiles queries natively against live dev servers to verify syntax.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Relational Driver</span>
                  <span>Features: runtime-tokio-rustls, postgres</span>
                </div>
              </div>

              {/* Tokio */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> tokio
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">1.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Provides the async reactor. Manages the system event loop, disk I/O threads, networking sockets, and timer loops for scheduling tasks in background executors.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Async Runtime</span>
                  <span>Features: full (schedulers, IO, timers)</span>
                </div>
              </div>

              {/* Redis-rs */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> redis
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">0.25.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Handles session memory caching. Provides quick commands for token invalidation logs, rate limiting tokens, and temporary validation variables.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Memory Key-Value</span>
                  <span>Features: tokio-connection</span>
                </div>
              </div>

              {/* Lettre */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> lettre
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">0.11.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Manages SMTP notifications. Builds and encodes multi-part corporate emails for password resets, magic sign-in links, and classification upgrade approvals.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Mail Protocol Client</span>
                  <span>Features: tokio1-native-tls</span>
                </div>
              </div>

              {/* Serde / Serde_json */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Package size={14} className="text-accent" /> serde / serde_json
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">1.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Controls object serialization. Dynamically reads and compiles JSON schemas into safe Rust structs during API requests and database JSONB column extractions.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Compiler Serialization</span>
                  <span>Features: derive macros</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            <div className="border-b border-border/10 pb-2">
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={14} /> Encryption &amp; Cryptography Manifest
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* WebAuthn Credentials */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Lock size={14} className="text-accent" /> WebAuthn / Passkeys Engine
                  </span>
                  <span className="font-mono text-[10px] text-accent font-semibold">Browser + Backend Cryptography</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Enforces biometrics-based passwordless access. The backend verifies cryptographic public key signatures (using user authenticator challenges), protecting Rahsia classification zones without static credentials.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Hardware Authentication</span>
                  <span>Algorithm: ECDSA (P-256)</span>
                </div>
              </div>

              {/* AES-256-GCM file encryption */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Lock size={14} className="text-accent" /> aes-gcm
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">0.10.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Protects stored assets. Files are encrypted on-the-fly using 256-bit Advanced Encryption Standard in Galois/Counter Mode. Keys are derived per-user, preventing unauthorized read access at the storage disk layer.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Symmetric Encryption</span>
                  <span>Algorithm: AES-256-GCM authenticated</span>
                </div>
              </div>

              {/* Argon2 */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Lock size={14} className="text-accent" /> argon2
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">0.5.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Enforces password hashing safety. Utilizes the Argon2id variant (memory-hard, CPU-hard algorithm) to store credential hashes. Inhibits GPU-accelerated dictionary attacks.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Key Derivation Function</span>
                  <span>Variant: Argon2id (m_cost=19456, t_cost=2)</span>
                </div>
              </div>

              {/* Jsonwebtoken */}
              <div className="border border-border/20 rounded-lg bg-background-panel/30 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                    <Lock size={14} className="text-accent" /> jsonwebtoken
                  </span>
                  <span className="font-mono text-xs text-accent bg-accent-subtle/20 border border-accent/20 px-2 py-0.5 rounded">9.x</span>
                </div>
                <p className="text-xs text-foreground-subtle leading-relaxed">
                  Controls stateless API access. Issues secure tokens containing cryptographically-signed authorization claims (such as user ID, role, clearance, and active flags) to avoid excessive database overhead.
                </p>
                <div className="font-mono text-[9px] text-foreground-subtle border-t border-border/10 pt-2 flex justify-between">
                  <span>Category: Token Authentication</span>
                  <span>Algorithm: HMAC-SHA256 (HS256)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "tradeoffs" && (
          <div className="space-y-6">
            <div className="border-b border-border/10 pb-2">
              <span className="font-mono text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={14} /> Engineering Decisions &amp; Architectural Rationale
              </span>
            </div>

            <div className="space-y-6">
              {/* Decision 1: Actix-Web over Axum */}
              <div className="border border-border/20 rounded-lg bg-background-panel/40 p-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded border border-accent/20 bg-accent-subtle/30 flex items-center justify-center font-mono text-xs font-bold text-accent">1</div>
                  <h4 className="text-base font-bold font-serif text-foreground">Why Actix-Web over Axum?</h4>
                </div>
                <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
                  While Tokio&apos;s Axum has gained immense popularity due to its clean integration with Hyper and the Tower middleware ecosystem, **Actix-Web** was chosen for this enterprise showcase due to its class-leading request processing speeds and mature actor-like multi-threading system. 
                </p>
                <div className="bg-background/40 p-3 rounded border border-border/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="block font-bold text-foreground mb-1 text-xs">🚀 The Benefits:</span>
                    <ul className="list-disc pl-4 space-y-1 text-foreground-muted text-[11px]">
                      <li>Outstanding concurrency numbers under extreme resource constraints.</li>
                      <li>Highly optimized memory usage profiles.</li>
                      <li>Mature pipeline utilities for file uploads and stream encryption.</li>
                    </ul>
                  </div>
                  <div>
                    <span className="block font-bold text-foreground mb-1 text-xs">⚠️ The Tradeoffs:</span>
                    <ul className="list-disc pl-4 space-y-1 text-foreground-muted text-[11px]">
                      <li>Slightly more complex typing systems for custom extractor wrappers.</li>
                      <li>Less access to generic Tower-based middleware libraries.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Decision 2: SQLx over ORM */}
              <div className="border border-border/20 rounded-lg bg-background-panel/40 p-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded border border-accent/20 bg-accent-subtle/30 flex items-center justify-center font-mono text-xs font-bold text-accent">2</div>
                  <h4 className="text-base font-bold font-serif text-foreground">Why SQLx over a Rust ORM (Diesel/SeaORM)?</h4>
                </div>
                <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
                  Object-Relational Mapping libraries often obscure query execution, making database optimizations and table locks harder to manage. **SQLx** compiles queries against active schemas to ensure query correctness, preserving SQL autonomy.
                </p>
                <div className="bg-background/40 p-3 rounded border border-border/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="block font-bold text-foreground mb-1 text-xs">🚀 The Benefits:</span>
                    <ul className="list-disc pl-4 space-y-1 text-foreground-muted text-[11px]">
                      <li>Completely explicit transactional SQL commands.</li>
                      <li>Easy inclusion of advanced PostgreSQL concepts (like row-level locks, search vectors, and CTE queries).</li>
                      <li>Ensured type safety at compile time using offline/online metadata checks.</li>
                    </ul>
                  </div>
                  <div>
                    <span className="block font-bold text-foreground mb-1 text-xs">⚠️ The Tradeoffs:</span>
                    <ul className="list-disc pl-4 space-y-1 text-foreground-muted text-[11px]">
                      <li>Requires manual coding of queries instead of relying on generated schema structs.</li>
                      <li>Must configure active databases during compiler checks (or compile with offline cache data).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Decision 3: Zustand over Redux */}
              <div className="border border-border/20 rounded-lg bg-background-panel/40 p-6 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded border border-accent/20 bg-accent-subtle/30 flex items-center justify-center font-mono text-xs font-bold text-accent">3</div>
                  <h4 className="text-base font-bold font-serif text-foreground">Why Zustand over Redux Toolkit?</h4>
                </div>
                <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
                  Modern client states are relatively minimal. **Zustand** provides a lightweight, hook-centric store without heavy action creators, reducing boilerplate and compilation weight.
                </p>
                <div className="bg-background/40 p-3 rounded border border-border/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  <div>
                    <span className="block font-bold text-foreground mb-1 text-xs">🚀 The Benefits:</span>
                    <ul className="list-disc pl-4 space-y-1 text-foreground-muted text-[11px]">
                      <li>Extremely small footprint (~1KB minified).</li>
                      <li>Zero provider components needed (no React context re-render problems).</li>
                      <li>Clean, simple API structure.</li>
                    </ul>
                  </div>
                  <div>
                    <span className="block font-bold text-foreground mb-1 text-xs">⚠️ The Tradeoffs:</span>
                    <ul className="list-disc pl-4 space-y-1 text-foreground-muted text-[11px]">
                      <li>Lacks strict standard developer guidelines found in massive team Redux codebases.</li>
                      <li>Less advanced tooling integrations (like the browser time-travel debugger).</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
