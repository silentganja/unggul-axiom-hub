"use client";

import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-accent/5 blur-[130px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-sm">
        {/* Icon */}
        <div className="h-16 w-16 rounded-full border border-border/40 bg-background-panel/50 flex items-center justify-center">
          <Shield size={28} className="text-accent/60" strokeWidth={1.5} />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="font-mono text-8xl font-bold text-foreground-subtle/20 tracking-tighter select-none">
            404
          </h1>
          <h2 className="text-lg font-semibold text-foreground font-serif">
            Resource Not Found
          </h2>
          <p className="text-xs text-foreground-subtle font-mono leading-relaxed">
            The requested resource does not exist or has been relocated.
            Verify the address and try again.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground inline-flex items-center gap-2"
          >
            Back to Workspace
          </Link>
          <Link
            href="/"
            className="h-9 px-4 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold font-mono uppercase tracking-wider text-foreground-subtle transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft size={12} />
            Home
          </Link>
        </div>

        {/* Footer */}
        <p className="text-[8px] font-mono text-foreground-subtle/40 tracking-wider uppercase pt-8">
          Unggul Axiom Hub · Error Reference: 404 · Not Found
        </p>
      </div>
    </div>
  );
}
