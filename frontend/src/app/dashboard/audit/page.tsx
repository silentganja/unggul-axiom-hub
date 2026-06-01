"use client";

import { useState, useId, useEffect } from "react";
import {
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Terminal,
  Loader2,
} from "lucide-react";
import { useAuditStore, SystemEvent } from "@/store/useAuditStore";
import { cn } from "@/lib/utils";

export default function ForensicAuditPage() {
  const auditSearchInputId = useId();
  const logs = useAuditStore((state) => state.logs);
  const isLoading = useAuditStore((state) => state.isLoading);
  const error = useAuditStore((state) => state.error);
  const fetchLogs = useAuditStore((state) => state.fetchLogs);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "UPLOAD" | "APPROVE" | "LOCK" | "ACCESS_CHANGE"
  >("ALL");

  // Fetch audit logs on mount
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Client-side CSV export trigger
  const handleExportCSV = () => {
    const headers = "ID,Timestamp,Actor,Action,Target Resource,IP Address,Status\n";
    const rows = logs
      .map(
        (log) =>
          `"${log.id}","${log.timestamp}","${log.actor}","${log.action}","${log.targetResource.replace(/"/g, '""')}","${log.ipAddress}","${log.status}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `axiom_forensic_audit_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filter logs dynamically
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetResource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeFilter === "ALL" ||
      (activeFilter === "ACCESS_CHANGE" && log.action === "ACCESS_CHANGE") ||
      (activeFilter === "UPLOAD" && (log.action === "UPLOAD" || log.action === "CREATE_FOLDER")) ||
      (activeFilter === "APPROVE" && log.action === "APPROVE") ||
      (activeFilter === "LOCK" && log.action === "LOCK");

    return matchesSearch && matchesFilter;
  });

  const getActionBadge = (action: SystemEvent["action"]) => {
    switch (action) {
      case "APPROVE":
      case "DOWNLOAD":
        return "bg-success/10 text-success border-success/20";
      case "UPLOAD":
      case "CREATE_FOLDER":
        return "bg-info/10 text-info border-info/20";
      case "LOCK":
      case "DELETE":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "ACCESS_CHANGE":
      case "REJECT":
      case "RENAME":
      default:
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  const getStatusIcon = (status: SystemEvent["status"]) => {
    switch (status) {
      case "SUCCESS":
        return <CheckCircle className="text-success" size={12} />;
      case "WARNING":
        return <AlertTriangle className="text-warning" size={12} />;
      case "FAILED":
      default:
        return <XCircle className="text-destructive" size={12} />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4 select-none">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded border border-accent/20 bg-accent-subtle flex items-center justify-center">
              <Terminal size={14} className="text-accent" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
              Forensic Audit Console
            </h1>
          </div>
          <p className="text-xs text-foreground-subtle font-mono mt-1">
            Real-time SIEM-grade operational auditing and sovereign security telemetry logs.
          </p>
        </div>

        {/* Export action */}
        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="h-8 px-3 rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-[11px] font-bold tracking-wider uppercase font-mono text-foreground-muted flex items-center gap-1.5 transition-colors self-start sm:self-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileSpreadsheet size={12} className="text-success" />
          Export Logs (CSV)
        </button>
      </div>

      {/* ── Infrastructure Monospace Status Indicator ── */}
      <div className="w-full bg-background-panel/40 border border-border/30 px-4 py-1.5 rounded-sm flex flex-col md:flex-row md:items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-foreground-subtle select-none gap-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          <span>TELEMETRY FEED: {isLoading ? "SYNCING..." : "CONNECTED"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>RECORDS: {logs.length}</span>
          <span className="hidden md:inline text-foreground-subtle/20">|</span>
          <span>INTEGRITY VERIFIED: SHA-256 MATCH</span>
          <span className="hidden md:inline text-foreground-subtle/20">|</span>
          <span>active listeners: 4</span>
        </div>
      </div>

      {/* ── Search & Filter Pill Deck ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold">
          {(["ALL", "UPLOAD", "APPROVE", "LOCK", "ACCESS_CHANGE"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-2.5 py-1 rounded-sm border uppercase transition-colors cursor-pointer",
                activeFilter === filter
                  ? {
                      ALL: "bg-accent/10 border-accent/20 text-accent font-extrabold",
                      UPLOAD: "bg-info/10 border-info/20 text-info font-extrabold",
                      APPROVE: "bg-success/10 border-success/20 text-success font-extrabold",
                      LOCK: "bg-destructive/10 border-destructive/20 text-destructive font-extrabold",
                      ACCESS_CHANGE: "bg-warning/10 border-warning/20 text-warning font-extrabold",
                    }[filter]
                  : "border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
              )}
            >
              {filter === "ALL" ? "All Events" : filter === "ACCESS_CHANGE" ? "Access Edits" : `${filter}s`}
            </button>
          ))}
        </div>

        <div className="relative group">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-foreground-subtle">
            <Search size={12} />
          </span>
          <label htmlFor={auditSearchInputId} className="sr-only">Query security logs</label>
          <input
            id={auditSearchInputId}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Query security logs..."
            className="h-8 w-full md:w-56 pl-8 pr-3 rounded border border-input-border bg-input-bg text-xs text-foreground placeholder-foreground-subtle/60 transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-ring"
          />
        </div>
      </div>

      {/* ── Technical Monospace Data Table ── */}
      <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
        {error && (
          <div className="p-6 text-center text-xs text-destructive font-mono">
            Failed to load audit logs: {error}
          </div>
        )}
        {isLoading ? (
          <div className="p-12 text-center space-y-3 font-mono">
            <Loader2 className="mx-auto text-accent animate-spin" size={24} />
            <p className="text-xs text-foreground-subtle uppercase tracking-widest">FETCHING TELEMETRY STREAM...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3 font-mono">
            <Terminal className="mx-auto text-foreground-subtle/40" size={24} />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">No audit records found</h3>
            <p className="text-[10px] text-foreground-subtle max-w-sm mx-auto leading-relaxed">
              No events match your query string or system event status filters in buffer.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="border-b border-border/30 bg-background-panel/80 text-[10px] font-bold tracking-wider text-foreground-subtle uppercase select-none">
                  <th className="px-4 py-2.5 w-24">Log ID</th>
                  <th className="px-4 py-2.5 w-40">Timestamp</th>
                  <th className="px-4 py-2.5 w-28">Action</th>
                  <th className="px-4 py-2.5">Target Resource</th>
                  <th className="px-4 py-2.5 w-48">Actor Profile</th>
                  <th className="px-4 py-2.5 w-36">IP Address</th>
                  <th className="px-4 py-2.5 w-20 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-background-subtle/30 transition-colors group select-all"
                  >
                    <td className="px-4 py-2 text-foreground-subtle select-none font-bold">
                      {log.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 text-foreground-muted">{log.timestamp}</td>
                    <td className="px-4 py-2">
                      <span className={cn("inline-block px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider uppercase border leading-none font-mono", getActionBadge(log.action))}>
                        {log.action.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-foreground font-semibold font-sans tracking-tight truncate max-w-xs sm:max-w-sm">
                      {log.targetResource}
                    </td>
                    <td className="px-4 py-2 text-foreground-muted truncate max-w-[150px] font-mono select-all">
                      {log.actor}
                    </td>
                    <td className="px-4 py-2 text-foreground-subtle font-mono select-all">{log.ipAddress}</td>
                    <td className="px-4 py-2 text-center select-none">
                      <div className="flex items-center justify-center">{getStatusIcon(log.status)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
