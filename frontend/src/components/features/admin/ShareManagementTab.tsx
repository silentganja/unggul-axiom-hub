"use client";
import { useEffect, useState } from "react";
import {
  Loader2, AlertCircle, Trash2, Search, Download,
} from "lucide-react";
import {
  adminApi, AllSharesRow, AdminUserEntry,
  formatTimestamp,
} from "@/lib/api";
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

export default function ShareManagementTab() {
  const [shares, setShares] = useState<AllSharesRow[]>([]);
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterUser, setFilterUser] = useState("ALL");
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 25;

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<AllSharesRow | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const fetchShares = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, u] = await Promise.all([
        adminApi.listShares(),
        adminApi.listUsers(),
      ]);
      setShares(s);
      setUsers(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch shares");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchShares();
  }, []);

  const filtered = shares.filter(s => {
    if (filterUser !== "ALL" && s.sharedWithId !== filterUser && s.sharedById !== filterUser) return false;
    if (search && !s.fileName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevokeLoading(true);
    try {
      await adminApi.revokeShare(revokeTarget.id);
      setShares(prev => prev.filter(s => s.id !== revokeTarget.id));
      setRevokeTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to revoke share");
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleExport = () => {
    const headers = ["File Name", "Shared By", "Shared With", "Role", "Date Shared"];
    const rows = filtered.map(s => [
      s.fileName,
      s.sharedByName,
      s.sharedWithName,
      s.role,
      formatTimestamp(s.createdAt),
    ]);
    exportCSV(headers, rows, `shares-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground font-serif">Share Management</h2>
          <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
            {shares.length} total shares across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={filtered.length === 0}
            className="h-7 px-3 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[9px] font-bold uppercase font-mono transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
            <Download size={11} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-foreground-subtle uppercase">User:</span>
          <select value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1); }}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="ALL">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </div>
        <div className="relative ml-auto">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by file name..."
            className="h-7 w-48 pl-7 pr-2 rounded-sm border border-input-border bg-input-bg text-[10px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border/20 rounded-sm">
          <p className="text-[10px] font-mono text-foreground-subtle">No shares found</p>
        </div>
      ) : (
        <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border/30 bg-background-panel/80 text-[10px] font-bold tracking-wider text-foreground-subtle uppercase">
                  <th className="px-4 py-2.5">File</th>
                  <th className="px-4 py-2.5 w-28">Shared By</th>
                  <th className="px-4 py-2.5 w-28">Shared With</th>
                  <th className="px-4 py-2.5 w-20 text-center">Role</th>
                  <th className="px-4 py-2.5 w-32">Date Shared</th>
                  <th className="px-4 py-2.5 w-20 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {paginated.map(s => (
                  <tr key={s.id} className="hover:bg-background-subtle/30 transition-colors">
                    <td className="px-4 py-2 font-sans text-foreground font-semibold truncate max-w-[200px]">{s.fileName}</td>
                    <td className="px-4 py-2 text-foreground-muted">{s.sharedByName}</td>
                    <td className="px-4 py-2 text-foreground-muted">{s.sharedWithName}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn("px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase border",
                        s.role === "editor" ? "bg-info/10 text-info border-info/20" : "bg-background-muted/40 text-foreground-subtle border-border/40"
                      )}>{s.role}</span>
                    </td>
                    <td className="px-4 py-2 text-foreground-muted text-[10px]">{formatTimestamp(s.createdAt)}</td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => setRevokeTarget(s)}
                        className="h-6 w-6 rounded flex items-center justify-center border border-transparent hover:border-destructive/25 hover:bg-destructive/10 text-foreground-subtle hover:text-destructive transition-colors cursor-pointer" title="Revoke share">
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between font-mono text-[10px] text-foreground-subtle select-none">
          <span>{filtered.length} items</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&lt;</button>
            <span className="px-2 text-foreground-muted font-bold">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&gt;</button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Revoke Share</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                Revoke <span className="text-accent font-bold">{revokeTarget.sharedWithName}</span>&apos;s access to <span className="text-accent font-bold">{revokeTarget.fileName}</span>.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
              <button onClick={() => setRevokeTarget(null)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleRevoke} disabled={revokeLoading}
                className="h-8 px-4 rounded-sm border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer">
                {revokeLoading ? <Loader2 size={12} className="animate-spin" /> : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
