"use client";

import React, { useState, useEffect } from "react";
import GovernanceTab from "@/components/features/admin/GovernanceTab";
import { adminApi, GovernanceRequest, formatTimestamp } from "@/lib/api";

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

export default function GovernanceAdminPage() {
  const [govRequests, setGovRequests] = useState<GovernanceRequest[]>([]);
  const [govLoading, setGovLoading] = useState(true);


  useEffect(() => {
    let cancelled = false;
    async function run() {
      setGovLoading(true);
      try {
        const res = await adminApi.getAdminGovernance();
        if (!cancelled) setGovRequests(res.requests);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setGovLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, []);

  const handleExportGovernance = () => {
    const headers = ["Type", "Title", "Requester", "Status", "Created"];
    const rows = govRequests.map(r => [
      r.type.replace(/_/g, " "),
      r.title,
      r.requestedByName,
      r.status,
      formatTimestamp(r.createdAt),
    ]);
    exportCSV(headers, rows, `governance-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground font-serif">Governance Console</h2>
          <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">Admin governance overview.</p>
        </div>
        <button
          onClick={handleExportGovernance}
          disabled={govRequests.length === 0}
          className="h-7 px-3 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[9px] font-bold uppercase font-mono transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export CSV
        </button>
      </div>
      <GovernanceTab
        govRequests={govRequests}
        setGovRequests={setGovRequests}
        govLoading={govLoading}
        setGovLoading={setGovLoading}
      />
    </div>
  );
}
