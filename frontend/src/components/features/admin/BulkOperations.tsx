"use client";
import { Loader2 } from "lucide-react";
import { adminApi, AdminUserEntry } from "@/lib/api";
import { useToastStore } from "@/components/ui/Toast";

interface Props {
  users: AdminUserEntry[];
  fetchUsers: () => void;
  bulkCsvText: string; setBulkCsvText: (v: string) => void;
  bulkResult: { created: number; errors: string[] } | null; setBulkResult: (r: { created: number; errors: string[] } | null) => void;
  bulkLoading: boolean; setBulkLoading: (v: boolean) => void;
  bulkRoleUserIds: string[]; setBulkRoleUserIds: (ids: string[]) => void;
  bulkRoleTarget: string; setBulkRoleTarget: (v: string) => void;
}

export default function BulkOperations({ users, fetchUsers, bulkCsvText, setBulkCsvText, bulkResult, setBulkResult, bulkLoading, setBulkLoading, bulkRoleUserIds, setBulkRoleUserIds, bulkRoleTarget, setBulkRoleTarget }: Props) {
  const handleBulkImport = async () => {
    const lines = bulkCsvText.trim().split("\n").filter(Boolean);
    const errors: string[] = [];
    const parsed = lines.map((line, idx) => {
      const [email, password, fullName, role] = line.split(",").map(s => s.trim());
      if (!email) errors.push(`Line ${idx + 1}: missing email`);
      if (!password) errors.push(`Line ${idx + 1}: missing password`);
      return { email, password, fullName: fullName || (email ? email.split("@")[0] : ""), role: role || "staff" };
    });
    if (errors.length > 0) {
      useToastStore.getState().error(`CSV validation failed: ${errors.length} row(s) have errors`);
      return;
    }
    if (parsed.length === 0) return;
    if (!confirm(`Import ${parsed.length} users?`)) return;
    setBulkLoading(true);
    try { setBulkResult(await adminApi.bulkCreateUsers(parsed)); fetchUsers(); }
    catch { useToastStore.getState().error("Bulk import failed"); }
    finally { setBulkLoading(false); }
  };

  const handleBulkRole = async () => {
    if (bulkRoleUserIds.length === 0) return;
    if (!confirm(`Update ${bulkRoleUserIds.length} users to role "${bulkRoleTarget}"?`)) return;
    setBulkLoading(true);
    try { await adminApi.bulkRoleUpdate(bulkRoleUserIds, bulkRoleTarget); fetchUsers(); setBulkRoleUserIds([]); }
    catch { useToastStore.getState().error("Bulk role update failed"); }
    finally { setBulkLoading(false); }
  };

  const toggleUser = (id: string) => {
    setBulkRoleUserIds(bulkRoleUserIds.includes(id) ? bulkRoleUserIds.filter(uid => uid !== id) : [...bulkRoleUserIds, id]);
  };

  return (
    <div className="space-y-4 border-t border-border/20 pt-4">
      <h3 className="text-sm font-bold text-foreground font-serif">Bulk Operations</h3>

      {/* CSV Import */}
      <div className="space-y-2">
        <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle">Import Users (CSV)</span>
        <p className="text-[8px] text-foreground-subtle/70 font-mono">Format: email,password,fullName,role - one per line</p>
        <textarea rows={4} value={bulkCsvText} onChange={e => setBulkCsvText(e.target.value)}
          placeholder="admin@unggulaxiom.com,pass123,Admin User,chief&#10;staff@unggulaxiom.com,pass456,Staff User,staff"
          className="w-full px-2.5 py-1.5 rounded-sm border border-border bg-background text-[10px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none" />
        <button onClick={handleBulkImport} disabled={bulkLoading || !bulkCsvText.trim()}
          className="btn-shimmer h-7 px-3 rounded-sm text-[9px] font-bold tracking-wider uppercase font-mono disabled:opacity-50">
          {bulkLoading ? <Loader2 size={10} className="animate-spin inline mr-1" /> : null}Import Users
        </button>
        {bulkResult && (
          <div className="text-[9px] font-mono p-2 rounded-sm border border-border/20 bg-background/30">
            <span className="text-success font-bold">{bulkResult.created} created</span>
            {bulkResult.errors.length > 0 && <span className="text-destructive ml-2">{bulkResult.errors.length} errors</span>}
            {bulkResult.errors.map((e, i) => <div key={i} className="text-destructive/80 mt-1">{e}</div>)}
          </div>
        )}
      </div>

      {/* Bulk Role Change */}
      <div className="space-y-2 pt-2 border-t border-border/10">
        <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle">Bulk Role Change ({bulkRoleUserIds.length} selected)</span>
        <div className="flex items-center gap-2">
          <select value={bulkRoleTarget} onChange={e => setBulkRoleTarget(e.target.value)}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="staff">Staff</option><option value="officer">Officer</option><option value="director">Director</option><option value="chief">Chief</option>
          </select>
          <button onClick={handleBulkRole} disabled={bulkRoleUserIds.length === 0 || bulkLoading}
            className="btn-shimmer h-7 px-3 rounded-sm text-[9px] font-bold tracking-wider uppercase font-mono disabled:opacity-50">Apply</button>
        </div>
        <div className="max-h-[120px] overflow-y-auto border border-border/20 rounded-sm divide-y divide-border/10">
          {users.map(u => (
            <label key={u.id} className="flex items-center gap-2 px-2 py-1 text-[10px] font-mono hover:bg-background-subtle/30 cursor-pointer">
              <input type="checkbox" checked={bulkRoleUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="w-3 h-3" />
              <span className="text-foreground">{u.fullName}</span>
              <span className="text-foreground-subtle ml-auto">{u.role}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
