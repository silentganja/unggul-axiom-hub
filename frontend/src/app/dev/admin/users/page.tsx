"use client";

import React, { useState, useEffect, useId, useCallback } from "react";
import {
  Users as UsersIcon, Loader2, AlertCircle, UserPlus, Trash2, Edit2, Search, Lock, Folder, Shield,
} from "lucide-react";
import { useToastStore } from "@/components/ui/Toast";
import BulkOperations from "@/components/features/admin/BulkOperations";
import UserDetailPanel from "@/components/features/admin/UserDetailPanel";
import PasswordResetModal from "@/components/features/admin/PasswordResetModal";
import {
  adminApi, AdminUserEntry, BackendFileNode, formatFileSize, formatTimestamp,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAdminLayout } from "../layout";

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

export default function UsersAdminPage() {
  const { requestStepUp } = useAdminLayout();
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [passwordResetUserId, setPasswordResetUserId] = useState<string | null>(null);
  const [passwordResetUserName, setPasswordResetUserName] = useState<string>("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userFiles, setUserFiles] = useState<BackendFileNode[]>([]);
  const [userFilesLoading, setUserFilesLoading] = useState(false);
  const [groupSummaries, setGroupSummaries] = useState<Record<string, string[]>>({});
  const [availableRoles, setAvailableRoles] = useState<Array<{ roleKey: string; label: string }>>([
    { roleKey: "chief", label: "Chief" },
    { roleKey: "director", label: "Director" },
    { roleKey: "officer", label: "Officer" },
    { roleKey: "staff", label: "Staff" },
  ]);

  // Pagination states
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // User detail panel
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserEntry | null>(null);

  // Form states
  const createEmailId = useId(); const createPassId = useId(); const createNameId = useId();
  const editNameId = useId(); const editPassId = useId();
  const [createForm, setCreateForm] = useState({ email: "", password: "", fullName: "", role: "staff", storageQuotaMB: "", supervisorId: "", department: "" });
  const [editForm, setEditForm] = useState({ fullName: "", role: "staff", password: "", storageQuotaMB: "", supervisorId: "", department: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Tab-specific state for bulk operations
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkRoleUserIds, setBulkRoleUserIds] = useState<string[]>([]);
  const [bulkRoleTarget, setBulkRoleTarget] = useState("staff");

  // Used from event handlers only (post-create, post-edit, post-delete)
  const fetchUsers = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [pRes, gs] = await Promise.all([
        adminApi.listUsersPaginated({ page, perPage, q: searchQuery }),
        adminApi.listUserGroupSummaries().catch(() => ({})),
      ]);
      setUsers(pRes.users);
      setTotal(pRes.total);
      setGroupSummaries(gs);
    } catch (e) {
      setError(`Users: ${e instanceof Error ? e.message : "Failed to fetch"}`);
    } finally {
      setIsLoading(false);
    }
  }, [page, perPage, searchQuery]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setIsLoading(true); setError(null);
      try {
        const [pRes, gs] = await Promise.all([
          adminApi.listUsersPaginated({ page, perPage, q: searchQuery }),
          adminApi.listUserGroupSummaries().catch(() => ({})),
        ]);
        if (!cancelled) {
          setUsers(pRes.users);
          setTotal(pRes.total);
          setGroupSummaries(gs);
        }
      } catch (e) {
        if (!cancelled) setError(`Users: ${e instanceof Error ? e.message : "Failed to fetch"}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [page, perPage, searchQuery]);

  // Fetch custom roles for dropdowns
  useEffect(() => {
    adminApi.listCustomRoles().then(roles => {
      if (roles.length > 0) {
        setAvailableRoles(roles.map(r => ({ roleKey: r.roleKey, label: r.label })));
      }
    }).catch(() => {});
  }, []);

  const handleExpandUser = async (userId: string) => {
    if (expandedUserId === userId) { setExpandedUserId(null); return; }
    setExpandedUserId(userId); setUserFilesLoading(true);
    try { setUserFiles(await adminApi.getUserFiles(userId)); } catch { setUserFiles([]); }
    finally { setUserFilesLoading(false); }
  };

  const handleResetPassword = async (password: string) => {
    if (!passwordResetUserId) return;
    
    // REQUIRE step-up authorization for password resets
    requestStepUp(async () => {
      try {
        await adminApi.resetUserPassword(passwordResetUserId, password);
        useToastStore.getState().success("Password reset successfully");
        setPasswordResetUserId(null);
      } catch (e) {
        useToastStore.getState().error(e instanceof Error ? e.message : "Failed to reset password");
      }
    });
  };

  const handleToggleActive = async (userId: string) => {
    try { await adminApi.toggleUserActive(userId); await fetchUsers(); }
    catch (e) { useToastStore.getState().error(e instanceof Error ? e.message : "Failed to toggle"); }
  };

  const handleForceDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Permanently delete "${fileName}"?`)) return;
    if (!expandedUserId) return;
    try { await adminApi.forceDeleteFile(fileId); await handleExpandUser(expandedUserId); }
    catch (e) { useToastStore.getState().error(e instanceof Error ? e.message : "Failed to delete"); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(null); setFormLoading(true);
    try {
      const quotaMB = createForm.storageQuotaMB ? Number(createForm.storageQuotaMB) : null;
      const quotaBytes = quotaMB ? quotaMB * 1024 * 1024 : null;
      const supId = createForm.supervisorId || undefined;
      const dept = createForm.department || undefined;
      await adminApi.createUser({
        email: createForm.email,
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        storageQuotaBytes: quotaBytes,
        supervisorId: supId,
        department: dept,
      });
      setCreateForm({ email: "", password: "", fullName: "", role: "staff", storageQuotaMB: "", supervisorId: "", department: "" });
      setIsCreateOpen(false);
      await fetchUsers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setFormLoading(false);
    }
  };

  const openEdit = (user: AdminUserEntry) => {
    setEditTarget(user);
    setEditForm({
      fullName: user.fullName,
      role: user.role,
      password: "",
      storageQuotaMB: user.storageQuotaBytes != null ? String(Math.round(user.storageQuotaBytes / (1024 * 1024))) : "",
      supervisorId: user.supervisorId ?? "",
      department: user.department ?? "",
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editTarget) return; setFormError(null); setFormLoading(true);
    try {
      const quotaMB = editForm.storageQuotaMB ? Number(editForm.storageQuotaMB) : null;
      const quotaBytes = quotaMB ? quotaMB * 1024 * 1024 : null;
      const supId = editForm.supervisorId || (editForm.supervisorId === "" ? null : undefined);
      const dept = editForm.department || "";
      await adminApi.updateUser(editTarget.id, {
        fullName: editForm.fullName.trim(),
        role: editForm.role,
        password: editForm.password.trim() || undefined,
        storageQuotaBytes: quotaBytes,
        supervisorId: supId,
        department: dept,
      });
      setIsEditOpen(false);
      setEditTarget(null);
      await fetchUsers();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return; setFormError(null); setFormLoading(true);
    try { await adminApi.deleteUser(deleteTarget.id); setDeleteTarget(null); await fetchUsers(); }
    catch (e) { setFormError(e instanceof Error ? e.message : "Failed to delete user"); }
    finally { setFormLoading(false); }
  };

  const handleExportUsers = () => {
    const headers = ["Full Name", "Email", "Role", "Active", "Created"];
    const rows = users.map(u => [
      u.fullName,
      u.email,
      u.role,
      u.active !== false ? "Yes" : "No",
      formatTimestamp(u.createdAt),
    ]);
    exportCSV(headers, rows, `users-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const totalPages = Math.ceil(total / perPage);

  if (detailUserId) {
    return <UserDetailPanel userId={detailUserId} onBack={() => setDetailUserId(null)} onRefresh={fetchUsers} />;
  }

  return (
    <div className="space-y-6">
      <BulkOperations
        users={users}
        fetchUsers={fetchUsers}
        bulkCsvText={bulkCsvText}
        setBulkCsvText={setBulkCsvText}
        bulkResult={bulkResult}
        setBulkResult={setBulkResult}
        bulkLoading={bulkLoading}
        setBulkLoading={setBulkLoading}
        bulkRoleUserIds={bulkRoleUserIds}
        setBulkRoleUserIds={setBulkRoleUserIds}
        bulkRoleTarget={bulkRoleTarget}
        setBulkRoleTarget={setBulkRoleTarget}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">Total</span>
          <div className="text-xl font-bold font-mono text-foreground mt-0.5">{total}</div>
        </div>
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-accent">Chief</span>
          <div className="text-xl font-bold font-mono text-accent mt-0.5">{users.filter(u => u.role === "chief").length}</div>
        </div>
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-accent/80">Directors</span>
          <div className="text-xl font-bold font-mono text-accent/80 mt-0.5">{users.filter(u => u.role === "director").length}</div>
        </div>
        <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3">
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-info">Officers</span>
          <div className="text-xl font-bold font-mono text-info mt-0.5">{users.filter(u => u.role === "officer").length}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="flex gap-2">
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-foreground-subtle"><Search size={12} /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search users..."
              className="h-8 w-56 pl-8 pr-3 rounded border border-input-border bg-input-bg text-xs text-foreground placeholder-foreground-subtle/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-ring"
            />
          </div>
          <select
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="h-8 px-2 rounded border border-input-border bg-input-bg text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportUsers} disabled={users.length === 0}
            className="h-8 px-3 rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-[10px] font-bold tracking-wider uppercase font-mono text-foreground-subtle hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export CSV
          </button>
          <button onClick={() => { setCreateForm({ email: "", password: "", fullName: "", role: "staff", storageQuotaMB: "", supervisorId: "", department: "" }); setFormError(null); setIsCreateOpen(true); }}
            className="btn-shimmer h-8 px-3 rounded text-[11px] font-bold tracking-wider uppercase font-mono flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <UserPlus size={12} /> Create User
          </button>
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

      {/* User Table */}
      <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center font-mono"><Loader2 className="mx-auto text-accent animate-spin" size={24} /><p className="text-xs text-foreground-subtle uppercase tracking-widest mt-2">FETCHING USER DIRECTORY...</p></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center font-mono"><UsersIcon className="mx-auto text-foreground-subtle/40" size={24} /><h3 className="text-xs font-bold text-foreground uppercase tracking-widest mt-2">No users found</h3></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono text-[11px] tabular-nums">
              <thead>
                <tr className="border-b border-border/30 bg-background-panel/80 text-[10px] font-bold tracking-wider text-foreground-subtle uppercase select-none">
                  <th className="px-4 py-2.5 w-12">#</th><th className="px-4 py-2.5">Full Name</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5 w-24 text-center">Role</th><th className="px-4 py-2.5 w-40">Created</th><th className="px-4 py-2.5 w-48 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {users.map((user, idx) => (<React.Fragment key={user.id}>
                  <tr className="hover:bg-background-subtle/30 transition-colors group">
                    <td className="px-4 py-2 text-foreground-subtle select-none">{(page - 1) * perPage + idx + 1}</td>
                    <td className="px-4 py-2 text-foreground font-semibold font-sans truncate max-w-[180px]">
                      <button onClick={() => setDetailUserId(user.id)} className="hover:text-accent transition-colors text-left cursor-pointer bg-transparent border-none p-0 font-inherit">
                        {user.fullName}
                      </button>
                      {user.active === false && <span className="ml-1.5 text-[8px] text-destructive font-mono uppercase bg-destructive/10 px-1 py-0.5 rounded">Inactive</span>}
                      {groupSummaries[user.id] && groupSummaries[user.id].length > 0 && (
                        <span className="ml-1.5 text-[8px] text-accent font-mono bg-accent/10 border border-accent/20 px-1 py-0.5 rounded" title={groupSummaries[user.id].join(", ")}>
                          +{groupSummaries[user.id].length}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-foreground-muted select-all">{user.email}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn("inline-block px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider uppercase border",
                        user.role === "chief" ? "bg-accent/15 text-accent border-accent/30" : user.role === "director" ? "bg-accent/10 text-accent border-accent/20" : user.role === "officer" ? "bg-info/10 text-info border-info/20" : "bg-background-muted/40 text-foreground-subtle border-border/40"
                      )}>{user.role}</span>
                    </td>
                    <td className="px-4 py-2 text-foreground-muted">{formatTimestamp(user.createdAt)}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => { setDetailUserId(user.id); }} className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-accent/25 hover:bg-accent/10 text-foreground-subtle hover:text-accent transition-colors cursor-pointer" title="View details"><UsersIcon size={12} /></button>
                        <button onClick={() => handleExpandUser(user.id)} className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-accent/25 hover:bg-accent/10 text-foreground-subtle hover:text-accent transition-colors cursor-pointer" title="View files"><Folder size={12} /></button>
                        <button onClick={() => { setPasswordResetUserId(user.id); setPasswordResetUserName(user.email); }} className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-foreground transition-colors cursor-pointer" title="Reset password"><Lock size={12} /></button>
                        <button onClick={() => handleToggleActive(user.id)} className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-warning transition-colors cursor-pointer" title={user.active !== false ? "Deactivate" : "Activate"}><Shield size={12} className={user.active !== false ? "text-success" : "text-destructive"} /></button>
                        <button onClick={() => openEdit(user)} className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-foreground transition-colors cursor-pointer" title="Edit user"><Edit2 size={12} /></button>
                        <button onClick={() => { setDeleteTarget(user); setFormError(null); }} className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-destructive/25 hover:bg-destructive/10 text-foreground-subtle hover:text-destructive transition-colors cursor-pointer" title="Delete user"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                  {expandedUserId === user.id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-3 bg-background/30 border-b border-border/20">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-foreground-subtle">{user.fullName}&apos;s Files</span>
                            <span className="text-[9px] text-foreground-subtle font-mono">{userFiles.length} items</span>
                          </div>
                          {userFilesLoading ? (
                            <div className="py-4 text-center"><Loader2 size={14} className="animate-spin mx-auto text-accent" /></div>
                          ) : userFiles.length === 0 ? (
                            <p className="text-[10px] text-foreground-subtle font-mono py-2">No files found.</p>
                          ) : (
                            <div className="max-h-[300px] overflow-y-auto border border-border/20 rounded-sm divide-y divide-border/10">
                              {userFiles.map(f => (
                                <div key={f.id} className="flex items-center justify-between px-3 py-1.5 text-[10px] font-mono hover:bg-background-subtle/30">
                                  <div className="flex items-center gap-2 truncate">
                                    <Folder size={11} className={cn("shrink-0", f.isFolder ? "text-accent" : "text-foreground-subtle")} />
                                    <span className="truncate text-foreground">{f.name}</span>
                                    <span className={cn("px-1 py-0 rounded text-[8px] font-bold uppercase border", f.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25", f.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25")}>{f.classification}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-foreground-muted">{f.isFolder ? "-" : formatFileSize(f.sizeBytes)}</span>
                                    <button onClick={() => handleForceDelete(f.id, f.name)} className="text-[8px] font-bold text-destructive hover:bg-destructive/10 px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors cursor-pointer" title="Force delete">Delete</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between font-mono text-[10px] select-none pt-2">
          <div className="text-foreground-subtle">
            Showing Page {page} of {totalPages} ({total} total users)
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1.5 rounded border border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1.5 rounded border border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Footer ticker */}
      <div className="w-full bg-background-panel/40 border border-border/30 px-4 py-1.5 rounded-sm flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-foreground-subtle select-none">
        <div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /><span>ADMIN CONSOLE: ACTIVE</span></div>
        <div className="hidden md:flex items-center gap-4"><span>USERS: {total}</span><span className="text-foreground-subtle/30">|</span><span>STRATEGIC PORTAL MANAGEMENT</span></div>
        <span className="flex items-center gap-1"><Lock size={9} className="text-accent" /> SECURE</span>
      </div>

      {/* ── Create User Modal ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1"><h3 className="text-sm font-semibold text-foreground font-serif">Create New User</h3><p className="text-[10px] text-foreground-subtle font-mono">Add a new user to the Strategic Portal directory.</p></div>
            {formError && <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle size={12} className="mt-0.5 shrink-0" /><span>{formError}</span></div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div><label htmlFor={createNameId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Full Name</label><input id={createNameId} type="text" required placeholder="e.g. John Doe" value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div><label htmlFor={createEmailId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Email</label><input id={createEmailId} type="email" required placeholder="user@unggulaxiom.com" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div><label htmlFor={createPassId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Password</label><input id={createPassId} type="password" required placeholder="••••••••" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div><label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Role</label><select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))} className="h-8 w-full px-2 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent">{availableRoles.map(r => <option key={r.roleKey} value={r.roleKey}>{r.label}</option>)}</select></div>
              <div><label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Department</label><input type="text" placeholder="e.g. Finance" value={createForm.department} onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div><label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Supervisor (optional)</label><select value={createForm.supervisorId} onChange={e => setCreateForm(f => ({ ...f, supervisorId: e.target.value }))} className="h-8 w-full px-2 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"><option value="">None</option>{users.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}</select></div>
              <div><label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Storage Quota (MB, empty = default)</label><input type="number" placeholder="e.g. 5120 for 5GB" value={createForm.storageQuotaMB} onChange={e => setCreateForm(f => ({ ...f, storageQuotaMB: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 h-8 rounded border border-border hover:bg-background-subtle/40 text-foreground-subtle hover:text-foreground uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-3 h-8 rounded bg-accent text-accent-foreground hover:bg-accent-hover uppercase tracking-wider cursor-pointer flex items-center gap-1">
                  {formLoading && <Loader2 size={10} className="animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {isEditOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1"><h3 className="text-sm font-semibold text-foreground font-serif">Edit User</h3><p className="text-[10px] text-foreground-subtle font-mono">Modify directory fields for {editTarget.email}.</p></div>
            {formError && <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle size={12} className="mt-0.5 shrink-0" /><span>{formError}</span></div>}
            <form onSubmit={handleEdit} className="space-y-3">
              <div><label htmlFor={editNameId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Full Name</label><input id={editNameId} type="text" required value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div><label htmlFor={editPassId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">New Password (optional)</label><input id={editPassId} type="password" placeholder="Leave blank to keep same" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div><label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Role</label><select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="h-8 w-full px-2 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent">{availableRoles.map(r => <option key={r.roleKey} value={r.roleKey}>{r.label}</option>)}</select></div>
              <div><label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Department</label><input type="text" value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div><label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Supervisor (optional)</label><select value={editForm.supervisorId} onChange={e => setEditForm(f => ({ ...f, supervisorId: e.target.value }))} className="h-8 w-full px-2 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"><option value="">None</option>{users.filter(u => u.id !== editTarget.id).map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>)}</select></div>
              <div><label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Storage Quota (MB, empty = default)</label><input type="number" placeholder="e.g. 5120 for 5GB" value={editForm.storageQuotaMB} onChange={e => setEditForm(f => ({ ...f, storageQuotaMB: e.target.value }))} className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent" /></div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
                <button type="button" onClick={() => { setIsEditOpen(false); setEditTarget(null); }} className="px-3 h-8 rounded border border-border hover:bg-background-subtle/40 text-foreground-subtle hover:text-foreground uppercase tracking-wider cursor-pointer">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-3 h-8 rounded bg-accent text-accent-foreground hover:bg-accent-hover uppercase tracking-wider cursor-pointer flex items-center gap-1">
                  {formLoading && <Loader2 size={10} className="animate-spin" />} Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1"><h3 className="text-sm font-semibold text-foreground font-serif text-destructive">Terminate Directory Account</h3><p className="text-[10px] text-foreground-subtle font-mono">Are you absolutely sure you want to permanently delete {deleteTarget.fullName} ({deleteTarget.email})?</p></div>
            {formError && <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"><AlertCircle size={12} className="mt-0.5 shrink-0" /><span>{formError}</span></div>}
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="px-3 h-8 rounded border border-border hover:bg-background-subtle/40 text-foreground-subtle hover:text-foreground uppercase tracking-wider cursor-pointer">Cancel</button>
              <button onClick={handleDelete} disabled={formLoading} className="px-3 h-8 rounded bg-destructive text-destructive-foreground hover:bg-destructive/80 uppercase tracking-wider cursor-pointer flex items-center gap-1">
                {formLoading && <Loader2 size={10} className="animate-spin" />} Terminate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Password Reset Modal ── */}
      {passwordResetUserId && (
        <PasswordResetModal
          open={!!passwordResetUserId}
          userName={passwordResetUserName}
          onSubmit={handleResetPassword}
          onClose={() => setPasswordResetUserId(null)}
        />
      )}
    </div>
  );
}
