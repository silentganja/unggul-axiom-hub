"use client";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { adminApi, GovernanceRequest, AdminUserEntry } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  govRequests: GovernanceRequest[];
  setGovRequests: (r: GovernanceRequest[]) => void;
  govLoading: boolean; setGovLoading: (v: boolean) => void;
  fetchUsers: () => void;
}

export default function GovernanceTab({ govRequests, setGovRequests, govLoading, setGovLoading }: Props) {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");

  useEffect(() => {
    setGovLoading(true);
    Promise.all([adminApi.getAdminGovernance(), adminApi.listUsers()])
      .then(([g, u]) => { setGovRequests(g); setUsers(u); })
      .catch(() => {})
      .finally(() => setGovLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleForceApprove = async (reqId: string) => {
    if (!selectedReviewer) return;
    try { await adminApi.forceApprove(reqId, selectedReviewer); setGovRequests(govRequests.filter(r => r.id !== reqId)); }
    catch { alert("Force approve failed"); }
  };

  const pending = govRequests.filter(r => r.status === "PENDING");
  const processed = govRequests.filter(r => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground font-serif">All Governance Requests</h2>
          <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">Admin overview of all requests across the system.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-foreground-subtle font-mono">Reviewer:</span>
          <select value={selectedReviewer} onChange={e => setSelectedReviewer(e.target.value)}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="">Select...</option>
            {users.filter(u => u.role === "chief" || u.role === "director").map(u => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
            ))}
          </select>
        </div>
      </div>

      {govLoading ? (
        <div className="py-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>
      ) : (
        <>
          <div className="space-y-2">
            <span className="font-mono text-[9px] font-bold text-foreground-subtle uppercase tracking-wider">Pending ({pending.length})</span>
            {pending.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border/20 rounded-sm"><CheckCircle className="mx-auto text-success/60 mb-2" size={18} /><p className="text-[10px] font-mono text-foreground-subtle">No pending requests</p></div>
            ) : pending.map(r => (
              <div key={r.id} className="p-3 border border-border/30 rounded-sm bg-background-panel/40 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className={cn("px-1.5 py-0.5 rounded-sm text-[8px] font-bold font-mono uppercase border", r.type.includes("LOCK") ? "bg-warning/10 text-warning border-warning/20" : "bg-info/10 text-info border-info/20")}>{r.type.replace(/_/g, " ")}</span><span className="font-mono text-[9px] text-foreground-subtle">{r.requestedByName}</span></div>
                  <h4 className="text-xs font-bold text-foreground truncate mt-1">{r.title}</h4>
                </div>
                <button onClick={() => handleForceApprove(r.id)} disabled={!selectedReviewer} className="h-6 px-2.5 rounded-sm border border-success/20 text-success bg-success/5 hover:bg-success/15 text-[9px] font-bold uppercase font-mono transition-all cursor-pointer disabled:opacity-30">Force Approve</button>
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-3 border-t border-border/10">
            <span className="font-mono text-[9px] font-bold text-foreground-subtle/70 uppercase tracking-wider">Processed ({processed.length})</span>
            {processed.slice(0, 30).map(r => (
              <div key={r.id} className="p-2 border border-border/10 rounded-sm bg-background/10 flex items-center justify-between text-[10px] font-mono">
                <span className="truncate">{r.title}</span>
                <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold uppercase", r.status === "APPROVED" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>{r.status}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
