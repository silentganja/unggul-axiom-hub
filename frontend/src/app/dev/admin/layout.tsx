"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { Shield, Loader2, AlertCircle, LogOut, Lock, ExternalLink, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAdminStore } from "@/store/useAdminStore";
import { useToastStore } from "@/components/ui/Toast";
import { useRouter, usePathname } from "next/navigation";
import { adminApi } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Context for Step-up Authentication ─────────────────────────────────────────
interface AdminLayoutContextType {
  requestStepUp: (onSuccess: () => void) => void;
}

const AdminLayoutContext = createContext<AdminLayoutContextType | null>(null);

export function useAdminLayout() {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error("useAdminLayout must be used within an AdminLayoutProvider");
  }
  return context;
}

// ─── Admin Login View ────────────────────────────────────────────────────────
function AdminLoginView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error } = useAdminStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch {}
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-6 selection:bg-accent selection:text-accent-foreground">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-accent/8 blur-[130px]" />
        <div className="absolute inset-0 scan-grid opacity-[0.01] dark:opacity-[0.02]" />
      </div>
      <div className="relative z-10 w-full max-w-[380px] space-y-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-subtle shadow-[0_0_20px_rgba(205,127,50,0.15)]">
              <Shield size={20} className="text-accent" strokeWidth={1.5} />
            </div>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground font-serif">Admin Console</h1>
          <p className="font-mono text-[8px] font-bold tracking-[0.25em] text-accent uppercase">Strategic Portal - User Management</p>
        </div>
        <div className="glass-premium rounded-lg p-6 shadow-xl border border-border/20 space-y-4">
          <div className="flex items-center justify-center gap-1.5 border border-accent/15 bg-accent-subtle/30 px-3 py-1 font-mono text-[8px] font-semibold text-accent tracking-wider uppercase rounded">
            <Shield size={9} /> Restricted Access
          </div>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">Admin Username</label>
              <input type="text" required autoFocus placeholder="mirza" value={username} onChange={e => setUsername(e.target.value)} disabled={isLoading}
                className="h-10 w-full rounded border border-input-border bg-input-bg px-3.5 font-sans text-sm text-foreground placeholder:text-foreground-subtle/40 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading}
                  className="h-10 w-full rounded border border-input-border bg-input-bg px-3.5 pr-10 font-sans text-sm text-foreground placeholder:text-foreground-subtle/40 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-50" />
                <button type="button" onClick={() => setShowPassword(v => !v)} disabled={isLoading}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-foreground-subtle hover:text-foreground-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50">
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full h-10 rounded bg-accent text-accent-foreground font-mono text-[10px] font-semibold tracking-[0.2em] uppercase transition-all duration-300 hover:bg-accent-hover active:scale-[0.99] shadow-sm disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
              {isLoading ? <><Loader2 size={13} className="animate-spin" /> Verifying...</> : "Authenticate"}
            </button>
          </form>
        </div>
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-4 text-[8px] font-mono text-foreground-subtle/60 tracking-wider">
            <span className="flex items-center gap-1"><Lock size={9} className="text-accent/80" /> SECURE SESSION</span>
            <span className="h-2 w-px bg-border/20" />
            <span className="flex items-center gap-1"><Shield size={9} className="text-accent/80" /> ADMIN GATEWAY</span>
          </div>
          <p className="font-mono text-[8px] text-foreground-subtle/50 tracking-wide">Unggul Axiom - Strategic Portal Admin Console</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Layout Wrapper ────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { username, isAuthenticated, logout, hydrate } = useAdminStore();
  const pathname = usePathname() || "";
  const router = useRouter();

  // Step-up auth modal state
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [stepUpError, setStepUpError] = useState<string | null>(null);
  const [stepUpLoading, setStepUpLoading] = useState(false);
  const [stepUpCallback, setStepUpCallback] = useState<(() => void) | null>(null);

  // Hydrate store on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 15-Minute Idle Timeout Check
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        useToastStore.getState().error("Admin session expired due to inactivity");
        logout();
      }, 15 * 60 * 1000); // 15 minutes
    };

    // Listen to user interactions
    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"];
    const handleEvent = () => resetTimer();
    
    events.forEach(event => {
      window.addEventListener(event, handleEvent);
    });

    // Start timer initially
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [isAuthenticated, logout]);

  const requestStepUp = (onSuccess: () => void) => {
    setStepUpCallback(() => onSuccess);
    setStepUpPassword("");
    setStepUpError(null);
    setStepUpOpen(true);
  };

  const handleStepUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setStepUpError(null);
    setStepUpLoading(true);
    try {
      // Re-authenticate admin with typed password
      await adminApi.login({ username, password: stepUpPassword });
      setStepUpOpen(false);
      if (stepUpCallback) {
        stepUpCallback();
      }
    } catch (err) {
      setStepUpError(err instanceof Error ? err.message : "Password verification failed");
    } finally {
      setStepUpLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <AdminLoginView />;
  }

  const TABS = [
    { key: "dashboard", label: "dashboard", href: "/dev/admin" },
    { key: "users", label: "users", href: "/dev/admin/users" },
    { key: "governance", label: "governance", href: "/dev/admin/governance" },
    { key: "files", label: "Files", href: "/dev/admin/files" },
    { key: "audit", label: "Audit", href: "/dev/admin/audit" },
    { key: "shares", label: "Shares", href: "/dev/admin/shares" },
    { key: "storage", label: "storage", href: "/dev/admin/storage" },
    { key: "config", label: "config", href: "/dev/admin/config" },
    { key: "roles", label: "Roles", href: "/dev/admin/roles" },
  ];

  return (
    <AdminLayoutContext.Provider value={{ requestStepUp }}>
      <div className="min-h-dvh bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground">
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[10%] left-[20%] w-[35%] h-[35%] rounded-full bg-accent/5 blur-[120px]" />
          <div className="absolute inset-0 scan-grid opacity-[0.015] dark:opacity-[0.03]" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent-subtle shadow-[0_0_20px_rgba(205,127,50,0.15)]">
                <Shield size={18} className="text-accent" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-foreground font-serif">Strategic Portal · Admin Console</h1>
                <p className="font-mono text-[9px] text-foreground-subtle">Authenticated as <span className="text-accent font-bold">{username}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="/dashboard"
                className="flex items-center gap-1.5 h-8 px-3 rounded border border-accent/25 text-accent bg-accent/5 hover:bg-accent/15 transition-colors text-[10px] font-bold tracking-wider uppercase font-mono cursor-pointer no-underline">
                <ExternalLink size={11} /> Open Dashboard
              </a>
              <ThemeToggle />
              <button onClick={logout} className="flex items-center gap-2 h-8 px-3 rounded border border-destructive/25 text-destructive bg-destructive/5 hover:bg-destructive/15 transition-colors text-[10px] font-bold tracking-wider uppercase font-mono cursor-pointer">
                <LogOut size={11} /> Terminate
              </button>
            </div>
          </header>

          {/* Subnavigation Tab Links */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold select-none border-b border-border/20 pb-3">
            {TABS.map(tab => {
              const isActive = pathname === tab.href;
              return (
                <button
                  key={tab.key}
                  onClick={() => router.push(tab.href)}
                  className={cn("px-3 py-1.5 rounded-sm border uppercase transition-colors cursor-pointer capitalize",
                    isActive ? "bg-accent/10 border-accent/20 text-accent font-extrabold" : "border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Main Content Area */}
          <div>{children}</div>
        </div>

        {/* ── Step-up Authentication Modal ── */}
        {stepUpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground font-serif">Confirm Credentials</h3>
                <p className="text-[10px] text-foreground-subtle font-mono">Step-up verification: enter password to confirm this critical action.</p>
              </div>
              {stepUpError && (
                <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" />
                  <span>{stepUpError}</span>
                </div>
              )}
              <form onSubmit={handleStepUpSubmit} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Verify Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={stepUpPassword}
                    onChange={e => setStepUpPassword(e.target.value)}
                    disabled={stepUpLoading}
                    className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
                  <button
                    type="button"
                    onClick={() => setStepUpOpen(false)}
                    disabled={stepUpLoading}
                    className="px-3 h-8 rounded border border-border hover:bg-background-subtle/40 text-foreground-subtle hover:text-foreground uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={stepUpLoading}
                    className="px-3 h-8 rounded bg-accent text-accent-foreground hover:bg-accent-hover uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                  >
                    {stepUpLoading ? <Loader2 size={10} className="animate-spin" /> : null}
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayoutContext.Provider>
  );
}
