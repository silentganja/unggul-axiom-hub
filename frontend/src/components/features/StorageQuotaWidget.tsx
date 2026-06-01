"use client";

import { useFileStore } from "@/store/useFileStore";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${i === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[i]}`;
}

export default function StorageQuotaWidget() {
  const quotaUsed = useFileStore((state) => state.quotaUsed);
  const quotaTotal = useFileStore((state) => state.quotaTotal);
  const quotaFileCount = useFileStore((state) => state.quotaFileCount);
  const quotaFolderCount = useFileStore((state) => state.quotaFolderCount);

  const pct = quotaTotal > 0 ? Math.min((quotaUsed / quotaTotal) * 100, 100) : 0;

  return (
    <div className="space-y-3 pt-4 border-t border-border/20">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-mono text-foreground-subtle">
          <span>Storage Quota</span>
          <span className="font-bold text-foreground-muted">
            {formatBytes(quotaUsed)} / {formatBytes(quotaTotal)}
          </span>
        </div>
        <div className="h-1.5 w-full bg-background-subtle rounded-full overflow-hidden border border-border/10">
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-foreground-subtle">
        <span>
          {quotaFileCount} file{quotaFileCount !== 1 ? "s" : ""} &bull; {quotaFolderCount} folder{quotaFolderCount !== 1 ? "s" : ""}
        </span>
        <span className={pct > 90 ? "text-destructive" : pct > 70 ? "text-warning" : "text-success"}>
          {pct > 90 ? "Critical" : pct > 70 ? "Moderate" : "Optimal"}
        </span>
      </div>
    </div>
  );
}
