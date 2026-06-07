"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle, Trash2, Shield, Loader2, CheckCircle2,
  XCircle, Clock, Database, Eye, EyeOff,
} from "lucide-react";
import { useToastStore } from "@/components/ui/Toast";
import { adminApi, ResetDatabaseResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Step states for the multi-phase consent flow ────────────────────────────

type ResetStep = "idle" | "token-requested" | "confirming" | "executing" | "done";

export default function ResetDatabaseTab() {

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<ResetStep>("idle");
  const [token, setToken] = useState<string | null>(null);
  const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);
  const [typedToken, setTypedToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResetDatabaseResponse | null>(null);
  const [showToken, setShowToken] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  // ── Token countdown timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!tokenExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((tokenExpiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        setStep("idle");
        setToken(null);
        setTokenExpiresAt(null);
        setTypedToken("");
        setError("Consent token expired. Request a new one.");
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [tokenExpiresAt]);

  // ── Step 1: Request the consent token ──────────────────────────────────────
  const handleRequestToken = async () => {
    setError(null);
    try {
      const res = await adminApi.getResetToken();
      setToken(res.token);
      setTokenExpiresAt(Date.now() + res.expiresInSeconds * 1000);
      setTypedToken("");
      setStep("token-requested");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to request token";
      setError(msg);
      useToastStore.getState().error(msg);
    }
  };

  // ── Step 2: Confirm by typing the token exactly ────────────────────────────
  const handleConfirm = () => {
    if (!token) return;
    if (typedToken.trim().toLowerCase() !== token.toLowerCase()) {
      setError("Token does not match. Check each character and try again.");
      return;
    }
    setError(null);
    setStep("confirming");
  };

  // ── Step 3: Execute the wipe ───────────────────────────────────────────────
  const handleExecute = async () => {
    if (!token) return;
    setError(null);
    setStep("executing");
    try {
      const res = await adminApi.resetDatabase(token);
      setResult(res);
      setStep("done");
      useToastStore
        .getState()
        .success(
          `Database wiped: ${res.wiped.totalRowsDeleted} rows across ${res.wiped.tables.length} tables`,
        );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reset failed";
      setError(msg);
      setStep("token-requested");
      useToastStore.getState().error(msg);
    }
  };

  // ── Reset everything back to idle ───────────────────────────────────────────
  const handleReset = () => {
    setStep("idle");
    setToken(null);
    setTokenExpiresAt(null);
    setTypedToken("");
    setError(null);
    setResult(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground font-serif">
            Database Reset &amp; Initialize
          </h2>
          <p className="text-xs text-foreground-subtle mt-1">
            Purge all transactional data, test records, and log histories to
            ready the system for its first official production deployment.
          </p>
        </div>
      </div>

      {/* ── Danger Zone banner ──────────────────────────────────────────────── */}
      <div className="rounded-lg border-2 border-destructive/40 bg-destructive/5 overflow-hidden">
        {/* Banner header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-destructive/20 bg-destructive/10">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/20">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-destructive font-sans uppercase tracking-wider">
              Danger Zone
            </h3>
            <p className="text-[11px] text-destructive/80 font-mono mt-0.5">
              Irreversible &bull; Requires multi-factor consent &bull; Audit-logged
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* ── Idle state ──────────────────────────────────────────────────── */}
          {step === "idle" && (
            <div className="space-y-4">
              <div className="p-4 rounded-md border border-destructive/20 bg-background/50 space-y-3 text-xs">
                <p className="text-foreground-subtle font-sans leading-relaxed">
                  This operation will <strong className="text-destructive">permanently delete</strong> all
                  transactional records from the following tables:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                  {[
                    "files",
                    "file_shares",
                    "audit_logs",
                    "governance_requests",
                    "user_role_groups",
                    "user_permissions",
                    "password_resets",
                    "magic_links",
                    "webauthn_credentials",
                  ].map((t) => (
                    <span
                      key={t}
                      className="px-2 py-1 rounded bg-destructive/10 text-destructive/90 border border-destructive/15"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <p className="text-foreground-subtle font-sans leading-relaxed">
                  <strong className="text-foreground">Preserved:</strong> users, permissions,
                  role_groups, custom_roles, classifications, system_config, and all structural
                  metadata.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
                  <XCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleRequestToken}
                className="flex items-center gap-2 h-11 px-5 rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold tracking-wider font-sans uppercase transition-colors cursor-pointer shadow-sm"
              >
                <Shield size={14} />
                Request Reset Token
              </button>
            </div>
          )}

          {/* ── Token displayed — type to confirm ───────────────────────────── */}
          {(step === "token-requested" || step === "confirming") && token && (
            <div className="space-y-4">
              <div className="p-4 rounded-md border-2 border-destructive/30 bg-destructive/10 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-destructive" />
                  <span className="text-xs font-bold font-sans text-destructive uppercase tracking-wider">
                    Consent Token &mdash; Expires in{" "}
                    <span className={cn(secondsLeft <= 60 && "animate-pulse")}>
                      {Math.floor(secondsLeft / 60)}:
                      {String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  </span>
                </div>

                {/* Token display */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center justify-center gap-1.5 bg-background rounded-md border border-destructive/30 py-3 px-4">
                    {showToken ? (
                      token
                        .toUpperCase()
                        .split("")
                        .map((ch, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center justify-center h-10 w-8 rounded border-2 border-accent/40 bg-accent/10 text-lg font-bold font-mono text-accent"
                          >
                            {ch}
                          </span>
                        ))
                    ) : (
                      <span className="text-sm font-mono text-foreground-subtle italic">
                        Token hidden — click the eye icon to reveal
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowToken((v) => !v)}
                    className="h-10 w-10 rounded-md border border-border bg-background flex items-center justify-center text-foreground-subtle hover:text-foreground transition-colors cursor-pointer shrink-0"
                    title={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <p className="text-[11px] text-foreground-subtle font-sans leading-relaxed">
                  Type the <strong>exact</strong> 8-character token above to
                  unlock the reset button. Case-insensitive.
                </p>
              </div>

              {/* Token input */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={typedToken}
                  onChange={(e) => {
                    setTypedToken(e.target.value.slice(0, 8));
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && typedToken.length === 8) {
                      handleConfirm();
                    }
                  }}
                  placeholder="Type the 8-character token..."
                  maxLength={8}
                  autoFocus
                  className="h-12 w-full px-4 rounded-md border-2 border-destructive/30 bg-background text-base font-mono font-bold tracking-[0.25em] text-center text-foreground placeholder:text-foreground-subtle/30 focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive uppercase"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-foreground-subtle">
                    {typedToken.length}/8 characters
                  </span>
                  <span className="text-[10px] font-mono text-foreground-subtle">
                    Press Enter to confirm
                  </span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
                  <XCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Confirm button — only enabled once token matches */}
              <button
                onClick={handleConfirm}
                disabled={
                  typedToken.trim().toLowerCase() !== token.toLowerCase()
                }
                className="flex items-center gap-2 h-11 px-5 rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold tracking-wider font-sans uppercase transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <AlertTriangle size={14} />
                I Understand — Unlock Final Step
              </button>

              {/* Cancel */}
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 text-xs font-semibold font-sans transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* ── Final confirmation before execution ─────────────────────────── */}
          {step === "confirming" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 rounded-md border-2 border-destructive/60 bg-destructive/15 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-destructive animate-pulse" />
                  <span className="text-sm font-bold font-sans text-destructive uppercase tracking-wider">
                    Final Warning
                  </span>
                </div>
                <ul className="space-y-1.5 text-xs text-foreground-subtle font-sans leading-relaxed list-disc list-inside">
                  <li>
                    This will <strong className="text-destructive">permanently delete</strong>{" "}
                    all files, shares, audit logs, and governance requests.
                  </li>
                  <li>
                    All user-to-group assignments and direct permission overrides
                    will be removed.
                  </li>
                  <li>
                    User accounts, roles, permissions, classifications, and system
                    configuration will be <strong className="text-foreground">preserved</strong>.
                  </li>
                  <li>
                    This action <strong className="text-destructive">cannot be undone</strong>.
                    There is no rollback.
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExecute}
                  className="flex items-center gap-2 h-12 px-6 rounded-md bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold tracking-wider font-sans uppercase transition-colors cursor-pointer shadow-lg shadow-destructive/20"
                >
                  <Trash2 size={14} />
                  Wipe Database Now
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 h-10 px-4 rounded-md border border-border text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 text-xs font-semibold font-sans transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Executing spinner ───────────────────────────────────────────── */}
          {step === "executing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="relative">
                <Loader2 size={40} className="animate-spin text-destructive" />
                <Database size={18} className="absolute inset-0 m-auto text-destructive/70" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-destructive font-sans uppercase tracking-wider">
                  Wiping Database...
                </p>
                <p className="text-xs text-foreground-subtle font-mono">
                  Do not close this page or navigate away.
                </p>
              </div>
            </div>
          )}

          {/* ── Done — results ──────────────────────────────────────────────── */}
          {step === "done" && result && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-accent/30 bg-accent/10">
                <CheckCircle2 size={18} className="text-accent shrink-0" />
                <div>
                  <p className="text-sm font-bold text-accent font-sans uppercase tracking-wider">
                    Database Reset Complete
                  </p>
                  <p className="text-[11px] text-foreground-subtle font-mono mt-0.5">
                    {result.wiped.totalRowsDeleted} rows deleted across{" "}
                    {result.wiped.tables.length} tables
                  </p>
                </div>
              </div>

              {/* Wipe results table */}
              <div className="border border-border/20 rounded-md overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border/20 bg-background-panel/80">
                  <span className="text-[10px] font-bold font-sans uppercase text-foreground-subtle tracking-wider">
                    Wiped Tables
                  </span>
                </div>
                <div className="divide-y divide-border/10 max-h-[300px] overflow-y-auto">
                  {result.wiped.tables.map((t) => (
                    <div
                      key={t.tableName}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-background-subtle/10"
                    >
                      <span className="text-xs font-mono text-foreground">
                        {t.tableName}
                      </span>
                      <span className="text-xs font-mono text-destructive font-bold">
                        {t.rowsDeleted.toLocaleString()} rows
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 border-t border-border/20 bg-background-panel/40 flex items-center justify-between">
                  <span className="text-[10px] font-bold font-sans uppercase text-foreground-subtle">
                    Total
                  </span>
                  <span className="text-xs font-mono text-destructive font-bold">
                    {result.wiped.totalRowsDeleted.toLocaleString()} rows
                  </span>
                </div>
              </div>

              {/* Preserved tables */}
              <div className="border border-border/20 rounded-md p-4 bg-background/30">
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={13} className="text-accent" />
                  <span className="text-[10px] font-bold font-sans uppercase text-foreground-subtle tracking-wider">
                    Preserved (untouched)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.preserved.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/5 text-accent/80 border border-accent/15"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Done — reset to idle */}
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-border text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 text-xs font-semibold font-sans transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
