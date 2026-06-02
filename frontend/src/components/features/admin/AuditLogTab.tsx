"use client";
import { useEffect, useState } from "react";
import {
  Loader2, AlertCircle, Download, Search,
} from "lucide-react";
import {
  adminApi, AuditLogEntry, AdminUserEntry,
  formatTimestamp,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const ACTION_TYPES = [
  "ALL",
  "FILE_UPLOAD",
  "FILE_DOWNLOAD",
  "FILE_DELETE",
  "FILE_RENAME",
  "FILE_MOVE",
  "FILE_LOCK",
  "FILE_UNLOCK",
  "SHARE_ADD",
  "SHARE_REMOVE",
  "CLASSIFICATION_CHANGE",
  "GOV_APPROVED",
  "GOV_REJECTED",
  "GOV_REQUEST",
  "USER_LOGIN",
  "USER_LOGOUT",
  "USER_CREATE",
  "USER_UPDATE",
  "USER_DELETE",
];

const actionColorMap: Record<string, string> = {
  FILE_UPLOAD: "bg-success/10 text-success border-success/20",
  FILE_DOWNLOAD: "bg-info/10 text-info border-info/20",
  FILE_DELETE: "bg-destructive/10 text-destructive border-destructive/20",
  FILE_RENAME: "bg-background-muted/40 text-foreground-subtle border-border/40",
  FILE_MOVE: "bg-info/10 text-info border-info/20",
  FILE_LOCK: "bg-warning/10 text-warning border-warning/20",
  FILE_UNLOCK: "bg-success/10 text-success border-success/20",
  SHARE_ADD: "bg-accent/10 text-accent border-accent/20",
  SHARE_REMOVE: "bg-destructive/10 text-destructive border-destructive/20",
  CLASSIFICATION_CHANGE: "bg-warning/10 text-warning border-warning/20",
  GOV_APPROVED: "bg-success/10 text-success border-success/20",
  GOV_REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
  GOV_REQUEST: "bg-warning/10 text-warning border-warning/20",
  USER_LOGIN: "bg-info/10 text-info border-info/20",
  USER_LOGOUT: "bg-foreground-subtle/10 text-foreground-subtle border-border/20",
};

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

export default function AuditLogTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterUser, setFilterUser] = useState("ALL");
  const [filterAction, setFilterAction] = useState("ALL");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 30;

  // Search (client-side, filters current page only)
  const [search, setSearch] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  const fetchLogs = async (pg: number) => {
    setLoading(true);
    setError(null);
    try {
      const [result, u] = await Promise.all([
        adminApi.listAuditLogs({
          page: pg,
          perPage,
          userId: filterUser !== "ALL" ? filterUser : undefined,
          action: filterAction !== "ALL" ? filterAction : undefined,
          from: filterFrom || undefined,
          to: filterTo || undefined,
        }),
        adminApi.listUsers(),
      ]);
      setEntries(result.entries);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setPage(result.page);
      setUsers(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh when filters change
  const handleFilterChange = () => {
    setPage(1);
    fetchLogs(1);
  };

  const filtered = entries.filter(e => {
    if (search && !e.action.toLowerCase().includes(search.toLowerCase()) && !(e.targetResource || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleExport = async () => {
    setExportLoading(true);
    try {
      // Fetch ALL matching entries with a high limit for export
      const all = await adminApi.listAuditLogs({
        perPage: 9999,
        userId: filterUser !== "ALL" ? filterUser : undefined,
        action: filterAction !== "ALL" ? filterAction : undefined,
        from: filterFrom || undefined,
        to: filterTo || undefined,
      });
      const headers = ["Timestamp", "User", "Action", "Target Resource", "IP Address"];
      const rows = all.entries.map(e => [
        formatTimestamp(e.createdAt),
        e.userName || "—",
        e.action.replace(/_/g, " "),
        e.targetResource || "—",
        e.ipAddress || "—",
      ]);
      exportCSV(headers, rows, `audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground font-serif">Audit Log</h2>
          <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
            {total} entries recorded
          </p>
        </div>
        <button onClick={handleExport} disabled={exportLoading || filtered.length === 0}
          className="h-7 px-3 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[9px] font-bold uppercase font-mono transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
          {exportLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-foreground-subtle uppercase">User:</span>
          <select value={filterUser} onChange={e => { setFilterUser(e.target.value); handleFilterChange(); }}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="ALL">All Users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-foreground-subtle uppercase">Action:</span>
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); handleFilterChange(); }}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
            {ACTION_TYPES.map(a => <option key={a} value={a}>{a === "ALL" ? "All" : a.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-foreground-subtle uppercase">From:</span>
          <input type="date" value={filterFrom} onChange={e => { setFilterFrom(e.target.value); handleFilterChange(); }}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-foreground-subtle uppercase">To:</span>
          <input type="date" value={filterTo} onChange={e => { setFilterTo(e.target.value); handleFilterChange(); }}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search (current page)..."
            className="h-7 w-44 pl-7 pr-2 rounded-sm border border-input-border bg-input-bg text-[10px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border/20 rounded-sm">
          <p className="text-[10px] font-mono text-foreground-subtle">No audit entries found</p>
        </div>
      ) : (
        <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border/30 bg-background-panel/80 text-[10px] font-bold tracking-wider text-foreground-subtle uppercase">
                  <th className="px-4 py-2.5 w-36">Timestamp</th>
                  <th className="px-4 py-2.5 w-28">User</th>
                  <th className="px-4 py-2.5 w-32">Action</th>
                  <th className="px-4 py-2.5">Target</th>
                  <th className="px-4 py-2.5 w-32">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {filtered.map(e => (
                  <tr key={e.id} className="hover:bg-background-subtle/30 transition-colors">
                    <td className="px-4 py-2 text-foreground-muted text-[10px]">{formatTimestamp(e.createdAt)}</td>
                    <td className="px-4 py-2 text-foreground">{e.userName || "—"}</td>
                    <td className="px-4 py-2">
                      <span className={cn("px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase border inline-block",
                        actionColorMap[e.action] || "bg-background-muted/40 text-foreground-subtle border-border/40"
                      )}>{e.action.replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-4 py-2 text-foreground-muted truncate max-w-[200px]">{e.targetResource || "—"}</td>
                    <td className="px-4 py-2 text-foreground-muted text-[10px] font-mono">{e.ipAddress || "—"}</td>
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
          <span>{total} total</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)}
              className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&lt;</button>
            <span className="px-2 text-foreground-muted font-bold">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}
              className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&gt;</button>
          </div>
        </div>
      )}
    </div>
  );
}
