"use client";

import { Cpu, Terminal, Sparkles, HardDrive, ShieldCheck } from "lucide-react";

export default function InfoArchitecturePage() {
  const layers = [
    {
      title: "1. Client & Presentation Layer",
      icon: <Terminal size={14} className="text-accent" />,
      desc: "Built with Next.js App Router and TypeScript. Uses Zustand for lightweight global state (managing files, views, notifications, and auth context), Tailwind CSS for styled layout panels, and Lucide icons.",
    },
    {
      title: "2. API Routing & Services Gateway",
      icon: <Cpu size={14} className="text-accent" />,
      desc: "An Actix-Web Rust microservice. Leverages type-safe web extractors for JSON bodies, path variables, query strings, and custom Actix middlewares to enforce security rating policies and session authentication.",
    },
    {
      title: "3. Cache & Session Storage",
      icon: <ShieldCheck size={14} className="text-accent" />,
      desc: "Redis handles short-lived operations: blacklisting invalid JSON Web Tokens, storing WebAuthn challenge states, and caching frequently loaded file counts.",
    },
    {
      title: "4. Database Persistence Layer",
      icon: <HardDrive size={14} className="text-accent" />,
      desc: "A PostgreSQL database handles all structural data. Integrated with asynchronous connection pooling via SQLx, keeping CRUD operations fast and memory footprint low.",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Cpu size={10} /> SECTION 2.0 — SYSTEM ARCHITECTURE
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          Tech Stack &amp; Infrastructure
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The Strategic Hub follows a decoupling architectural design pattern. The Next.js frontend delivers a static client bundle that handles routing and state, communicating with the backend purely through a REST API.
        </p>
      </div>

      {/* ASCII Architectural Flow Diagram */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Data Flow Diagram
        </h3>
        <pre className="p-4 rounded border border-border/25 bg-background/80 font-mono text-[8px] sm:text-[9px] leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all">
{`  +-----------------------------------------------------------+
  |                   1. PRESENTATION LAYER                   |
  |  Next.js 15 Client  <--->  Zustand State  <--->  Tailwind  |
  +-----------------------------+-----------------------------+
                                |
                   Secure HTTP REST APIs / WebAuthn
                                |
                                v
  +-----------------------------------------------------------+
  |                 2. SERVICE ROUTING LAYER                  |
  |  Actix-Web (Rust)  <--->  App Middleware  <--->  Argon2id  |
  +----------------------+----------------------+-------------+
                         |                      |
                 Asynchronous SQLx          Redis API
                         |                      |
                         v                      v
  +------------------------------+     +----------------------+
  |     4. PERSISTENCE LAYER     |     |    3. CACHE LAYER    |
  |  PostgreSQL Database Engine  |     |  Redis Cache / JWT   |
  +------------------------------+     +----------------------+`}
        </pre>
      </div>

      {/* Layer Description List */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Architectural Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {layers.map((layer) => (
            <div key={layer.title} className="border border-border/30 rounded bg-background-panel/30 p-4 space-y-2">
              <div className="flex items-center gap-2">
                {layer.icon}
                <h4 className="text-xs font-bold font-serif text-foreground">{layer.title}</h4>
              </div>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                {layer.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Stack Table */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Technology Selection Matrix
        </h3>
        <div className="border border-border/25 rounded overflow-hidden">
          <table className="w-full text-left font-mono text-[10px] border-collapse">
            <thead>
              <tr className="bg-background-panel/60 border-b border-border/20 text-foreground-subtle select-none text-[8px] uppercase tracking-wider">
                <th className="p-2.5">Component</th>
                <th className="p-2.5">Tech Choice</th>
                <th className="p-2.5">Primary Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 text-[10px]">
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-2.5 font-sans font-semibold text-foreground">API Server</td>
                <td className="p-2.5 text-accent font-bold">Rust (Actix-Web)</td>
                <td className="p-2.5 text-foreground-subtle font-sans leading-relaxed">System level thread safety, memory efficiency, zero-overhead compile checks.</td>
              </tr>
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-2.5 font-sans font-semibold text-foreground">Relational DB</td>
                <td className="p-2.5 text-accent font-bold">PostgreSQL</td>
                <td className="p-2.5 text-foreground-subtle font-sans leading-relaxed">Foreign keys, atomic constraints, support for JSONB metadata types.</td>
              </tr>
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-2.5 font-sans font-semibold text-foreground">DB Driver</td>
                <td className="p-2.5 text-accent font-bold">SQLx</td>
                <td className="p-2.5 text-foreground-subtle font-sans leading-relaxed">100% async, compile-time SQL query validation and type-safety.</td>
              </tr>
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-2.5 font-sans font-semibold text-foreground">Session Cache</td>
                <td className="p-2.5 text-accent font-bold">Redis</td>
                <td className="p-2.5 text-foreground-subtle font-sans leading-relaxed">Sub-millisecond data retrieval for token blacklist and WebAuthn challenges.</td>
              </tr>
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-2.5 font-sans font-semibold text-foreground">Web Client</td>
                <td className="p-2.5 text-accent font-bold">Next.js App Router</td>
                <td className="p-2.5 text-foreground-subtle font-sans leading-relaxed">Dynamic routing, optimized server/client components split, Turbopack compiling.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
