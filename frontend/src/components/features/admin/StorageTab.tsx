"use client";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { adminApi, UserStorageRow, formatFileSize } from "@/lib/api";

interface Props {
  storageRows: UserStorageRow[];
  setStorageRows: (r: UserStorageRow[]) => void;
  storageLoading: boolean; setStorageLoading: (v: boolean) => void;
}

export default function StorageTab({ storageRows, setStorageRows, storageLoading, setStorageLoading }: Props) {
  useEffect(() => {
    setStorageLoading(true);
    adminApi.getStorageBreakdown().then(setStorageRows).catch(() => {}).finally(() => setStorageLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalBytes = storageRows.reduce((s, r) => s + r.totalBytes, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-foreground font-serif">Storage Breakdown</h2>
        <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">Per-user storage consumption across the system.</p>
      </div>
      {storageLoading ? (
        <div className="py-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>
      ) : (
        <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
          <table className="w-full text-left font-mono text-[11px]">
            <thead><tr className="border-b border-border/30 bg-background-panel/80 text-[10px] font-bold tracking-wider text-foreground-subtle uppercase"><th className="px-4 py-2.5">User</th><th className="px-4 py-2.5 w-24">Role</th><th className="px-4 py-2.5 w-20 text-right">Files</th><th className="px-4 py-2.5 w-32 text-right">Storage</th><th className="px-4 py-2.5 w-24 text-right">% of Total</th></tr></thead>
            <tbody className="divide-y divide-border/10">
              {storageRows.map(r => (
                <tr key={r.userId} className="hover:bg-background-subtle/30">
                  <td className="px-4 py-2 font-sans text-foreground truncate max-w-[200px]">{r.fullName}</td>
                  <td className="px-4 py-2 text-foreground-muted capitalize">{r.role}</td>
                  <td className="px-4 py-2 text-right text-foreground-muted">{r.fileCount}</td>
                  <td className="px-4 py-2 text-right text-foreground font-bold">{formatFileSize(r.totalBytes)}</td>
                  <td className="px-4 py-2 text-right text-foreground-muted">{totalBytes > 0 ? ((r.totalBytes / totalBytes) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
