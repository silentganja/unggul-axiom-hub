"use client";

import React, { useState } from "react";
import {
  Layers,
  Cpu,
  Lock,
  Database,
  Terminal,
  Server,
  Code2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Package,
  Boxes,
  Zap,
  ArrowRight,
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
            <div className="border border-border/20 rounded-lg bg-background-panel/20 p-6 space-y-4">
              <h4 className="text-base font-bold text-foreground font-serif border-b border-border/10 pb-2 flex items-center gap-2">
                <Server size={16} className="text-accent" /> Full-Stack System Architecture Diagram
              </h4>
              <div className="font-mono text-xs leading-relaxed space-y-2 p-4 rounded border border-border/10 bg-background/60 overflow-x-auto whitespace-pre">
{`+-----------------------------------------------------------------------------------+
|                              CLIENT VIEWPORT (WEB BROWSER)                         |
|  - Next.js 16 (React 19, TS)    - Tailwind CSS v4 Styling   - Zustand (Store)     |
|  - WebAuthn Biometrics API      - TanStack React Query      - Lucide Vector Icons |
+-----------------------------------------------------------------------------------+
                                         |
                                         | HTTP / REST (HTTPS)
                                         v
+-----------------------------------------------------------------------------------+
|                           ACTIX-WEB BACKEND SERVICES (RUST)                        |
|  - Multi-threaded Executor (Tokio)    - AES-256-GCM Storage Encryption engine     |
|  - WebAuthn Authentication Engine     - JWT Validation & Claims Check             |
+-----------------------------------------------------------------------------------+
                     |                                           |
    SQLQueries (SQLx)|                                           | Redis Cmd (redis-rs)
                     v                                           v
+---------------------------------------+   +---------------------------------------+
|          POSTGRESQL PERSISTENCE       |   |             REDIS CACHE LAYER         |
|  - Relational Schema & Constraints    |   |  - Active Session Tokens (Blacklist)  |
|  - Governance Queues & File Trees     |   |  - API Request Rate Limit Caching     |
|  - Compliance Ledger (Audit Logs)     |   |  - Real-time Session Registry         |
+---------------------------------------+   +---------------------------------------+`}
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
                  While Tokio's Axum has gained immense popularity due to its clean integration with Hyper and the Tower middleware ecosystem, **Actix-Web** was chosen for this enterprise showcase due to its class-leading request processing speeds and mature actor-like multi-threading system. 
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
