"use client";

import { Loader2, Shield } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background gap-3">
      <div className="h-10 w-10 rounded-full border border-accent/20 bg-accent-subtle/20 flex items-center justify-center">
        <Shield size={20} className="text-accent/60" strokeWidth={1.5} />
      </div>
      <div className="flex items-center gap-2 font-mono text-xs text-foreground-subtle">
        <Loader2 size={14} className="animate-spin text-accent" />
        INITIALIZING...
      </div>
    </div>
  );
}
