"use client";

import { useState, useId, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Shield, AlertCircle, Loader2, Fingerprint, Key, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

/* ── Demo credentials ── */
const DEMO_EMAIL = "admin@unggul.axiom";
const DEMO_PASSWORD = "axiom2026";

function LoginForm() {
  const emailId = useId();
  const passwordId = useId();
  const searchParams = useSearchParams();
  const portal = searchParams?.get("portal");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    await new Promise((r) => setTimeout(r, 1200));

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      window.location.href = "/dashboard";
    } else {
      setError("Authentication failed. Verify your credentials and try again.");
    }
    setIsLoading(false);
  };

  const isChiefPortal = portal === "chief" || portal === "foundation";

  return (
    <div className="relative min-h-dvh flex flex-col lg:grid lg:grid-cols-12 bg-background overflow-hidden selection:bg-accent selection:text-accent-foreground">
      
      {/* ── Background Aesthetics (Ambient Glow Elements) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-accent/10 blur-[130px] ambient-glow-1" />
        <div className="absolute top-[25%] -right-[15%] w-[45%] h-[45%] rounded-full bg-info/5 blur-[120px] ambient-glow-2" />
        <div className="absolute inset-0 scan-grid opacity-[0.01] dark:opacity-[0.02]" />
      </div>

      {/* ── Left Side Panel: Unified Hub Portals Showcase (Desktop Only) ── */}
      <section className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-16 overflow-hidden border-r border-border/20 z-10 bg-background">
        
        {/* Brand block header */}
        <Link href="/" className="flex items-center gap-3 w-fit group">
          <div className="flex h-8 w-8 items-center justify-center rounded border border-accent/20 bg-accent-subtle/50 transition-colors duration-300 group-hover:border-accent">
            <Shield size={14} className="text-accent" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold tracking-wider text-foreground uppercase">
              Unggul Axiom
            </span>
            <span className="font-mono text-[8px] font-semibold tracking-[0.3em] text-accent uppercase mt-0.5 leading-none">
              Workspace Hub
            </span>
          </div>
        </Link>

        {/* Centered Premium Editorial Brand Presentation */}
        <div className="my-auto mx-auto max-w-xl space-y-8 text-center">
          
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2">
              <span className="h-[1px] w-8 bg-accent/60" />
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.25em] text-accent">
                {isChiefPortal ? "Strategic Portal" : "Operational Core"}
              </span>
              <span className="h-[1px] w-8 bg-accent/60" />
            </div>
            
            <h2 className="font-serif text-5xl font-light tracking-tight text-foreground leading-[1.15] max-w-md mx-auto">
              {isChiefPortal ? (
                <>
                  The Strategic <span className="font-serif italic text-accent block mt-1">Hub.</span>
                </>
              ) : (
                <>
                  The Workspace <span className="font-serif italic text-accent block mt-1">Hub.</span>
                </>
              )}
            </h2>

            <p className="font-serif italic text-xl font-light text-foreground-subtle/85 max-w-[440px] mx-auto leading-relaxed pt-2">
              {isChiefPortal 
                ? "“Integrating strategic capital directives, corporate governance, and core enterprise operations into a unified, secure executive workspace.”"
                : "“Connecting enterprise divisions, operational registers, and strategic partners to dedicated, high-performance corporate applications.”"
              }
            </p>
          </div>

          {/* Very high-end tiny metadata line */}
          <div className="pt-4 flex items-center justify-center gap-6 font-mono text-[9px] text-foreground-subtle/50 tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-accent" />
              SYSTEM ACTIVE: UA-III
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-accent" />
              PORT: SECURE MAPPED
            </span>
          </div>

        </div>

        {/* Footer info brand elements */}
        <div className="flex items-center justify-between font-mono text-[9px] text-foreground-subtle/40 tracking-wider">
          <span>&copy; {new Date().getFullYear()} UNGGUL AXIOM</span>
          <span>SYSTEM INTEGRITY CONTROL</span>
        </div>
      </section>

      {/* ── Right Side Panel: Universal Authentication Form (Desktop & Mobile) ── */}
      <main className="relative flex flex-col justify-between p-6 lg:p-16 lg:col-span-5 z-10 overflow-y-auto">
        
        {/* Mobile-only layout header */}
        <div className="flex lg:hidden items-center justify-between border-b border-border/20 pb-4 mb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-accent/20 bg-accent-subtle shadow-sm">
              <Shield size={14} className="text-accent" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-xs tracking-wider uppercase">Unggul</span>
              <span className="font-mono text-[8px] font-bold tracking-[0.2em] text-accent uppercase leading-none">
                Axiom
              </span>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Desktop theme controller corner link */}
        <div className="hidden lg:flex justify-end mb-4">
          <ThemeToggle />
        </div>

        {/* Main centered form panel */}
        <div className="my-auto mx-auto w-full max-w-[360px] space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground font-serif">
              {isChiefPortal ? "Strategic Portal" : "Sign In"}
            </h1>
            <p className="text-xs text-foreground-subtle leading-relaxed">
              {isChiefPortal 
                ? "Verify your authorized identity to initiate workspace access."
                : "Sign in to access your assigned workspace portal."
              }
            </p>
          </div>

          <div className="space-y-4">
            
            {/* The main auth card */}
            <div className="glass-premium rounded-lg p-6 lg:p-7 shadow-xl relative border border-border/20">

              {/* Secure portal banner */}
              {isChiefPortal && (
                <div className="mb-4 flex items-center justify-center gap-1.5 border border-accent/15 bg-accent-subtle/30 px-3 py-1 font-mono text-[8px] font-semibold text-accent tracking-wider uppercase rounded">
                  <Shield size={9} />
                  Restricted Access
                </div>
              )}

              {/* Demo Credentials hint */}
              <div className="mb-4 p-3 rounded bg-background-panel/50 border border-border/10 text-[9px] text-foreground-subtle/80 leading-relaxed font-mono">
                <span className="font-bold text-accent">ACCESS KEY:</span> admin@unggul.axiom &bull; axiom2026
              </div>

              {/* Error display system */}
              {error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive transition-all animate-in fade-in duration-200"
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-destructive" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              <form id="login-form" onSubmit={handleSubmit} noValidate className="space-y-4">
                
                {/* Email container */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor={emailId} 
                    className="text-[9px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block"
                  >
                    Email Address
                  </label>
                  <div className="premium-input-wrapper">
                    <input
                      id={emailId}
                      type="email"
                      name="email"
                      autoComplete="email"
                      required
                      placeholder="user@unggul.axiom"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className={cn(
                        "h-10 w-full rounded border border-input-border bg-input-bg px-3.5",
                        "font-sans text-sm text-foreground placeholder:text-foreground-subtle/40",
                        "transition-all duration-200 focus:bg-background/80",
                        "focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    />
                  </div>
                </div>

                {/* Password container */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label 
                      htmlFor={passwordId} 
                      className="text-[9px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <a
                      href="#"
                      className="text-[9px] font-semibold text-foreground-subtle transition-colors hover:text-accent font-mono uppercase tracking-wider"
                    >
                      Forgot?
                    </a>
                  </div>
                  <div className="premium-input-wrapper relative">
                    <input
                      id={passwordId}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className={cn(
                        "h-10 w-full rounded border border-input-border bg-input-bg px-3.5 pr-10",
                        "font-sans text-sm text-foreground placeholder:text-foreground-subtle/40",
                        "transition-all duration-200 focus:bg-background/80",
                        "focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    />
                    <button
                      type="button"
                      id="toggle-password-visibility"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isLoading}
                      className={cn(
                        "absolute right-0 top-0 flex h-10 w-10 items-center justify-center",
                        "text-foreground-subtle transition-colors",
                        "hover:text-foreground-muted",
                        "focus-visible:outline-none focus-visible:text-foreground-muted",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                      )}
                    >
                      {showPassword ? (
                        <EyeOff size={13} strokeWidth={1.75} />
                      ) : (
                        <Eye size={13} strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submitting tier */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className={cn(
                    "w-full h-10 mt-2 rounded bg-accent text-accent-foreground font-mono text-[10px] font-semibold tracking-[0.2em] uppercase transition-all duration-300",
                    "hover:bg-accent-hover hover:tracking-[0.25em] active:scale-[0.99] shadow-sm",
                    "disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-white" />
                      Verifying Access...
                    </>
                  ) : (
                    isChiefPortal ? "Authorize Portal Session" : "Access Workspace"
                  )}
                </button>
              </form>
            </div>

            {/* Separator strip */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-border/20"></div>
              <span className="flex-shrink mx-3 text-[8px] font-mono text-foreground-subtle/50 uppercase tracking-widest">
                Integration Options
              </span>
              <div className="flex-grow border-t border-border/20"></div>
            </div>

            {/* SSO buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 h-9 rounded border border-border/20 bg-background-panel hover:bg-background-subtle text-[9px] font-semibold font-mono text-foreground-subtle uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer"
              >
                <Fingerprint size={12} className="text-accent" />
                <span>Passkey</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 h-9 rounded border border-border/20 bg-background-panel hover:bg-background-subtle text-[9px] font-semibold font-mono text-foreground-subtle uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer"
              >
                <Key size={12} className="text-accent" />
                <span>SSO Vault</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security parameters & disclaimer */}
        <div className="mt-8 pt-6 border-t border-border/20 space-y-3 text-center">
          <div className="flex justify-center items-center gap-4 text-[8px] font-mono text-foreground-subtle/60 tracking-wider">
            <span className="flex items-center gap-1">
              <Lock size={9} className="text-accent/80" /> SECURE SESSION
            </span>
            <span className="h-2 w-px bg-border/20" />
            <span className="flex items-center gap-1">
              <Shield size={9} className="text-accent/80" /> AUDITED GATEWAY
            </span>
          </div>
          <p className="font-mono text-[8px] leading-relaxed text-foreground-subtle/50 tracking-wide">
            Unggul Axiom Workspace Hub &bull; Restricted Access
            <br />
            Usage is subject to system monitoring. Unauthorized attempts are tracked.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-background font-mono text-xs text-foreground-subtle">
        <Loader2 size={16} className="animate-spin text-accent mr-2" />
        INITIALIZING INTERFACE...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
