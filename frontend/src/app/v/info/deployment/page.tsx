"use client";

import { Terminal, ShieldAlert, Cpu, Layers } from "lucide-react";

export default function InfoDeploymentPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Terminal size={12} /> SECTION 6.0 : DEVOPS AND DEPLOYMENT
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Deployment &amp; Infrastructure Operations
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          Understanding the packaging pipelines, host isolation mechanisms, secure networking boundaries, and cookie controls running in the production environment.
        </p>
      </div>

      {/* DevOps Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Docker Multistage Build */}
        <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm hover:border-border/60 transition-all duration-300">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center">
              <Layers className="text-accent" size={16} />
            </div>
            <h3 className="font-bold font-serif text-base text-accent">1. Multi-Stage Containerization</h3>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            <p>
              To optimize deployment speed and security boundaries, both codebases utilize advanced multi-stage Docker builds:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-foreground-muted text-[11px] sm:text-xs">
              <li>
                <strong>Frontend Standalone Build:</strong> The Next.js runner copies only the pre-compiled `.next/standalone` node assets. This slices the runtime container footprint from over 1.2GB down to approximately 140MB, improving server memory utilization.
              </li>
              <li>
                <strong>Backend Dependency Caching:</strong> The Rust compiler caches crates registry indexing during build stages. The actual source code compilation runs on top of pre-compiled cache layers, shrinking deploy pipeline times.
              </li>
            </ul>
          </div>
        </div>

        {/* Host Isolation */}
        <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm hover:border-border/60 transition-all duration-300">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center">
              <ShieldAlert className="text-accent" size={16} />
            </div>
            <h3 className="font-bold font-serif text-base text-accent">2. Sandbox Host Isolation</h3>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            <p>
              Enforcing privilege limitation is critical to protect the host machine from container breakout exploits:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-foreground-muted text-[11px] sm:text-xs">
              <li>
                <strong>Non-Root Execution:</strong> Frontend processes run under an unprivileged `nextjs` system user, while the Rust backend server runs under the `axiom` shell execution user. No container process runs with root privileges.
              </li>
              <li>
                <strong>Distroless Slim Runners:</strong> The Rust production runner runs inside a minimal `debian:bookworm-slim` base, eliminating unnecessary tools, package managers, and binaries. This reduces the container attack surface.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Network Security and Header Policies */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center">
            <Cpu className="text-accent" size={16} />
          </div>
          <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest border-b border-border/20 pb-1.5 w-full">
            Network Headers &amp; State Policies
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm font-sans text-foreground-subtle leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-bold text-foreground font-serif text-base">Strict HTTP Headers</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              The Next.js reverse proxy automatically injects security headers to defend the client space. Frame embedding is blocked with `X-Frame-Options: DENY` to stop clickjacking, content sniffing is restricted with `X-Content-Type-Options: nosniff`, and Referrer-Policy enforces strict origin limits.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-foreground font-serif text-base">Secure Cookie Parameters</h4>
            <p className="text-foreground-muted text-xs sm:text-sm">
              Sessions are maintained using JSON Web Tokens transmitted inside HttpOnly cookies. This blocks client-side JavaScript from accessing session data, protecting against XSS exploits. SameSite=Strict cookies protect the platform from Cross-Site Request Forgery (CSRF) vectors.
            </p>
          </div>
        </div>
      </div>

      {/* Relying Party ID Constraints */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm hover:border-border/60 transition-all duration-300">
        <h4 className="font-bold text-foreground font-serif text-base">WebAuthn Relying Party ID Constraints</h4>
        <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
          To prevent credential replay and machine-in-the-middle authentication relays on biometrics, the WebAuthn API enforces relying party checks. Handshake parameters are statically bound to the Relying Party ID (rpId: &quot;hub.unggulaxiom.com&quot;). The browser validates that the active origin matches this signature registry before allowing Face ID or fingerprint checks to release credential assertions.
        </p>
      </div>
    </div>
  );
}
