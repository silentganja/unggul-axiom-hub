"use client";

import React, { useState } from "react";
import { Cpu, Terminal, HardDrive, ShieldCheck } from "lucide-react";

export default function InfoArchitecturePage() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const layers = [
    {
      title: "1. Client & Presentation Layer",
      icon: <Terminal size={16} className="text-accent" />,
      desc: "Built with Next.js App Router and TypeScript. Uses Zustand for lightweight global state (managing files, views, notifications, and auth context), Tailwind CSS for styled layout panels, and Lucide icons.",
    },
    {
      title: "2. API Routing & Services Gateway",
      icon: <Cpu size={16} className="text-accent" />,
      desc: "An Actix-Web Rust microservice. Leverages type-safe web extractors for JSON bodies, path variables, query strings, and custom Actix middlewares to enforce security rating policies and session authentication.",
    },
    {
      title: "3. Cache & Session Storage",
      icon: <ShieldCheck size={16} className="text-accent" />,
      desc: "Redis handles short-lived operations: blacklisting invalid JSON Web Tokens, storing WebAuthn challenge states, and caching frequently loaded file counts.",
    },
    {
      title: "4. Database Persistence Layer",
      icon: <HardDrive size={16} className="text-accent" />,
      desc: "A PostgreSQL database handles all structural data. Integrated with asynchronous connection pooling via SQLx, keeping CRUD operations fast and memory footprint low.",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Cpu size={12} /> SECTION 2.0 : SYSTEM ARCHITECTURE
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Tech Stack &amp; Infrastructure
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          The Strategic Hub follows a decoupling architectural design pattern. The Next.js frontend delivers a static client bundle that handles routing and state, communicating with the backend purely through a REST API.
        </p>
      </div>

      {/* Engineering Design Decisions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-border/20 rounded-lg p-5 bg-background-panel/20 space-y-2">
          <h4 className="font-bold text-foreground font-serif text-sm">Compiled System Efficiency</h4>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            Actix-Web (Rust) compiles directly to machine code, achieving 100k+ concurrent requests per second with less than 50MB idle RAM. This significantly reduces server hosting overhead and guarantees execution safety.
          </p>
        </div>

        <div className="border border-border/20 rounded-lg p-5 bg-background-panel/20 space-y-2">
          <h4 className="font-bold text-foreground font-serif text-sm">DB Query Compile Safety</h4>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            SQLx validates all database queries against the PostgreSQL schema at compile time. This ensures syntax errors or table mismatches never reach runtime environments, stabilizing production deployments.
          </p>
        </div>

        <div className="border border-border/20 rounded-lg p-5 bg-background-panel/20 space-y-2">
          <h4 className="font-bold text-foreground font-serif text-sm">In-Memory Token Caching</h4>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            Redis caches blacklisted session tokens and WebAuthn challenges. Checking blacklist state in memory takes under 1 millisecond, preventing database query bloat on every incoming API request.
          </p>
        </div>
      </div>

      {/* Interactive Data Flow Diagram */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/20 pb-2">
          <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest">
            Data Flow Diagram
          </h3>
          <span className="font-mono text-[9px] text-foreground-subtle/80 hidden sm:inline">
            Interactive Architecture Map • Hover nodes to highlight routing
          </span>
        </div>

        {/* Desktop Viewport Canvas */}
        <div className="relative w-full max-w-[900px] aspect-[900/400] hidden md:block select-none mx-auto bg-radial-grid rounded border border-border/5 p-4">
          
          {/* SVG Connector Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 400">
            <defs>
              <filter id="diagram-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Path 1: Client -> Server */}
            <path
              d="M 500 110 L 500 170"
              fill="none"
              stroke={activeNode === "presentation" || activeNode === "routing" ? "var(--color-accent, #e11d48)" : "currentColor"}
              strokeWidth={activeNode === "presentation" || activeNode === "routing" ? 2.5 : 1}
              className={`transition-all duration-300 ${
                activeNode === "presentation" || activeNode === "routing" ? "text-accent filter drop-shadow-[0_0_3px_rgba(225,29,72,0.5)]" : "text-border/30"
              }`}
              style={activeNode === "presentation" || activeNode === "routing" ? { filter: "url(#diagram-glow)" } : undefined}
            />

            {/* Path 2: Server -> Cache */}
            <path
              d="M 500 260 C 500 285, 280 270, 280 290"
              fill="none"
              stroke={activeNode === "routing" || activeNode === "cache" ? "var(--color-accent, #e11d48)" : "currentColor"}
              strokeWidth={activeNode === "routing" || activeNode === "cache" ? 2.5 : 1}
              className={`transition-all duration-300 ${
                activeNode === "routing" || activeNode === "cache" ? "text-accent filter drop-shadow-[0_0_3px_rgba(225,29,72,0.5)]" : "text-border/30"
              }`}
              style={activeNode === "routing" || activeNode === "cache" ? { filter: "url(#diagram-glow)" } : undefined}
            />

            {/* Path 3: Server -> DB */}
            <path
              d="M 500 260 C 500 285, 720 270, 720 290"
              fill="none"
              stroke={activeNode === "routing" || activeNode === "db" ? "var(--color-accent, #e11d48)" : "currentColor"}
              strokeWidth={activeNode === "routing" || activeNode === "db" ? 2.5 : 1}
              className={`transition-all duration-300 ${
                activeNode === "routing" || activeNode === "db" ? "text-accent filter drop-shadow-[0_0_3px_rgba(225,29,72,0.5)]" : "text-border/30"
              }`}
              style={activeNode === "routing" || activeNode === "db" ? { filter: "url(#diagram-glow)" } : undefined}
            />
          </svg>

          {/* Absolute HTML Cards */}
          
          {/* Card 1: Presentation Layer */}
          <div
            onMouseEnter={() => setActiveNode("presentation")}
            onMouseLeave={() => setActiveNode(null)}
            className={`absolute left-[35%] top-[5%] w-[30%] h-[22.5%] z-10 p-3 rounded-lg border transition-all duration-300 flex flex-col justify-center cursor-pointer ${
              activeNode === "presentation"
                ? "bg-background-panel border-accent shadow-[0_0_10px_rgba(225,29,72,0.2)] scale-[1.01]"
                : "bg-background-panel/40 border-border/20"
            }`}
          >
            <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 mb-1.5">
              <Terminal size={14} className={activeNode === "presentation" ? "text-accent" : "text-foreground-subtle"} />
              <span className="font-mono text-xs font-bold text-foreground">1. Presentation Layer</span>
            </div>
            <p className="font-mono text-[9px] text-foreground-subtle leading-tight">
              Next.js 16 Client Bundle • React 19 • Zustand UI Stores • Tailwind CSS v4 styling
            </p>
          </div>

          {/* Middle label: HTTPS REST */}
          <div className={`absolute left-[50%] top-[34%] translate-x-[-50%] translate-y-[-50%] z-20 font-mono text-[9px] px-2 py-0.5 rounded border transition-all duration-300 select-none ${
            activeNode === "presentation" || activeNode === "routing"
              ? "bg-accent-subtle/20 border-accent/30 text-accent font-semibold"
              : "bg-background-panel border-border/10 text-foreground-subtle"
          }`}>
            HTTPS REST API / WebAuthn
          </div>

          {/* Card 2: Service Routing Layer */}
          <div
            onMouseEnter={() => setActiveNode("routing")}
            onMouseLeave={() => setActiveNode(null)}
            className={`absolute left-[35%] top-[42.5%] w-[30%] h-[22.5%] z-10 p-3 rounded-lg border transition-all duration-300 flex flex-col justify-center cursor-pointer ${
              activeNode === "routing"
                ? "bg-background-panel border-accent shadow-[0_0_10px_rgba(225,29,72,0.2)] scale-[1.01]"
                : "bg-background-panel/40 border-border/20"
            }`}
          >
            <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 mb-1.5">
              <Cpu size={14} className={activeNode === "routing" ? "text-accent" : "text-foreground-subtle"} />
              <span className="font-mono text-xs font-bold text-foreground">2. Service Gateway Layer</span>
            </div>
            <p className="font-mono text-[9px] text-foreground-subtle leading-tight">
              Actix-Web (Rust) • Multi-threaded Tokio Event Loop • Security verification middleware
            </p>
          </div>

          {/* Connection Labels left / right */}
          <div className={`absolute left-[34%] top-[70%] translate-x-[-50%] translate-y-[-50%] z-20 font-mono text-[8px] px-1.5 py-0.5 rounded border transition-all duration-300 ${
            activeNode === "routing" || activeNode === "cache"
              ? "bg-accent-subtle/20 border-accent/20 text-accent font-semibold"
              : "bg-background-panel border-border/5 text-foreground-subtle/70"
          }`}>
            In-Memory Cache
          </div>

          <div className={`absolute left-[66%] top-[70%] translate-x-[-50%] translate-y-[-50%] z-20 font-mono text-[8px] px-1.5 py-0.5 rounded border transition-all duration-300 ${
            activeNode === "routing" || activeNode === "db"
              ? "bg-accent-subtle/20 border-accent/20 text-accent font-semibold"
              : "bg-background-panel border-border/5 text-foreground-subtle/70"
          }`}>
            SQLx Connection Pool
          </div>

          {/* Card 3: Cache Layer */}
          <div
            onMouseEnter={() => setActiveNode("cache")}
            onMouseLeave={() => setActiveNode(null)}
            className={`absolute left-[12.5%] top-[72.5%] w-[31%] h-[22.5%] z-10 p-3 rounded-lg border transition-all duration-300 flex flex-col justify-center cursor-pointer ${
              activeNode === "cache"
                ? "bg-background-panel border-accent shadow-[0_0_10px_rgba(225,29,72,0.2)] scale-[1.01]"
                : "bg-background-panel/40 border-border/20"
            }`}
          >
            <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 mb-1.5">
              <ShieldCheck size={14} className={activeNode === "cache" ? "text-accent" : "text-foreground-subtle"} />
              <span className="font-mono text-xs font-bold text-foreground">3. Cache &amp; Session Store</span>
            </div>
            <p className="font-mono text-[9px] text-foreground-subtle leading-tight">
              Redis KV • JWT Blacklist • WebAuthn challenges state • API Rate limiters
            </p>
          </div>

          {/* Card 4: Database Layer */}
          <div
            onMouseEnter={() => setActiveNode("db")}
            onMouseLeave={() => setActiveNode(null)}
            className={`absolute left-[56.5%] top-[72.5%] w-[31%] h-[22.5%] z-10 p-3 rounded-lg border transition-all duration-300 flex flex-col justify-center cursor-pointer ${
              activeNode === "db"
                ? "bg-background-panel border-accent shadow-[0_0_10px_rgba(225,29,72,0.2)] scale-[1.01]"
                : "bg-background-panel/40 border-border/20"
            }`}
          >
            <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 mb-1.5">
              <HardDrive size={14} className={activeNode === "db" ? "text-accent" : "text-foreground-subtle"} />
              <span className="font-mono text-xs font-bold text-foreground">4. Persistence Database</span>
            </div>
            <p className="font-mono text-[9px] text-foreground-subtle leading-tight">
              PostgreSQL Relational DB • Parametrised Query Isolation • Hierarchical document model
            </p>
          </div>
        </div>

        {/* Mobile Viewport Flowchart (flex stack) */}
        <div className="md:hidden space-y-4 font-mono text-xs select-none">
          {/* Card 1 */}
          <div className="border border-border/20 rounded-lg bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 text-accent">
              <Terminal size={14} />
              <span className="font-bold text-foreground">1. Presentation Layer</span>
            </div>
            <p className="text-[10px] text-foreground-subtle leading-normal">
              Next.js 16 Client Bundle • React 19 • Zustand Stores • Tailwind CSS v4 styling
            </p>
          </div>

          {/* Arrow indicator */}
          <div className="flex flex-col items-center">
            <span className="h-4 w-[1px] bg-border/40" />
            <span className="text-[8px] bg-background-panel px-2 py-0.5 border border-border/10 rounded text-foreground-subtle font-mono my-0.5">
              HTTPS REST API / WebAuthn
            </span>
            <span className="h-4 w-[1px] bg-border/40" />
          </div>

          {/* Card 2 */}
          <div className="border border-border/20 rounded-lg bg-background-panel/40 p-4 space-y-2">
            <div className="flex items-center gap-1.5 border-b border-border/10 pb-1 text-accent">
              <Cpu size={14} />
              <span className="font-bold text-foreground">2. Service Gateway Layer</span>
            </div>
            <p className="text-[10px] text-foreground-subtle leading-normal">
              Actix-Web (Rust) • Tokio multi-threaded reactor • Security verification middleware
            </p>
          </div>

          {/* Connector Split */}
          <div className="flex justify-around items-center px-6">
            <div className="flex flex-col items-center w-1/3">
              <span className="h-4 w-[1px] bg-border/40" />
              <span className="text-[8px] text-foreground-subtle my-0.5 uppercase">Cache API</span>
              <span className="h-4 w-[1px] bg-border/40" />
            </div>
            <div className="flex flex-col items-center w-1/3">
              <span className="h-4 w-[1px] bg-border/40" />
              <span className="text-[8px] text-foreground-subtle my-0.5 uppercase">SQL Pool</span>
              <span className="h-4 w-[1px] bg-border/40" />
            </div>
          </div>

          {/* Bottom Row side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cache */}
            <div className="border border-border/20 rounded-lg bg-background-panel/40 p-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-accent">
                  <ShieldCheck size={12} />
                  <span className="font-bold text-foreground text-[11px]">3. Cache Layer</span>
                </div>
                <p className="text-[9px] text-foreground-subtle leading-relaxed">
                  Redis KV Cache • JWT Blacklist • rate limits
                </p>
              </div>
            </div>

            {/* DB */}
            <div className="border border-border/20 rounded-lg bg-background-panel/40 p-3 flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-accent">
                  <HardDrive size={12} />
                  <span className="font-bold text-foreground text-[11px]">4. Database</span>
                </div>
                <p className="text-[9px] text-foreground-subtle leading-relaxed">
                  PostgreSQL • Parameterized queries • locks
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Request Path Explanation */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm hover:border-border/60 transition-all duration-300">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Request Lifecycle and Execution
        </h3>
        <div className="space-y-4 text-sm font-sans text-foreground-subtle leading-relaxed">
          <p className="text-sm sm:text-base text-foreground-muted">
            When a user logs in, uploads a document, or approves a file movement request, the operation follows a strict transactional pathway:
          </p>
          <ul className="list-decimal pl-5 space-y-3 text-xs sm:text-sm">
            <li>
              <strong>Client Dispatch:</strong> The Next.js client dispatches an asynchronous fetch payload. Zustand stores maintain user context, loading animations, and file tree updates reactively.
            </li>
            <li>
              <strong>Route Verification:</strong> The Actix-Web backend parses the HTTP Request. Middleware queries the Redis cache to check if the incoming authorization token is blacklisted, verifying caller identity.
            </li>
            <li>
              <strong>Query Execution:</strong> The backend acquires a database handle from the SQLx PostgreSQL connection pool. It executes parameterized queries, protecting the platform from SQL injection vectors.
            </li>
            <li>
              <strong>Audit and Feedback:</strong> Upon database execution, a separate audit log task is written asynchronously. The backend server returns a standardized JSON structure, updating the client workspace store.
            </li>
          </ul>
        </div>
      </div>

      {/* Layer Description List */}
      <div className="space-y-4">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Architectural Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {layers.map((layer) => (
            <div key={layer.title} className="border border-border/30 rounded-lg bg-background-panel/20 p-5 space-y-2 hover:border-accent/30 transition-all duration-300 shadow-sm">
              <div className="flex items-center gap-2">
                {layer.icon}
                <h4 className="text-sm font-bold font-serif text-foreground">{layer.title}</h4>
              </div>
              <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed font-sans">
                {layer.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Technology Stack Table */}
      <div className="space-y-4">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Technology Selection Matrix
        </h3>
        <div className="border border-border/25 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-background-panel/60 border-b border-border/20 text-foreground-subtle select-none text-[9px] uppercase tracking-wider">
                <th className="p-3">Component</th>
                <th className="p-3">Tech Choice</th>
                <th className="p-3">Primary Benefit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10 text-xs sm:text-sm">
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-3 font-sans font-semibold text-foreground">API Server</td>
                <td className="p-3 text-accent font-bold">Rust (Actix-Web)</td>
                <td className="p-3 text-foreground-subtle font-sans leading-relaxed">System level thread safety, memory efficiency, zero-overhead compile checks.</td>
              </tr>
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-3 font-sans font-semibold text-foreground">Relational DB</td>
                <td className="p-3 text-accent font-bold">PostgreSQL</td>
                <td className="p-3 text-foreground-subtle font-sans leading-relaxed">Foreign keys, atomic constraints, support for JSONB metadata types.</td>
              </tr>
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-3 font-sans font-semibold text-foreground">DB Driver</td>
                <td className="p-3 text-accent font-bold">SQLx</td>
                <td className="p-3 text-foreground-subtle font-sans leading-relaxed">100% async, compile-time SQL query validation and type-safety.</td>
              </tr>
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-3 text-accent font-bold">Session Cache</td>
                <td className="p-3 text-accent font-bold">Redis</td>
                <td className="p-3 text-foreground-subtle font-sans leading-relaxed">Sub-millisecond data retrieval for token blacklist and WebAuthn challenges.</td>
              </tr>
              <tr className="hover:bg-background-panel/20 transition-colors">
                <td className="p-3 font-sans font-semibold text-foreground">Web Client</td>
                <td className="p-3 text-accent font-bold">Next.js App Router</td>
                <td className="p-3 text-foreground-subtle font-sans leading-relaxed">Dynamic routing, optimized server/client components split, Turbopack compiling.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
