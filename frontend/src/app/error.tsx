"use client";

import { useEffect } from "react";
import { Shield, AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[Unggul Axiom] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[15%] -right-[10%] w-[55%] h-[55%] rounded-full bg-destructive/5 blur-[130px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-sm">
        {/* Icon */}
        <div className="h-16 w-16 rounded-full border border-destructive/20 bg-destructive/5 flex items-center justify-center">
          <AlertTriangle size={28} className="text-destructive/70" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="font-mono text-6xl font-bold text-destructive/15 tracking-tighter select-none">
            500
          </h1>
          <h2 className="text-lg font-semibold text-foreground font-serif">
            System Exception
          </h2>
          <p className="text-xs text-foreground-subtle font-mono leading-relaxed">
            An unexpected error occurred while processing your request.
            The system integrity monitor has been notified.
          </p>
          {error.digest && (
            <p className="text-[9px] font-mono text-foreground-subtle/50 tracking-wider">
              Reference: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={reset}
            className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground inline-flex items-center gap-2"
          >
            <RefreshCw size={13} />
            Retry Operation
          </button>
          <a
            href="/dashboard"
            className="h-9 px-4 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold font-mono uppercase tracking-wider text-foreground-subtle transition-colors inline-flex items-center gap-2"
          >
            <Shield size={12} />
            Workspace
          </a>
        </div>

        {/* Footer */}
        <p className="text-[8px] font-mono text-foreground-subtle/40 tracking-wider uppercase pt-8">
          Unggul Axiom Hub · Error Reference: 500 · System Exception
        </p>
      </div>
    </div>
  );
}
