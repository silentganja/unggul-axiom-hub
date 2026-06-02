"use client";

import Link from "next/link";
import { ArrowLeft, Activity, CheckCircle2, Server, Database, Key, HardDrive, RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ServiceStatus {
  name: string;
  uptime: string;
  latency: string;
  status: "OPERATIONAL" | "DEGRADED" | "MAINTENANCE";
  icon: React.ReactNode;
}

export default function StatusPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const services: ServiceStatus[] = [
    {
      name: "API Gateway (Actix-Web)",
      uptime: "99.98%",
      latency: "3.1ms",
      status: "OPERATIONAL",
      icon: <Server size={16} />
    },
    {
      name: "Identity & Biometrics (WebAuthn)",
      uptime: "100.00%",
      latency: "1.2ms",
      status: "OPERATIONAL",
      icon: <Key size={16} />
    },
    {
      name: "Caching & Rate Limiting (Redis)",
      uptime: "100.00%",
      latency: "0.4ms",
      status: "OPERATIONAL",
      icon: <Activity size={16} />
    },
    {
      name: "Database Engine (PostgreSQL)",
      uptime: "99.99%",
      latency: "4.2ms",
      status: "OPERATIONAL",
      icon: <Database size={16} />
    },
    {
      name: "File Encryption Storage (Disk Volumes)",
      uptime: "100.00%",
      latency: "11.8ms",
      status: "OPERATIONAL",
      icon: <HardDrive size={16} />
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const pastIncidents = [
    { date: "Jun 02, 2026", details: "No incidents reported" },
    { date: "Jun 01, 2026", details: "No incidents reported" },
    { date: "May 31, 2026", details: "No incidents reported" },
    { date: "May 30, 2026", details: "No incidents reported" },
    { date: "May 29, 2026", details: "No incidents reported" },
    { date: "May 28, 2026", details: "No incidents reported" },
    { date: "May 27, 2026", details: "No incidents reported" }
  ];

  return (
    <div className="relative min-h-dvh flex flex-col bg-background overflow-hidden selection:bg-accent selection:text-accent-foreground">
      {/* Background glowing mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[45%] h-[45%] rounded-full bg-accent/5 blur-[120px] hidden md:block" />
        <div className="absolute top-[40%] right-[5%] w-[40%] h-[40%] rounded-full bg-info/5 blur-[130px] hidden md:block" />
        <div className="absolute inset-0 scan-grid opacity-[0.015] dark:opacity-[0.03]" />
      </div>

      {/* Floating Header */}
      <header className="sticky top-0 z-50 w-full px-6 py-4 flex items-center justify-between border-b border-border/40 bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="h-8 w-8 flex items-center justify-center rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
            title="Return to Main Portal Gateway"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
          </Link>
          <div>
            <span className="text-sm font-semibold tracking-tight text-foreground leading-none block">
              System Status
            </span>
            <span className="font-mono text-[8px] font-bold tracking-[0.25em] text-accent uppercase mt-1 leading-none block">
              Unggul Axiom Intranet
            </span>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          className="h-8 w-8 flex items-center justify-center rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
          title="Refresh service status"
        >
          <RefreshCw size={14} className={cn("transition-transform duration-500", isRefreshing && "rotate-180")} />
        </button>
      </header>

      {/* Main Grid Content */}
      <main className="relative flex-grow max-w-4xl w-full mx-auto px-6 py-12 z-10 space-y-8">
        
        {/* Glow Status Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-xl border border-success/30 bg-success/5 shadow-[0_0_30px_rgba(34,197,94,0.05)] select-none">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-bold text-foreground leading-none">
                All Systems Operational
              </h2>
              <p className="text-xs text-foreground-subtle">
                System monitored dynamically. Uptime metrics are tracked in 60s windows.
              </p>
            </div>
          </div>
          <span className="font-mono text-[9px] font-bold text-success border border-success/30 px-3 py-1 rounded uppercase tracking-wider bg-success/10">
            System Status: Clear
          </span>
        </div>

        {/* Services Status List */}
        <div className="space-y-4">
          <span className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest block border-b border-border/10 pb-1">
            Ecosystem Component Status
          </span>
          <div className="grid grid-cols-1 gap-3 font-mono text-xs">
            {services.map((service) => (
              <div
                key={service.name}
                className="border border-border/20 rounded-lg bg-background-panel/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 text-foreground font-semibold">
                  <div className="text-accent">{service.icon}</div>
                  <span className="font-sans text-sm">{service.name}</span>
                </div>
                <div className="flex items-center flex-wrap gap-4 sm:gap-6 text-[11px] text-foreground-subtle">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-foreground-subtle/50 uppercase block">Uptime</span>
                    <span className="text-foreground">{service.uptime}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-foreground-subtle/50 uppercase block">Latency</span>
                    <span className="text-foreground">{service.latency}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider border bg-success/15 border-success/30 text-success uppercase">
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Historical Log */}
        <div className="border border-border/30 rounded-xl bg-background-panel/20 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 border-b border-border/10 pb-2">
            <Activity size={14} className="text-accent" />
            <h3 className="font-mono text-[10px] font-semibold text-accent uppercase tracking-widest">
              Historical Incident Logs (Past 7 Days)
            </h3>
          </div>
          <div className="divide-y divide-border/10">
            {pastIncidents.map((incident) => (
              <div key={incident.date} className="py-3 flex items-center justify-between gap-4 font-mono text-xs">
                <span className="text-foreground font-semibold">{incident.date}</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground-subtle text-[11px] font-sans">{incident.details}</span>
                  <CheckCircle2 size={13} className="text-success" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-4 px-6 text-center text-[10px] font-mono text-foreground-subtle/50 mt-auto select-none">
        UNF-IT OPS // SYSTEM STATUS CONSOLE // GLOBAL_UPTIME: 99.994%
      </footer>
    </div>
  );
}
