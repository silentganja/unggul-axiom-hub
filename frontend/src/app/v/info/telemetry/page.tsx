"use client";

import { useState } from "react";
import { LineChart, Activity, FileText, AlertTriangle, Sparkles, Terminal, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogSpan {
  tabName: string;
  description: string;
  jsonLog: string;
}

interface MetricCard {
  label: string;
  value: string;
  subtext: string;
  percentage: number;
}

interface ErrorDetails {
  code: string;
  symbol: string;
  httpStatus: number;
  description: string;
  ceoImpact: string;
  ctoImpact: string;
}

export default function InfoTelemetryPage() {
  const [activeLogTab, setActiveLogTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const logSpans: LogSpan[] = [
    {
      tabName: "HTTP API Request",
      description: "Root request entry logged at the Actix-Web middleware boundary using trace spans.",
      jsonLog: `{
  "timestamp": "2026-06-02T20:10:05.819Z",
  "level": "INFO",
  "target": "unggul_hub::middleware::logger",
  "span": {
    "name": "http_request",
    "request_id": "req-8f4b-29dc",
    "method": "POST",
    "uri": "/api/governance/requests/req-552/approve"
  },
  "fields": {
    "remote_ip": "192.168.1.45",
    "user_agent": "Mozilla/5.0...",
    "session_user_id": "usr-8a2b-cf91",
    "user_role": "Director"
  }
}`
    },
    {
      tabName: "DB Query Span",
      description: "Database connection checkout and query latency trace tracking performance timings.",
      jsonLog: `{
  "timestamp": "2026-06-02T20:10:05.824Z",
  "level": "DEBUG",
  "target": "unggul_hub::db::pool",
  "span": {
    "name": "sql_transaction",
    "tx_id": "tx-89b-90f",
    "query": "SELECT * FROM governance_requests WHERE id = $1 FOR UPDATE"
  },
  "fields": {
    "db_pool_active": 4,
    "db_pool_idle": 16,
    "bind_params": ["req-552"],
    "execution_time_ms": 3.82,
    "rows_returned": 1
  }
}`
    },
    {
      tabName: "Redis Cache Span",
      description: "Distributed cache lookups and message broadcast operations using publishing systems.",
      jsonLog: `{
  "timestamp": "2026-06-02T20:10:05.831Z",
  "level": "INFO",
  "target": "unggul_hub::cache::redis",
  "span": {
    "name": "redis_pubsub",
    "channel": "client_updates:file-889"
  },
  "fields": {
    "operation": "PUBLISH",
    "payload": "RAHSIA",
    "connected_subscribers": 18,
    "latency_us": 412
  }
}`
    },
    {
      tabName: "Compliance Exception",
      jsonLog: `{
  "timestamp": "2026-06-02T20:10:14.108Z",
  "level": "WARN",
  "target": "unggul_hub::governance::rules",
  "span": {
    "name": "classification_transition",
    "file_id": "file-104"
  },
  "fields": {
    "current_classification": "RAHSIA",
    "requested_classification": "TERBUKA",
    "error_code": "E002",
    "reason": "Forbidden classification downgrades without senior clearance",
    "action": "REJECTED_GOVERNANCE"
  }
}`,
      description: "Alert log capture when business governance conditions or validation rules are violated."
    }
  ];

  const metrics: MetricCard[] = [
    {
      label: "Active PostgreSQL Pool connections",
      value: "9 / 20 Connections Checked",
      subtext: "Capacity ceiling allows 20 peak connections",
      percentage: 45
    },
    {
      label: "HTTP request latency (p99 profile)",
      value: "24.8 ms latency",
      subtext: "Average response latency sits at 3.1ms",
      percentage: 24
    },
    {
      label: "Redis Cache hit rate metric",
      value: "94.2% Hits",
      subtext: "12,408 successful hits / 752 misses registered",
      percentage: 94
    },
    {
      label: "API Server memory profile",
      value: "42.8 MB / 512 MB Allocation",
      subtext: "Ultra-lean runtime footprint from compiled Rust",
      percentage: 8
    }
  ];

  const errors: ErrorDetails[] = [
    {
      code: "E001",
      symbol: "UNAUTHORIZED_SESSION",
      httpStatus: 401,
      description: "Authentication token was missing, expired, or failed security validation checks.",
      ceoImpact: "Blocks unauthorized personnel. Prevents external access vectors to private data.",
      ctoImpact: "Actix session middleware rejects request before executing DB resources."
    },
    {
      code: "E002",
      symbol: "INSUFFICIENT_CLEARANCE",
      httpStatus: 403,
      description: "User clearance level is below the required classification label of the file.",
      ceoImpact: "Enforces digital hierarchy boundaries. Restricts private documents to executives.",
      ctoImpact: "RBAC filter blocks query parameters, returning early before file serialization."
    },
    {
      code: "E003",
      symbol: "FILE_LOCKED_BY_COLLABORATOR",
      httpStatus: 409,
      description: "Resource editing operations attempted on a file locked by another team member.",
      ceoImpact: "Prevents concurrent updates and lost edits during document drafting cycles.",
      ctoImpact: "Violates record row locks. Prevents update query execution and rolls back."
    },
    {
      code: "E004",
      symbol: "CIRCULAR_DIRECTORY_PATH",
      httpStatus: 400,
      description: "Attempted to relocate a folder inside itself or inside one of its subfolders.",
      ceoImpact: "Guarantees folder database structure integrity. Avoids folder visual errors.",
      ctoImpact: "Backend runs recursive parent validation checks before issuing folder updates."
    },
    {
      code: "E005",
      symbol: "WEBAUTHN_CHALLENGE_TIMEOUT",
      httpStatus: 410,
      description: "Passkey biometric validation request was not completed within the 60 second window.",
      ceoImpact: "Prevents session hijacking by invalidating expired cryptographic challenges.",
      ctoImpact: "Redis TTL key eviction automatically wipes the challenge payload from memory."
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <LineChart size={12} /> SECTION 8.0 : OBSERVABILITY AND TELEMETRY
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Telemetry &amp; Structured Observability
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          The system exports granular, high-frequency diagnostic data to satisfy security compliance requirements. Through structured JSON spans and system metrics, engineers and administrators maintain complete transparency over transaction health.
        </p>
      </div>

      {/* Observability Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="border border-border/20 rounded-lg bg-background-panel/20 p-4 space-y-3 shadow-sm hover:border-border/40 transition-colors"
          >
            <div className="flex items-center justify-between text-foreground-subtle">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                {metric.label}
              </span>
              <Activity size={12} className="text-accent animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="text-lg sm:text-xl font-bold font-serif text-foreground">
                {metric.value}
              </span>
              <p className="text-[10px] font-mono text-foreground-subtle leading-relaxed">
                {metric.subtext}
              </p>
            </div>
            <div className="h-1.5 w-full bg-background-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${metric.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Structured Log Viewer Section */}
      <div className="border border-border/30 rounded-lg bg-background-panel/20 overflow-hidden shadow-lg">
        <div className="bg-background-panel/40 border-b border-border/20 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-accent" />
            <h3 className="font-serif font-bold text-sm text-foreground">
              Rust Tracing Crate Log Outputs
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="p-1.5 rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
              title="Refresh log simulation streams"
            >
              <RefreshCw size={12} className={cn("transition-transform duration-500", refreshKey > 0 && "rotate-180")} />
            </button>
            <span className="font-mono text-[9px] font-bold text-accent border border-accent/20 bg-accent-subtle/25 px-2 py-0.5 rounded uppercase">
              Format: json_structured
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
          {/* Log Navigation */}
          <div className="lg:col-span-4 bg-background-panel/30 border-b lg:border-b-0 lg:border-r border-border/20 p-4 space-y-2 select-none">
            <span className="font-mono text-[9px] font-bold tracking-widest text-foreground-subtle uppercase block pb-1 border-b border-border/10">
              Active Trace Targets
            </span>
            <div className="space-y-1">
              {logSpans.map((log, idx) => (
                <button
                  key={log.tabName}
                  onClick={() => setActiveLogTab(idx)}
                  className={cn(
                    "w-full flex flex-col p-2.5 rounded text-left font-mono transition-all cursor-pointer border",
                    activeLogTab === idx
                      ? "bg-accent/10 border-accent/40 text-accent font-bold"
                      : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/40"
                  )}
                >
                  <span className="text-xs">{log.tabName}</span>
                  <span className="text-[9px] text-foreground-subtle/60 truncate font-sans mt-0.5">
                    {log.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Log Code Block */}
          <div className="lg:col-span-8 p-4 sm:p-6 bg-background/40 flex flex-col justify-between min-w-0">
            <div className="space-y-2 flex-1">
              <span className="font-mono text-[9px] font-bold tracking-wider text-accent uppercase block">
                Target Trace Stream: {logSpans[activeLogTab].tabName}
              </span>
              <pre className="p-4 rounded border border-border/30 bg-background/80 font-mono text-xs leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all shadow-inner h-[280px]">
                {logSpans[activeLogTab].jsonLog}
              </pre>
            </div>
            <p className="font-sans text-[10px] text-foreground-subtle leading-relaxed mt-3 border-t border-border/10 pt-3">
              Stdout logs are filtered and shipped to central metric systems (e.g. Grafana Loki or AWS CloudWatch) for permanent retention.
            </p>
          </div>
        </div>
      </div>

      {/* Global System Errors Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/20 pb-2">
          <AlertTriangle size={14} className="text-accent" />
          <h3 className="font-mono text-[10px] font-semibold text-accent uppercase tracking-widest">
            Global System Error Directory
          </h3>
        </div>

        <div className="border border-border/20 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans border-collapse">
              <thead>
                <tr className="bg-background-panel/60 border-b border-border/20 font-mono text-foreground-subtle text-[9px] uppercase tracking-wider select-none">
                  <th className="p-3 w-20">Code</th>
                  <th className="p-3 w-48">Identifier</th>
                  <th className="p-3 w-20 text-center">HTTP Status</th>
                  <th className="p-3">Technical Trigger Details</th>
                  <th className="p-3">CTO Insight</th>
                  <th className="p-3">CEO Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10 text-xs leading-relaxed">
                {errors.map((err) => (
                  <tr key={err.code} className="hover:bg-background-panel/10 transition-colors">
                    <td className="p-3 font-mono font-bold text-accent">{err.code}</td>
                    <td className="p-3 font-mono text-foreground font-semibold">{err.symbol}</td>
                    <td className="p-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-background-subtle border border-border text-foreground-subtle">
                        {err.httpStatus}
                      </span>
                    </td>
                    <td className="p-3 text-foreground-muted">{err.description}</td>
                    <td className="p-3 text-[11px] font-mono text-foreground-subtle/80">{err.ctoImpact}</td>
                    <td className="p-3 text-[11px] text-foreground-subtle/80">{err.ceoImpact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Observability Value Propositions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-sans">
        <div className="border border-border/20 rounded-lg bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" />
            <h4 className="font-serif font-bold text-base text-foreground">Compliance Auditing Standards</h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            By collecting structured tracing identifiers at the middleware layer, our log structures conform directly to SOC 2 compliance standards. Every state change is tied to verified cryptographic identifiers, preventing audit modifications.
          </p>
        </div>

        <div className="border border-border/20 rounded-lg bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" />
            <h4 className="font-serif font-bold text-base text-foreground">Real-Time Alert Metrics</h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            API performance benchmarks are exported continuously. PromQL targets alert system administrators in the event that average request latency rises above 50ms, or if database pools checkout fail, mitigating downtime vectors.
          </p>
        </div>
      </div>
    </div>
  );
}
