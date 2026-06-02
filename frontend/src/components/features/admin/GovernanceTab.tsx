"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, CheckCircle, X, Check, AlertCircle,
  Undo2, FileText,
} from "lucide-react";
import {
  adminApi, GovernanceRequest, AdminUserEntry,
  governanceApi, formatTimestamp,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  govRequests: GovernanceRequest[];
  setGovRequests: (r: GovernanceRequest[]) => void;
  govLoading: boolean; setGovLoading: (v: boolean) => void;
  fetchUsers: () => void;
}

const REQUEST_TYPES = [
  "ALL",
  "FILE_LOCK",
  "FILE_UNLOCK",
  "CLASSIFICATION_UPGRADE",
  "CLASSIFICATION_DOWNGRADE",
  "FILE_MOVE",
  "FILE_DELETE",
] as const;

const STATUSES = ["ALL", "PENDING", "APPROVED", "REJECTED"] as const;

const typeColorMap: Record<string, string> = {
  FILE_LOCK: "bg-destructive/10 text-destructive border-destructive/20",
  FILE_UNLOCK: "bg-success/10 text-success border-success/20",
  CLASSIFICATION_UPGRADE: "bg-warning/10 text-warning border-warning/20",
  CLASSIFICATION_DOWNGRADE: "bg-warning/10 text-warning border-warning/20",
  FILE_MOVE: "bg-info/10 text-info border-info/20",
  FILE_DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

function filterRequests(requests: GovernanceRequest[], status: string, type: string) {
  return requests.filter(r => {
    if (status !== "ALL" && r.status !== status) return false;
    if (type !== "ALL" && r.type !== type) return false;
    return true;
  });
}

export default function GovernanceTab({ govRequests, setGovRequests, govLoading, setGovLoading }: Props) {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(20);

  // Batch selection
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);

  // Reject modal state
  const [rejectModal, setRejectModal] = useState<{
    requestId: string;
    reason: string;
    error: string | null;
    loading: boolean;
  } | null>(null);

  // Batch confirm modal
  const [batchModal, setBatchModal] = useState<{
    action: "APPROVE" | "REJECT";
    reason: string;
    error: string | null;
    loading: boolean;
  } | null>(null);

  // Expanded row for review note
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async (pg: number) => {
    setGovLoading(true);
    try {
      const [g, u] = await Promise.all([
        adminApi.getAdminGovernance(),
        adminApi.listUsers(),
      ]);
      setGovRequests(g);
      setUsers(u);

      // Apply client-side pagination/filtering
      const filtered = filterRequests(g, statusFilter, typeFilter);
      const totalItems = filtered.length;
      const totalPgs = Math.max(1, Math.ceil(totalItems / perPage));
      setTotal(totalItems);
      setTotalPages(totalPgs);
      if (pg > totalPgs) setPage(totalPgs);
    } catch {}
    finally { setGovLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = filterRequests(govRequests, statusFilter, typeFilter);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleForceApprove = async (reqId: string) => {
    if (!selectedReviewer) return;
    try {
      await adminApi.forceApprove(reqId, selectedReviewer);
      setGovRequests(govRequests.filter(r => r.id !== reqId));
      setBatchSelectedIds(prev => prev.filter(id => id !== reqId));
    } catch { alert("Force approve failed"); }
  };

  const handleReject = async (reqId: string, reason: string) => {
    try {
      await governanceApi.reject(reqId, reason);
      setGovRequests(govRequests.filter(r => r.id !== reqId));
      setRejectModal(null);
      setBatchSelectedIds(prev => prev.filter(id => id !== reqId));
    } catch (err) {
      throw err;
    }
  };

  const handleUndo = async (reqId: string) => {
    try {
      await governanceApi.undo(reqId);
      const g = await adminApi.getAdminGovernance();
      setGovRequests(g);
    } catch { alert("Undo failed"); }
  };

  const handleBatchApprove = async () => {
    if (!selectedReviewer) return;
    try {
      for (const id of batchSelectedIds) {
        await adminApi.forceApprove(id, selectedReviewer);
      }
      setGovRequests(govRequests.filter(r => !batchSelectedIds.includes(r.id)));
      setBatchSelectedIds([]);
    } catch { alert("Batch approve failed"); }
  };

  const handleBatchReject = async (reason: string) => {
    try {
      await governanceApi.batchReject(batchSelectedIds, reason);
      setGovRequests(govRequests.filter(r => !batchSelectedIds.includes(r.id)));
      setBatchSelectedIds([]);
    } catch (err) {
      throw err;
    }
  };

  // Re-apply filters when status/type changes
  useEffect(() => {
    const f = filterRequests(govRequests, statusFilter, typeFilter);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTotal(f.length);
    setTotalPages(Math.max(1, Math.ceil(f.length / perPage)));
    setPage(1);
  }, [statusFilter, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeBatchCount = batchSelectedIds.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground font-serif">Governance Console</h2>
          <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
            {total} requests — {govRequests.filter(r => r.status === "PENDING").length} pending
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-foreground-subtle uppercase">Status:</span>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
            {STATUSES.map(s => <option key={s} value={s}>{s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono text-foreground-subtle uppercase">Type:</span>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
            {REQUEST_TYPES.map(t => <option key={t} value={t}>{t === "ALL" ? "All types" : t.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <span className="text-[9px] font-mono text-foreground-subtle ml-auto">{total} result{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      {govLoading ? (
        <div className="py-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>
      ) : paginated.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-border/20 rounded-sm">
          <CheckCircle className="mx-auto text-success/60 mb-2" size={24} />
          <p className="text-[10px] font-mono text-foreground-subtle">No requests match the current filters</p>
        </div>
      ) : (
        <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border/30 bg-background-panel/80 text-[10px] font-bold tracking-wider text-foreground-subtle uppercase">
                  <th className="px-3 py-2.5 w-8">
                    <label className="relative flex items-center justify-center cursor-pointer">
                      <input type="checkbox" checked={paginated.length > 0 && paginated.every(r => batchSelectedIds.includes(r.id))}
                        onChange={() => {
                          const allIds = paginated.map(r => r.id);
                          const allSelected = allIds.every(id => batchSelectedIds.includes(id));
                          setBatchSelectedIds(allSelected ? [] : allIds);
                        }}
                        className="sr-only peer" />
                      <span className="h-3.5 w-3.5 rounded-sm border border-input-border bg-input-bg transition-all peer-checked:bg-accent peer-checked:border-accent flex items-center justify-center">
                        <Check size={8} className="text-accent-foreground hidden peer-checked:block" strokeWidth={3} />
                      </span>
                    </label>
                  </th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Title</th>
                  <th className="px-3 py-2.5 w-28">Requester</th>
                  <th className="px-3 py-2.5 w-24">Created</th>
                  <th className="px-3 py-2.5 w-20 text-center">Status</th>
                  <th className="px-3 py-2.5 w-44 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {paginated.map(r => (
                  <tr key={r.id} className="hover:bg-background-subtle/30 transition-colors group">
                    <td className="px-3 py-2.5 text-center">
                      <label className="relative flex items-center justify-center cursor-pointer">
                        <input type="checkbox" checked={batchSelectedIds.includes(r.id)}
                          onChange={() => {
                            setBatchSelectedIds(prev =>
                              prev.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id]
                            );
                          }}
                          className="sr-only peer" />
                        <span className="h-3.5 w-3.5 rounded-sm border border-input-border bg-input-bg transition-all peer-checked:bg-accent peer-checked:border-accent flex items-center justify-center">
                          <Check size={8} className="text-accent-foreground hidden peer-checked:block" strokeWidth={3} />
                        </span>
                      </label>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn("px-1.5 py-0.5 rounded-sm text-[8px] font-bold font-mono uppercase border", typeColorMap[r.type] || "bg-background-muted/40 text-foreground-subtle border-border/40")}>
                        {r.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-foreground truncate max-w-[200px] font-semibold">{r.title}</span>
                        {r.reviewNote && (
                          <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                            className="text-foreground-subtle hover:text-accent transition-colors cursor-pointer" title="View review note">
                            <FileText size={11} />
                          </button>
                        )}
                      </div>
                      {expandedId === r.id && r.reviewNote && (
                        <div className="mt-1.5 text-[9px] text-foreground-subtle font-mono bg-background/50 border border-border/20 rounded-sm px-2 py-1">
                          <span className="font-bold text-foreground-muted">Review Note: </span>{r.reviewNote}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-foreground-muted">{r.requestedByName}</td>
                    <td className="px-3 py-2.5 text-foreground-muted text-[10px]">{formatTimestamp(r.createdAt)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                        r.status === "PENDING" ? "bg-warning/10 text-warning border border-warning/20" :
                        r.status === "APPROVED" ? "bg-success/10 text-success border border-success/20" :
                        "bg-destructive/10 text-destructive border border-destructive/20"
                      )}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {r.status === "PENDING" ? (
                          <>
                            <button onClick={() => handleForceApprove(r.id)} disabled={!selectedReviewer}
                              className="h-6 px-2 rounded-sm border border-success/20 text-success bg-success/5 hover:bg-success/15 text-[8px] font-bold uppercase font-mono transition-all disabled:opacity-30 cursor-pointer">Approve</button>
                            <button onClick={() => setRejectModal({ requestId: r.id, reason: "", error: null, loading: false })}
                              className="h-6 px-2 rounded-sm border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/15 text-[8px] font-bold uppercase font-mono transition-all cursor-pointer">Reject</button>
                          </>
                        ) : (
                          <>
                            {r.reviewedByName && <span className="text-[8px] text-foreground-subtle font-mono mr-1">{r.reviewedByName}</span>}
                            <button onClick={() => handleUndo(r.id)}
                              className="h-6 w-6 rounded flex items-center justify-center border border-border/20 hover:border-accent/30 hover:bg-accent/5 text-foreground-subtle hover:text-accent transition-all cursor-pointer" title="Undo">
                              <Undo2 size={10} />
                            </button>
                          </>
                        )}
                      </div>
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
          <span>{total} total</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&lt;</button>
            <span className="px-2 text-foreground-muted font-bold">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&gt;</button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground font-serif">Reject Request</h3>
            {rejectModal.error && <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle size={12} className="mt-0.5 shrink-0" /><span>{rejectModal.error}</span></div>}
            <div>
              <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Reason <span className="text-destructive">*</span></label>
              <textarea rows={3} value={rejectModal.reason} onChange={e => setRejectModal({ ...rejectModal, reason: e.target.value })}
                placeholder="Provide a detailed reason..."
                className="w-full px-2.5 py-1.5 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none" autoFocus />
              <p className="text-[8px] font-mono text-foreground-subtle/60 mt-1">{rejectModal.reason.length}/10 minimum</p>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
              <button onClick={() => setRejectModal(null)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer">Cancel</button>
              <button onClick={async () => {
                if (rejectModal.reason.trim().length < 10) { setRejectModal({ ...rejectModal, error: "Minimum 10 characters required." }); return; }
                setRejectModal({ ...rejectModal, loading: true, error: null });
                try {
                  await handleReject(rejectModal.requestId, rejectModal.reason.trim());
                } catch (err) {
                  setRejectModal({ ...rejectModal, loading: false, error: err instanceof Error ? err.message : "Failed to reject" });
                }
              }} disabled={rejectModal.loading}
                className="h-8 px-4 rounded-sm border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer">
                {rejectModal.loading ? <Loader2 size={12} className="animate-spin" /> : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Action Bar */}
      {activeBatchCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-in fade-in slide-in-from-bottom-4 duration-250 select-none">
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-accent/20 bg-background-panel/90 backdrop-blur-md shadow-md text-foreground">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-accent/15 border border-accent/25 text-accent text-[9px] font-bold font-mono flex items-center justify-center">{activeBatchCount}</div>
              <span className="font-mono text-[11px] font-semibold text-foreground-muted">{activeBatchCount} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={!selectedReviewer}
                onClick={() => setBatchModal({ action: "REJECT", reason: "", error: null, loading: false })}
                className="h-7 px-2.5 rounded-sm border border-destructive/25 text-destructive bg-destructive/5 hover:bg-destructive/15 text-[9px] font-bold uppercase font-mono transition-all disabled:opacity-30 cursor-pointer">Batch Reject</button>
              <button disabled={!selectedReviewer} onClick={handleBatchApprove}
                className="h-7 px-2.5 rounded-sm border border-success/25 text-success bg-success/5 hover:bg-success/15 text-[9px] font-bold uppercase font-mono transition-all disabled:opacity-30 cursor-pointer">Batch Approve</button>
              <span className="h-4 w-px bg-border/30" />
              <button onClick={() => setBatchSelectedIds([])} className="h-6 w-6 rounded flex items-center justify-center hover:bg-background-subtle/40 border border-transparent hover:border-border text-foreground-subtle hover:text-foreground transition-all cursor-pointer"><X size={11} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Reject Modal */}
      {batchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground font-serif">{batchModal.action === "APPROVE" ? "Batch Approve" : "Batch Reject"} ({activeBatchCount})</h3>
            {batchModal.error && <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle size={12} className="mt-0.5 shrink-0" /><span>{batchModal.error}</span></div>}
            {batchModal.action === "REJECT" && (
              <div>
                <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Reason <span className="text-destructive">*</span></label>
                <textarea rows={3} value={batchModal.reason} onChange={e => setBatchModal({ ...batchModal, reason: e.target.value })}
                  placeholder="Provide a reason for all selected..."
                  className="w-full px-2.5 py-1.5 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none" autoFocus />
                <p className="text-[8px] font-mono text-foreground-subtle/60 mt-1">{batchModal.reason.length}/10 minimum</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
              <button onClick={() => setBatchModal(null)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer">Cancel</button>
              {batchModal.action === "REJECT" && (
                <button onClick={async () => {
                  if (batchModal.reason.trim().length < 10) { setBatchModal({ ...batchModal, error: "Minimum 10 characters required." }); return; }
                  setBatchModal({ ...batchModal, loading: true, error: null });
                  try { await handleBatchReject(batchModal.reason.trim()); setBatchModal(null); }
                  catch (err) { setBatchModal({ ...batchModal, loading: false, error: err instanceof Error ? err.message : "Failed" }); }
                }} disabled={batchModal.loading}
                  className="h-8 px-4 rounded-sm border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer">
                  {batchModal.loading ? <Loader2 size={12} className="animate-spin" /> : "Confirm Reject"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
