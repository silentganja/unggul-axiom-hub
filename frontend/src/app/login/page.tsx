"use client";

import { useState, useId, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Shield, AlertCircle, Loader2, Fingerprint, Key, Lock, CheckCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi, webauthnApi, setToken, setRefreshToken } from "@/lib/api";
import { cn } from "@/lib/utils";

const VALID_PORTALS = new Set(["foundation", "chief"]);

function LoginForm() {
  const emailId = useId();
  const passwordId = useId();
  const searchParams = useSearchParams();
  const router = useRouter();
  const portal = searchParams?.get("portal");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading: authLoading, error: authError, isAuthenticated } = useAuthStore();

  // Block direct /login access - users must select a portal from the landing page first.
  // Exception: magic links and password resets are allowed without portal
  const magicLinkUrlToken = searchParams?.get("magic");
  const resetToken = searchParams?.get("reset");

  useEffect(() => {
    if (magicLinkUrlToken) {
      authApi.verifyMagicLink(magicLinkUrlToken).then((res) => {
        setToken(res.token);
        setRefreshToken(res.refreshToken);
        router.replace("/dashboard");
      }).catch(() => {});
      return;
    }
    if (!portal || !VALID_PORTALS.has(portal)) {
      router.replace("/");
    }
  }, [portal, router, magicLinkUrlToken]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError("Email and password are required.");
      return;
    }
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      // Error is handled by the store (sets authError)
    }
  };

  // ── Forgot password modal ───────────────────────────────────────────────
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail);
      setForgotDone(true);
    } catch {
      setForgotDone(true); // Don't reveal if email exists
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Magic link (SSO Vault) modal ────────────────────────────────────────
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicDone, setMagicDone] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMagicLoading(true);
    try {
      await authApi.requestMagicLink(magicEmail);
      setMagicDone(true);
    } catch {
      setMagicDone(true);
    } finally {
      setMagicLoading(false);
    }
  };

  // ── Passkey login ───────────────────────────────────────────────────────
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  // ── Reset password (when ?reset=TOKEN is in the URL) ────────────────────
  const [resetNewPass, setResetNewPass] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (resetNewPass.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    if (resetNewPass !== resetConfirm) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetLoading(true);
    try {
      await authApi.resetPassword(resetToken!, resetNewPass);
      setResetDone(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    try {
      // webauthnApi.startLogin() already stores token + refreshToken
      await webauthnApi.startLogin();
      // Hydrate will load the user profile on dashboard mount
      router.push("/dashboard");
    } catch {
      // Passkey not registered or user cancelled
    } finally {
      setPasskeyLoading(false);
    }
  };

  const isChiefPortal = portal === "chief" || portal === "foundation";

  // ── Reset password view (when ?reset=TOKEN) ────────────────────────────
  if (resetToken) {
    return (
      <div className="relative min-h-dvh flex items-center justify-center bg-background p-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-accent/8 blur-[130px]" />
        </div>
        <div className="relative z-10 w-full max-w-[360px] space-y-6">
          <div className="text-center space-y-2">
            <Shield size={24} className="mx-auto text-accent" />
            <h1 className="text-lg font-bold tracking-tight text-foreground font-serif">Reset Password</h1>
            <p className="text-xs text-foreground-subtle font-mono">Enter your new password below.</p>
          </div>
          {resetDone ? (
            <div className="glass-premium rounded-lg p-6 text-center space-y-4">
              <CheckCircle size={24} className="mx-auto text-success" />
              <p className="text-xs text-foreground font-mono">Password reset successfully!</p>
              <Link href="/login?portal=foundation" className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2 text-accent-foreground">Sign In</Link>
            </div>
          ) : (
            <div className="glass-premium rounded-lg p-6 space-y-4">
              {resetError && (
                <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{resetError}</span>
                </div>
              )}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">New Password</label>
                  <input type="password" required placeholder="Min 6 characters" value={resetNewPass} onChange={(e) => setResetNewPass(e.target.value)} className="h-10 w-full rounded border border-input-border bg-input-bg px-3.5 font-sans text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">Confirm Password</label>
                  <input type="password" required placeholder="••••••••" value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} className="h-10 w-full rounded border border-input-border bg-input-bg px-3.5 font-sans text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <button type="submit" disabled={resetLoading} className="w-full h-10 rounded bg-accent text-accent-foreground font-mono text-[10px] font-semibold tracking-[0.2em] uppercase transition-all duration-300 hover:bg-accent-hover shadow-sm disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer">
                  {resetLoading ? <Loader2 size={13} className="animate-spin" /> : "Reset Password"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh flex flex-col lg:grid lg:grid-cols-12 bg-background overflow-hidden selection:bg-accent selection:text-accent-foreground">

      {/* ── Background Aesthetics (Ambient Glow Elements) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-accent/10 blur-[130px] ambient-glow-1 hidden md:block" />
        <div className="absolute top-[25%] -right-[15%] w-[45%] h-[45%] rounded-full bg-info/5 blur-[120px] ambient-glow-2 hidden md:block" />
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

              {/* Error display system */}
              {(localError || authError) && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive transition-all animate-in fade-in duration-200"
                >
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-destructive" />
                  <span className="leading-relaxed">{localError || authError}</span>
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
                      disabled={authLoading}
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
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-[9px] font-semibold text-foreground-subtle transition-colors hover:text-accent font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Forgot?
                    </button>
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
                      disabled={authLoading}
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
                      disabled={authLoading}
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
                  disabled={authLoading}
                  className={cn(
                    "w-full h-10 mt-2 rounded bg-accent text-accent-foreground font-mono text-[10px] font-semibold tracking-[0.2em] uppercase transition-all duration-300",
                    "hover:bg-accent-hover hover:tracking-[0.25em] active:scale-[0.99] shadow-sm",
                    "disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                  )}
                >
                  {authLoading ? (
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
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading}
                className="flex items-center justify-center gap-2 h-9 rounded border border-border/20 bg-background-panel hover:bg-background-subtle text-[9px] font-semibold font-mono text-foreground-subtle uppercase tracking-wider transition-all duration-150 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {passkeyLoading ? <Loader2 size={12} className="animate-spin text-accent" /> : <Fingerprint size={12} className="text-accent" />}
                <span>Passkey</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMagicLink(true)}
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

        {/* ── Forgot Password Modal ── */}
        {showForgot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
              {forgotDone ? (
                <div className="space-y-4 text-center">
                  <CheckCircle size={24} className="mx-auto text-success" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground font-serif">Reset Email Sent</h3>
                    <p className="text-[10px] text-foreground-subtle font-mono">If an account with that email exists, a password reset token has been sent. Check your inbox and spam folder.</p>
                  </div>
                  <button onClick={() => { setShowForgot(false); setForgotDone(false); setForgotEmail(""); }} className="h-8 px-4 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold font-mono uppercase transition-colors cursor-pointer">Close</button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground font-serif">Reset Password</h3>
                    <p className="text-[10px] text-foreground-subtle font-mono">Enter your email to receive a password reset token.</p>
                  </div>
                  <form onSubmit={handleForgot} className="space-y-3">
                    <input type="email" required placeholder="user@unggul.axiom" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="h-9 w-full px-3 rounded-sm border border-input-border bg-input-bg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
                      <button type="button" onClick={() => setShowForgot(false)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors">Cancel</button>
                      <button type="submit" disabled={forgotLoading} className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50">{forgotLoading ? <Loader2 size={12} className="animate-spin" /> : "Send Token"}</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Magic Link (SSO Vault) Modal ── */}
        {showMagicLink && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
              {magicDone ? (
                <div className="space-y-4 text-center">
                  <CheckCircle size={24} className="mx-auto text-success" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground font-serif">Login Link Sent</h3>
                    <p className="text-[10px] text-foreground-subtle font-mono">If an account with that email exists, a one-time login link has been sent. Check your inbox and spam folder.</p>
                  </div>
                  <button onClick={() => { setShowMagicLink(false); setMagicDone(false); setMagicEmail(""); }} className="h-8 px-4 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold font-mono uppercase transition-colors cursor-pointer">Close</button>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground font-serif">SSO Vault - Magic Link</h3>
                    <p className="text-[10px] text-foreground-subtle font-mono">Enter your email to receive a one-time secure login link.</p>
                  </div>
                  <form onSubmit={handleMagicLink} className="space-y-3">
                    <input type="email" required placeholder="user@unggul.axiom" value={magicEmail} onChange={(e) => setMagicEmail(e.target.value)} className="h-9 w-full px-3 rounded-sm border border-input-border bg-input-bg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
                      <button type="button" onClick={() => setShowMagicLink(false)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors">Cancel</button>
                      <button type="submit" disabled={magicLoading} className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50">{magicLoading ? <Loader2 size={12} className="animate-spin" /> : "Send Link"}</button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
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
