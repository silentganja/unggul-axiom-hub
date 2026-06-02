"use client";

import { Cpu, Terminal, Sparkles, HardDrive, ShieldCheck } from "lucide-react";

export default function InfoArchitecturePage() {
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

      {/* ASCII Architectural Flow Diagram */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm">
        <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-2">
          Data Flow Diagram
        </h3>
        <pre className="p-4 rounded border border-border/25 bg-background/80 font-mono text-[10px] sm:text-[11px] leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all shadow-inner">
{`  +-----------------------------------------------------------+
  |                   1. PRESENTATION LAYER                   |
  |  Next.js 15 Client  <===>  Zustand State  <===>  Tailwind  |
  +-----------------------------+-----------------------------+
                                |
                   Secure HTTP REST APIs / WebAuthn
                                |
                                v
  +-----------------------------------------------------------+
  |                 2. SERVICE ROUTING LAYER                  |
  |  Actix-Web (Rust)  <===>  App Middleware  <===>  Argon2id  |
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
                <td className="p-3 font-sans font-semibold text-foreground">Session Cache</td>
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
