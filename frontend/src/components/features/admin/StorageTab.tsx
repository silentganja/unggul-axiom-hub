"use client";
import { useEffect, useState } from "react";
import { Loader2, Download, AlertTriangle } from "lucide-react";
import { adminApi, UserStorageRow, StorageAnalytics, formatFileSize } from "@/lib/api";
import { cn } from "@/lib/utils";

function exportCSV(headers: string[], rows: string[][], filename: string) {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface Props {
  storageRows: UserStorageRow[];
  setStorageRows: (r: UserStorageRow[]) => void;
  storageLoading: boolean; setStorageLoading: (v: boolean) => void;
}

export default function StorageTab({ storageRows, setStorageRows, storageLoading, setStorageLoading }: Props) {
  const [analytics, setAnalytics] = useState<StorageAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    setStorageLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnalyticsLoading(true);
    Promise.all([
      adminApi.getStorageBreakdown().then(setStorageRows).catch(() => {}),
      adminApi.getStorageAnalytics().then(setAnalytics).catch(() => {}),
    ]).finally(() => {
      setStorageLoading(false);
      setAnalyticsLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalBytes = storageRows.reduce((s, r) => s + r.totalBytes, 0);
  const maxClassBytes = analytics ? Math.max(...analytics.byClassification.map(c => c.bytes), 1) : 1;
  const maxTrend = analytics ? Math.max(...analytics.storageTrend.map(t => t.bytes), 1) : 1;
  const maxTopFile = analytics ? Math.max(...analytics.largestFiles.map(f => f.sizeBytes), 1) : 1;

  const handleExportStorage = () => {
    const headers = ["User", "Role", "Files", "Storage", "% of Total"];
    const rows = storageRows.map(r => [
      r.fullName,
      r.role,
      String(r.fileCount),
      formatFileSize(r.totalBytes),
      totalBytes > 0 ? ((r.totalBytes / totalBytes) * 100).toFixed(1) + "%" : "0%",
    ]);
    exportCSV(headers, rows, `storage-breakdown-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const loading = storageLoading || analyticsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground font-serif">Storage Analytics</h2>
          <p className="text-xs text-foreground-subtle mt-1">Per-user and system-wide storage consumption.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportStorage} disabled={storageRows.length === 0}
            className="h-9 px-4 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-semibold tracking-wider font-sans uppercase transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 size={24} className="animate-spin mx-auto text-accent" /></div>
      ) : (
        <>
          {/* Analytics Charts */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Storage by Classification */}
              <div className="border border-border/20 rounded-lg bg-background-panel/35 p-6">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground-subtle">By Classification</span>
                <div className="mt-4 space-y-3">
                  {analytics.byClassification.map(c => {
                    const pct = (c.bytes / maxClassBytes) * 100;
                    return (
                      <div key={c.classification} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn("font-bold uppercase font-sans",
                            c.classification === "RAHSIA" && "text-destructive",
                            c.classification === "SULIT" && "text-warning",
                            c.classification === "TERHAD" && "text-info",
                            c.classification === "TERBUKA" && "text-foreground-subtle"
                          )}>{c.classification}</span>
                          <span className="text-foreground font-mono">{formatFileSize(c.bytes)}</span>
                        </div>
                        <div className="h-4 w-full bg-background-subtle/60 rounded-full overflow-hidden border border-border/10">
                          <div className={cn("h-full rounded-full transition-all duration-300",
                            c.classification === "RAHSIA" && "bg-destructive/60",
                            c.classification === "SULIT" && "bg-warning/60",
                            c.classification === "TERHAD" && "bg-info/60",
                            c.classification === "TERBUKA" && "bg-background-muted/60"
                          )} style={{ width: `${Math.max(4, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top 10 Largest Files */}
              <div className="border border-border/20 rounded-lg bg-background-panel/35 p-6">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground-subtle">Top 10 Largest Files</span>
                <div className="mt-4 space-y-3">
                  {analytics.largestFiles.slice(0, 10).map((f) => {
                    const pct = (f.sizeBytes / maxTopFile) * 100;
                    return (
                      <div key={f.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground font-sans truncate max-w-[120px]">{f.name}</span>
                          <span className="text-foreground-muted font-mono">{formatFileSize(f.sizeBytes)}</span>
                        </div>
                        <div className="h-3 w-full bg-background-subtle/60 rounded-full overflow-hidden border border-border/10 flex">
                          <div className="h-full bg-accent/60 transition-all duration-300" style={{ width: `${Math.max(2, pct)}%` }} />
                        </div>
                        <span className="text-xs text-foreground-subtle font-sans">{f.ownerName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Storage Trend (30 days) */}
              <div className="border border-border/20 rounded-lg bg-background-panel/35 p-6">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground-subtle">Storage Trend (30 days)</span>
                {analytics.storageTrend.length > 1 ? (
                  <div className="mt-4">
                    <svg viewBox="0 0 300 80" className="w-full h-20" preserveAspectRatio="none">
                      <polyline
                        fill="none"
                        stroke="var(--color-accent, #cd7f32)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        points={analytics.storageTrend.map((t, i) => {
                          const x = (i / (analytics.storageTrend.length - 1)) * 290 + 5;
                          const y = 70 - (t.bytes / maxTrend) * 60;
                          return `${x},${y}`;
                        }).join(" ")}
                      />
                      <polygon
                        fill="var(--color-accent, #cd7f32)"
                        fillOpacity="0.08"
                        points={
                          analytics.storageTrend.map((t, i) => {
                            const x = (i / (analytics.storageTrend.length - 1)) * 290 + 5;
                            const y = 70 - (t.bytes / maxTrend) * 60;
                            return `${x},${y}`;
                          }).join(" ") +
                          ` ${290 + 5},70 5,70`
                        }
                      />
                    </svg>
                    <div className="flex justify-between text-xs font-mono text-foreground-subtle mt-2">
                      <span>{analytics.storageTrend[0]?.date?.slice(5) || ""}</span>
                      <span>{analytics.storageTrend[analytics.storageTrend.length - 1]?.date?.slice(5) || ""}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-foreground-subtle">Insufficient data</div>
                )}
              </div>
            </div>
          )}

          {/* Over-Quota Users */}
          {analytics && analytics.overQuotaUsers.length > 0 && (
            <div className="border border-warning/30 rounded-lg bg-warning/5 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-warning" />
                <span className="font-sans text-xs font-bold uppercase tracking-wider text-warning">Over-Quota Users</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {analytics.overQuotaUsers.map(u => (
                  <div key={u.userId} className="flex items-center justify-between text-xs font-mono bg-background/50 border border-border/20 rounded-md px-4 py-3">
                    <span className="text-foreground font-sans truncate max-w-[140px]">{u.fullName}</span>
                    <span className="text-destructive font-bold">{formatFileSize(u.usedBytes)} / {formatFileSize(u.quotaBytes)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-User Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground-subtle uppercase tracking-wider">Per-User Breakdown</span>
              <button onClick={handleExportStorage} disabled={storageRows.length === 0}
                className="h-8 px-3 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-semibold tracking-wider font-sans uppercase transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
                <Download size={11} /> CSV
              </button>
            </div>
            <div className="border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-background-panel/80 font-mono text-xs font-bold tracking-wider text-foreground-subtle uppercase">
                    <th className="px-6 py-3.5">User</th><th className="px-6 py-3.5 w-32">Role</th>
                    <th className="px-6 py-3.5 w-28 text-right">Files</th><th className="px-6 py-3.5 w-40 text-right">Storage</th>
                    <th className="px-6 py-3.5 w-28 text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {storageRows.map(r => (
                    <tr key={r.userId} className="hover:bg-background-subtle/30 transition-colors">
                      <td className="px-6 py-3 font-semibold text-foreground truncate max-w-[200px]">{r.fullName}</td>
                      <td className="px-6 py-3 text-foreground-muted capitalize">{r.role}</td>
                      <td className="px-6 py-3 text-right text-foreground-muted font-mono">{r.fileCount}</td>
                      <td className="px-6 py-3 text-right text-foreground font-bold font-mono">{formatFileSize(r.totalBytes)}</td>
                      <td className="px-6 py-3 text-right text-foreground-muted font-mono">{totalBytes > 0 ? ((r.totalBytes / totalBytes) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
