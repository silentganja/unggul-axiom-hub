"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, AlertCircle, Plus, Trash2, Shield, Users, Key,
  Save, X, Check, Search, Zap, Copy,
} from "lucide-react";
import { useToastStore } from "@/components/ui/Toast";
import {
  adminApi,
  Permission,
  RoleGroupSummary,
  RoleGroupDetail,
  RoleGroupUser,
  AdminUserEntry,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Permission categories ──────────────────────────────────────────────────

interface PermCategory {
  label: string;
  keys: string[];
}

const PERM_CATEGORIES: PermCategory[] = [
  { label: "Files", keys: ["files:read", "files:write", "files:delete", "files:classify"] },
  { label: "Users", keys: ["users:read", "users:manage", "users:delete"] },
  { label: "Governance", keys: ["governance:approve", "governance:reject"] },
  { label: "Admin", keys: ["admin:access", "shares:manage", "audit:read"] },
  { label: "System", keys: ["storage:manage", "config:read"] },
];

interface Preset {
  label: string;
  keys: string[];
}

const PRESETS: Preset[] = [
  {
    label: "Read-Only Auditor",
    keys: ["files:read", "users:read", "audit:read", "config:read"],
  },
  {
    label: "Content Manager",
    keys: ["files:read", "files:write", "files:delete", "files:classify", "shares:manage"],
  },
  {
    label: "User Manager",
    keys: ["users:read", "users:manage", "users:delete", "admin:access"],
  },
  {
    label: "Governance Officer",
    keys: ["governance:approve", "governance:reject", "files:read", "users:read", "audit:read"],
  },
  {
    label: "Full Access",
    keys: PERM_CATEGORIES.flatMap(c => c.keys),
  },
];

// ── Helper: build lookup maps ───────────────────────────────────────────────

function buildPermMap(permissions: Permission[]): Map<string, string> {
  return new Map(permissions.map(p => [p.key, p.id]));
}

export default function RoleBuilderTab() {
  // ── List state ────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<RoleGroupSummary[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RoleGroupDetail | null>(null);
  const [groupUsers, setGroupUsers] = useState<RoleGroupUser[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState("");

  // Reset filters when selecting a new group
  const resetFilters = () => setUserSearch("");

  // ── Create modal ──────────────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Sub-tab ────────────────────────────────────────────────────────────────
  type SubTab = "groups" | "permissions" | "roles";
  const [subTab, setSubTab] = useState<SubTab>("groups");

  // ── Delete confirmation ───────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<RoleGroupSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Permission management state ───────────────────────────────────────────
  const [permCreateKey, setPermCreateKey] = useState("");
  const [permCreateDesc, setPermCreateDesc] = useState("");
  const [permCreateLoading, setPermCreateLoading] = useState(false);
  const [editingPermId, setEditingPermId] = useState<string | null>(null);
  const [editingPermDesc, setEditingPermDesc] = useState("");

  // ── Role management state ─────────────────────────────────────────────────
  const [customRoles, setCustomRoles] = useState<Array<{ roleKey: string; label: string; level: number }>>([]);
  const [roleCreateKey, setRoleCreateKey] = useState("");
  const [roleCreateLabel, setRoleCreateLabel] = useState("");
  const [roleCreateLevel, setRoleCreateLevel] = useState(1);
  const [roleCreateLoading, setRoleCreateLoading] = useState(false);
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null);
  const [editingRolePermIds, setEditingRolePermIds] = useState<Set<string>>(new Set());

  // ── Fetch groups, permissions, and users on mount ─────────────────────────
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, p, u] = await Promise.all([
        adminApi.listRoleGroups(),
        adminApi.listPermissions(),
        adminApi.listUsers(),
      ]);
      setGroups(g);
      setPermissions(p);
      setAllUsers(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load role builder data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
  }, [fetchGroups]);

  // ── Select a group and load its detail ────────────────────────────────────
  const selectGroup = async (id: string) => {
    if (isDirty && selectedId && selectedId !== id) {
      if (!confirm("You have unsaved changes. Discard them and switch groups?")) {
        return;
      }
    }
    setSelectedId(id);
    setDetailLoading(true);
    setIsDirty(false);
    resetFilters();
    try {
      const [d, u] = await Promise.all([
        adminApi.getRoleGroup(id),
        adminApi.listRoleGroupUsers(id),
      ]);
      setDetail(d);
      setGroupUsers(u);
      setEditName(d.name);
      setEditDescription(d.description);
      setSelectedPermIds(new Set(d.permissions.map(p => p.id)));
      setSelectedUserIds(new Set(u.map(u => u.userId)));
    } catch {
      setDetail(null);
      setGroupUsers([]);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Toggle permission checkbox ────────────────────────────────────────────
  const togglePermission = (permId: string) => {
    setSelectedPermIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    setIsDirty(true);
  };

  // ── Toggle user checkbox ──────────────────────────────────────────────────
  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
    setIsDirty(true);
  };

  const permKeyToId = buildPermMap(permissions);

  // ── Category select-all / deselect-all ────────────────────────────────────
  const toggleCategory = (keys: string[]) => {
    const ids = keys.map(k => permKeyToId.get(k)).filter(Boolean) as string[];
    const allSelected = ids.every(id => selectedPermIds.has(id));
    setSelectedPermIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
    setIsDirty(true);
  };

  // ── Apply a preset ────────────────────────────────────────────────────────
  const applyPreset = (preset: Preset) => {
    const ids = preset.keys.map(k => permKeyToId.get(k)).filter(Boolean) as string[];
    setSelectedPermIds(new Set(ids));
    setIsDirty(true);
  };

  // ── Save permissions and users ────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedId || !detail) return;
    setIsSaving(true);
    try {
      await Promise.all([
        adminApi.updateRoleGroup(selectedId, {
          name: editName.trim(),
          description: editDescription.trim(),
        }),
        adminApi.setRoleGroupPermissions(selectedId, Array.from(selectedPermIds)),
        adminApi.setRoleGroupUsers(selectedId, Array.from(selectedUserIds)),
      ]);
      useToastStore.getState().success("Role group saved");
      setIsDirty(false);
      await selectGroup(selectedId);
      await fetchGroups();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Create group ──────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createName.trim()) {
      setCreateError("Name is required");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await adminApi.createRoleGroup({
        name: createName.trim(),
        description: createDescription.trim(),
      });
      useToastStore.getState().success("Role group created");
      setIsCreateOpen(false);
      setCreateName("");
      setCreateDescription("");
      await fetchGroups();
      setSelectedId(created.id);
      await selectGroup(created.id);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create group");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Duplicate group ────────────────────────────────────────────────────────
  const handleDuplicate = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dup = await adminApi.duplicateRoleGroup(groupId);
      useToastStore.getState().success(`Duplicated as "${dup.name}"`);
      await fetchGroups();
      setSelectedId(dup.id);
      await selectGroup(dup.id);
    } catch (err) {
      useToastStore.getState().error(err instanceof Error ? err.message : "Failed to duplicate");
    }
  };

  // ── Permission CRUD ────────────────────────────────────────────────────────
  const handleCreatePermission = async () => {
    if (!permCreateKey.trim() || !permCreateDesc.trim()) return;
    setPermCreateLoading(true);
    try {
      await adminApi.createPermission({ key: permCreateKey.trim(), description: permCreateDesc.trim() });
      useToastStore.getState().success("Permission created");
      setPermCreateKey("");
      setPermCreateDesc("");
      await fetchGroups(); // re-fetches permissions list
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to create permission");
    } finally { setPermCreateLoading(false); }
  };

  const handleUpdatePermission = async (id: string) => {
    if (!editingPermDesc.trim()) return;
    try {
      await adminApi.updatePermission(id, editingPermDesc.trim());
      useToastStore.getState().success("Permission updated");
      setEditingPermId(null);
      await fetchGroups();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to update permission");
    }
  };

  const handleDeletePermission = async (id: string) => {
    if (!confirm("Delete this permission? It will be removed from all groups and users.")) return;
    try {
      await adminApi.deletePermission(id);
      useToastStore.getState().success("Permission deleted");
      await fetchGroups();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to delete permission");
    }
  };

  // ── Role CRUD ──────────────────────────────────────────────────────────────
  const fetchCustomRoles = async () => {
    try {
      setCustomRoles(await adminApi.listCustomRoles());
    } catch { setCustomRoles([]); }
  };

  const handleCreateRole = async () => {
    if (!roleCreateKey.trim() || !roleCreateLabel.trim()) return;
    setRoleCreateLoading(true);
    try {
      await adminApi.createCustomRole({ roleKey: roleCreateKey.trim().toLowerCase().replace(/\s/g, "_"), label: roleCreateLabel.trim(), level: roleCreateLevel });
      useToastStore.getState().success("Role created");
      setRoleCreateKey("");
      setRoleCreateLabel("");
      setRoleCreateLevel(1);
      await fetchCustomRoles();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to create role");
    } finally { setRoleCreateLoading(false); }
  };

  const handleDeleteRole = async (roleKey: string) => {
    if (!confirm(`Delete role "${roleKey}"? Users with this role will not be affected.`)) return;
    try {
      await adminApi.deleteCustomRole(roleKey);
      useToastStore.getState().success("Role deleted");
      await fetchCustomRoles();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to delete role");
    }
  };

  const handleEditRolePerms = async (roleKey: string) => {
    if (editingRoleKey === roleKey) {
      setEditingRoleKey(null);
      return;
    }
    setEditingRoleKey(roleKey);
    try {
      const existing = await adminApi.getRoleImplicitPermissions(roleKey);
      setEditingRolePermIds(new Set(existing.map(p => p.id)));
    } catch { setEditingRolePermIds(new Set()); }
  };

  const handleSaveRolePerms = async () => {
    if (!editingRoleKey) return;
    try {
      await adminApi.setRoleImplicitPermissions(editingRoleKey, Array.from(editingRolePermIds));
      useToastStore.getState().success("Role permissions saved");
      setEditingRoleKey(null);
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to save role permissions");
    }
  };

  // ── Delete group ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteRoleGroup(deleteTarget.id);
      useToastStore.getState().success("Role group deleted");
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
        setDetail(null);
        setGroupUsers([]);
      }
      setDeleteTarget(null);
      await fetchGroups();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to delete group");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground font-serif">Role Builder</h2>
          <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
            Manage groups, permissions, roles, and user assignments.
          </p>
        </div>
        {subTab === "groups" && (
          <button
            onClick={() => { setCreateName(""); setCreateDescription(""); setCreateError(null); setIsCreateOpen(true); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[10px] font-bold uppercase font-mono tracking-wider transition-colors cursor-pointer"
          >
            <Plus size={12} /> New Group
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold select-none border-b border-border/20 pb-2">
        {(["groups", "permissions", "roles"] as SubTab[]).map(t => (
          <button key={t} onClick={() => { setSubTab(t); if (t === "roles") fetchCustomRoles(); }}
            className={cn("px-3 py-1 rounded-sm border uppercase transition-colors cursor-pointer capitalize",
              subTab === t ? "bg-accent/10 border-accent/20 text-accent" : "border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
            )}>{t}</button>
        ))}
      </div>

      {subTab === "groups" && (
      /* Two-panel layout */
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Left: Group List */}
        <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/30 bg-background-panel/80">
            <span className="font-mono text-[10px] font-bold tracking-wider text-foreground-subtle uppercase">
              Groups ({groups.length})
            </span>
          </div>
          <div className="divide-y divide-border/10 max-h-[600px] overflow-y-auto">
            {groups.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-mono text-foreground-subtle">
                No role groups yet. Create one to get started.
              </div>
            ) : (
              groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => selectGroup(g.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 transition-colors cursor-pointer block",
                    selectedId === g.id
                      ? "bg-accent/10 border-l-2 border-accent"
                      : "hover:bg-background-subtle/30 border-l-2 border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground font-sans truncate pr-2">
                      {g.name}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={e => handleDuplicate(g.id, e)}
                        className="h-6 w-6 rounded flex items-center justify-center text-foreground-subtle/40 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                        title="Duplicate group"
                      >
                        <Copy size={10} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTarget(g);
                        }}
                        className="h-6 w-6 rounded flex items-center justify-center text-foreground-subtle/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete group"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[9px] font-mono text-foreground-subtle">
                    <span className="flex items-center gap-1">
                      <Key size={9} /> {g.permissionCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={9} /> {g.userCount}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Detail / Edit */}
        <div className="lg:col-span-2 border border-border/40 rounded bg-background-panel/40 overflow-hidden">
          {!selectedId || !detail ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-subtle">
              <Shield size={32} className="opacity-30" />
              <p className="font-mono text-[11px] uppercase tracking-wider">
                Select a group or create a new one
              </p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={18} className="animate-spin text-accent" />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Detail header */}
              <div className="px-4 py-3 border-b border-border/30 bg-background-panel/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-accent" />
                  <span className="text-xs font-bold text-foreground font-sans">
                    Editing: {detail.name}
                  </span>
                </div>
                {isDirty && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 h-7 px-3 rounded border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[9px] font-bold uppercase font-mono tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Save size={10} />
                    )}
                    Save Changes
                  </button>
                )}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Name & Description */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => { setEditName(e.target.value); setIsDirty(true); }}
                      className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={e => { setEditDescription(e.target.value); setIsDirty(true); }}
                      placeholder="What this group is for..."
                      className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>

                {/* Template Presets */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap size={11} className="text-accent" />
                    <span className="text-[10px] font-bold font-mono uppercase text-foreground-subtle tracking-wider">
                      Quick Presets
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="h-6 px-2 rounded-sm border border-accent/25 text-accent bg-accent/5 hover:bg-accent/15 text-[8px] font-bold uppercase font-mono tracking-wider transition-colors cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions by category */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Key size={11} className="text-accent" />
                    <span className="text-[10px] font-bold font-mono uppercase text-foreground-subtle tracking-wider">
                      Permissions ({selectedPermIds.size})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {PERM_CATEGORIES.map(cat => {
                      const catPerms = permissions.filter(p => cat.keys.includes(p.key));
                      if (catPerms.length === 0) return null;
                      const catIds = catPerms.map(p => p.id);
                      const allSelected = catIds.every(id => selectedPermIds.has(id));
                      return (
                        <div key={cat.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle/70 tracking-wider">
                              {cat.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat.keys)}
                              className="text-[8px] font-mono text-accent hover:text-accent-hover transition-colors cursor-pointer bg-transparent border-none"
                            >
                              {allSelected ? "Deselect All" : "Select All"}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                            {catPerms.map(perm => {
                              const isSelected = selectedPermIds.has(perm.id);
                              return (
                                <button
                                  key={perm.id}
                                  type="button"
                                  onClick={() => togglePermission(perm.id)}
                                  title={`${perm.key}: ${perm.description}`}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-sm border text-left transition-colors cursor-pointer",
                                    isSelected
                                      ? "border-accent/30 bg-accent/10 text-accent"
                                      : "border-border/20 bg-background/30 text-foreground-subtle hover:border-border/50"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "h-3 w-3 rounded-sm border flex items-center justify-center shrink-0",
                                      isSelected
                                        ? "border-accent bg-accent text-accent-foreground"
                                        : "border-border bg-background"
                                    )}
                                  >
                                    {isSelected && <Check size={8} strokeWidth={3} />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-mono font-bold block truncate">
                                      {perm.key.replace(/^.+:/, "")}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* User assignment */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users size={11} className="text-accent" />
                    <span className="text-[10px] font-bold font-mono uppercase text-foreground-subtle tracking-wider">
                      Assigned Users ({selectedUserIds.size})
                    </span>
                  </div>
                  {/* Search filter */}
                  <div className="relative mb-2">
                    <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-foreground-subtle">
                      <Search size={10} />
                    </span>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search users..."
                      className="h-7 w-full pl-7 pr-2.5 rounded-sm border border-input-border bg-input-bg text-[10px] font-mono text-foreground placeholder:text-foreground-subtle/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-ring"
                    />
                    {userSearch && (
                      <button
                        onClick={() => setUserSearch("")}
                        className="absolute right-0 top-0 h-7 w-7 flex items-center justify-center text-foreground-subtle hover:text-foreground cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  <div className="border border-border/30 rounded-sm divide-y divide-border/10 max-h-[220px] overflow-y-auto">
                    {allUsers.length === 0 ? (
                      <div className="p-4 text-center text-[10px] font-mono text-foreground-subtle">
                        No users available.
                      </div>
                    ) : (() => {
                      const filtered = allUsers.filter(u =>
                        !userSearch ||
                        u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.role.toLowerCase().includes(userSearch.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <div className="p-4 text-center text-[10px] font-mono text-foreground-subtle">
                            No users match &quot;{userSearch}&quot;
                          </div>
                        );
                      }
                      return filtered.map(user => {
                        const isSelected = selectedUserIds.has(user.id);
                        return (
                          <button
                            key={user.id}
                            onClick={() => toggleUser(user.id)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer",
                              isSelected
                                ? "bg-accent/10"
                                : "hover:bg-background-subtle/30"
                            )}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className={cn(
                                  "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                  isSelected
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : "border-border bg-background"
                                )}
                              >
                                {isSelected && <Check size={9} strokeWidth={3} />}
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] font-mono font-bold text-foreground block truncate">
                                  {user.fullName}
                                </span>
                                <span className="text-[8px] font-mono text-foreground-subtle block truncate">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "text-[8px] font-bold uppercase font-mono px-1.5 py-0.5 rounded-sm border shrink-0",
                                user.role === "chief"
                                  ? "bg-accent/15 text-accent border-accent/30"
                                  : user.role === "director"
                                    ? "bg-accent/10 text-accent border-accent/20"
                                    : "bg-info/10 text-info border-info/20"
                              )}
                            >
                              {user.role}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Permissions Management Panel */}
      {subTab === "permissions" && (
        <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/30 bg-background-panel/80 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold tracking-wider text-foreground-subtle uppercase">
              Permissions ({permissions.length})
            </span>
            <div className="flex items-center gap-2">
              <input type="text" value={permCreateKey} onChange={e => setPermCreateKey(e.target.value)}
                placeholder="key (e.g. files:lock)" className="h-7 w-40 px-2 rounded-sm border border-border bg-background text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
              <input type="text" value={permCreateDesc} onChange={e => setPermCreateDesc(e.target.value)}
                placeholder="description" className="h-7 w-48 px-2 rounded-sm border border-border bg-background text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
              <button onClick={handleCreatePermission} disabled={permCreateLoading}
                className="h-7 px-2.5 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[9px] font-bold uppercase font-mono transition-colors cursor-pointer disabled:opacity-50">
                {permCreateLoading ? <Loader2 size={10} className="animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
          <div className="divide-y divide-border/10 max-h-[500px] overflow-y-auto">
            {permissions.map(p => (
              <div key={p.id} className="px-4 py-2 flex items-center justify-between hover:bg-background-subtle/20">
                <div>
                  <span className="text-[10px] font-mono font-bold text-foreground">{p.key}</span>
                  {editingPermId === p.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input type="text" value={editingPermDesc} onChange={e => setEditingPermDesc(e.target.value)}
                        className="h-6 w-64 px-1.5 rounded-sm border border-border bg-background text-[9px] font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
                      <button onClick={() => handleUpdatePermission(p.id)}
                        className="h-6 px-2 rounded-sm bg-accent/10 text-accent text-[8px] font-bold uppercase font-mono cursor-pointer">Save</button>
                      <button onClick={() => setEditingPermId(null)}
                        className="h-6 px-2 rounded-sm text-[8px] font-mono text-foreground-subtle cursor-pointer">Cancel</button>
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono text-foreground-subtle block">{p.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingPermId(p.id); setEditingPermDesc(p.description); }}
                    className="h-6 px-2 rounded-sm border border-border/30 bg-background/40 text-[8px] font-mono text-foreground-subtle hover:text-foreground transition-colors cursor-pointer">Edit</button>
                  <button onClick={() => handleDeletePermission(p.id)}
                    className="h-6 w-6 rounded flex items-center justify-center text-foreground-subtle/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer" title="Delete permission">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles Management Panel */}
      {subTab === "roles" && (
        <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/30 bg-background-panel/80 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold tracking-wider text-foreground-subtle uppercase">
              Custom Roles ({customRoles.length})
            </span>
            <div className="flex items-center gap-2">
              <input type="text" value={roleCreateKey} onChange={e => setRoleCreateKey(e.target.value)}
                placeholder="key (e.g. manager)" className="h-7 w-28 px-2 rounded-sm border border-border bg-background text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
              <input type="text" value={roleCreateLabel} onChange={e => setRoleCreateLabel(e.target.value)}
                placeholder="label" className="h-7 w-24 px-2 rounded-sm border border-border bg-background text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
              <input type="number" value={roleCreateLevel} onChange={e => setRoleCreateLevel(Number(e.target.value))} min={1} max={10}
                className="h-7 w-14 px-1.5 rounded-sm border border-border bg-background text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
              <button onClick={handleCreateRole} disabled={roleCreateLoading}
                className="h-7 px-2.5 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[9px] font-bold uppercase font-mono transition-colors cursor-pointer disabled:opacity-50">
                {roleCreateLoading ? <Loader2 size={10} className="animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
          <div className="divide-y divide-border/10 max-h-[500px] overflow-y-auto">
            {customRoles.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-mono text-foreground-subtle">
                No custom roles yet. The 4 base roles (chief, director, officer, staff) are always available.
              </div>
            ) : (
              customRoles.map(r => (
                <div key={r.roleKey}>
                  <div className="px-4 py-2 flex items-center justify-between hover:bg-background-subtle/20">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-foreground">{r.roleKey}</span>
                      <span className="text-[9px] font-mono text-foreground-subtle">{r.label}</span>
                      <span className="text-[8px] font-mono text-accent bg-accent/10 border border-accent/20 px-1 py-0.5 rounded">Lv.{r.level}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditRolePerms(r.roleKey)}
                        className="h-6 px-2 rounded-sm border border-border/30 bg-background/40 text-[8px] font-mono text-foreground-subtle hover:text-accent transition-colors cursor-pointer">
                        Implicit Permissions
                      </button>
                      {!["chief", "director", "officer", "staff"].includes(r.roleKey) && (
                        <button onClick={() => handleDeleteRole(r.roleKey)}
                          className="h-6 w-6 rounded flex items-center justify-center text-foreground-subtle/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer" title="Delete role">
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                  {editingRoleKey === r.roleKey && (
                    <div className="px-4 py-3 bg-background/30 border-t border-border/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-mono font-bold text-foreground-subtle uppercase">Implicit Permissions for {r.roleKey}</span>
                        <button onClick={handleSaveRolePerms}
                          className="h-6 px-2 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-[8px] font-bold uppercase font-mono cursor-pointer">Save</button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {permissions.map(perm => {
                          const isSelected = editingRolePermIds.has(perm.id);
                          return (
                            <button key={perm.id} type="button"
                              onClick={() => setEditingRolePermIds(prev => {
                                const next = new Set(prev);
                                if (next.has(perm.id)) next.delete(perm.id); else next.add(perm.id);
                                return next;
                              })}
                              className={cn("flex items-center gap-1 px-2 py-1 rounded-sm border text-left transition-colors cursor-pointer text-[9px] font-mono",
                                isSelected ? "border-accent/30 bg-accent/10 text-accent" : "border-border/20 bg-background/30 text-foreground-subtle hover:border-border/50"
                              )}>
                              <div className={cn("h-2.5 w-2.5 rounded-sm border flex items-center justify-center shrink-0",
                                isSelected ? "border-accent bg-accent" : "border-border bg-background"
                              )}>
                                {isSelected && <Check size={7} strokeWidth={3} />}
                              </div>
                              {perm.key.replace(/^.+:/, "")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Create Group Modal ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">
                Create Role Group
              </h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                Define a new custom role group with granular permissions.
              </p>
            </div>
            {createError && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering Leads"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional description of this group"
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading}
                className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50 cursor-pointer"
              >
                {createLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Create Group"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-destructive font-serif">
                Delete Role Group
              </h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                This will permanently delete the group and remove all permission
                and user assignments. This action cannot be undone.
              </p>
            </div>
            <div className="p-3 border border-border/20 rounded bg-background/30 font-mono text-[10px] text-foreground space-y-1">
              <div>
                <span className="text-foreground-subtle">Name:</span>{" "}
                {deleteTarget.name}
              </div>
              <div>
                <span className="text-foreground-subtle">Permissions:</span>{" "}
                {deleteTarget.permissionCount}
              </div>
              <div>
                <span className="text-foreground-subtle">Users:</span>{" "}
                {deleteTarget.userCount}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="h-8 px-4 rounded-sm border border-destructive/35 bg-destructive/10 hover:bg-destructive/20 text-destructive font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Delete Group"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
