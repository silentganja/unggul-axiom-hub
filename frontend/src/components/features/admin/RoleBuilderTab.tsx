"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, AlertCircle, Plus, Trash2, Shield, Users, Key,
  Save, X, Check, Search, Zap, Copy, Edit2,
} from "lucide-react";
import { useToastStore } from "@/components/ui/Toast";
import {
  adminApi,
  Permission,
  RoleGroupSummary,
  RoleGroupDetail,
  AdminUserEntry,
  UserGroupEntry,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useRoleLabels, roleLabel, invalidateRoleLabelsCache } from "@/hooks/useRoleLabels";

// ── Permission categories ──────────────────────────────────────────────────

interface PermCategory {
  label: string;
  keys: string[];
}

const PERM_CATEGORIES: PermCategory[] = [
  { label: "Files", keys: ["files:read", "files:write", "files:delete", "files:classify"] },
  { label: "Users", keys: ["users:read", "users:manage", "users:delete"] },
  { label: "Governance", keys: ["governance:approve", "governance:reject"] },
  { label: "Admin", keys: ["admin:access", "shares:manage", "audit:read", "permissions:manage", "role_groups:manage", "role_groups:assign"] },
  { label: "System", keys: ["storage:manage", "config:read", "config:write", "classifications:manage"] },
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
  const { labels: roleLabels } = useRoleLabels();
  // ── List state ────────────────────────────────────────────────────────────
  const [groups, setGroups] = useState<RoleGroupSummary[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RoleGroupDetail | null>(null);
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
  type SubTab = "groups" | "permissions" | "roles" | "audit";
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
  const [editingLabelKey, setEditingLabelKey] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [editingLabelLoading, setEditingLabelLoading] = useState(false);

  // ── Audit & Overrides state ───────────────────────────────────────────────
  const [auditSelectedUserId, setAuditSelectedUserId] = useState<string | null>(null);
  const [auditUserGroups, setAuditUserGroups] = useState<UserGroupEntry[]>([]);
  const [auditGroupDetails, setAuditGroupDetails] = useState<Record<string, RoleGroupDetail>>({});
  const [auditUserDirectPermIds, setAuditUserDirectPermIds] = useState<Set<string>>(new Set());
  const [auditUserImplicitPermIds, setAuditUserImplicitPermIds] = useState<Set<string>>(new Set());
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSaving, setAuditSaving] = useState(false);
  const [auditIsDirty, setAuditIsDirty] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");

  const selectAuditUser = async (userId: string, userRole: string) => {
    if (auditIsDirty) {
      if (!confirm("You have unsaved direct overrides. Discard them and switch users?")) {
        return;
      }
    }
    setAuditSelectedUserId(userId);
    setAuditLoading(true);
    setAuditIsDirty(false);
    try {
      const [groups, directPerms, implicitPerms] = await Promise.all([
        adminApi.listUserGroups(userId).catch(() => [] as UserGroupEntry[]),
        adminApi.listUserPermissions(userId).catch(() => [] as Permission[]),
        adminApi.getRoleImplicitPermissions(userRole).catch(() => [] as Permission[]),
      ]);

      setAuditUserGroups(groups);
      setAuditUserDirectPermIds(new Set(directPerms.map(p => p.id)));
      setAuditUserImplicitPermIds(new Set(implicitPerms.map(p => p.id)));

      const missingGroupIds = groups.filter(g => !auditGroupDetails[g.id]).map(g => g.id);
      if (missingGroupIds.length > 0) {
        const details = await Promise.all(
          missingGroupIds.map(id => adminApi.getRoleGroup(id).catch(() => null))
        );
        setAuditGroupDetails(prev => {
          const next = { ...prev };
          details.forEach((d, idx) => {
            if (d) {
              next[missingGroupIds[idx]] = d;
            }
          });
          return next;
        });
      }
    } catch {
      useToastStore.getState().error("Failed to load audit details");
    } finally {
      setAuditLoading(false);
    }
  };

  const toggleAuditDirectPerm = (permId: string) => {
    setAuditUserDirectPermIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    setAuditIsDirty(true);
  };

  const handleSaveAuditOverrides = async () => {
    if (!auditSelectedUserId) return;
    setAuditSaving(true);
    try {
      await adminApi.setUserPermissions(auditSelectedUserId, Array.from(auditUserDirectPermIds));
      useToastStore.getState().success("Direct permission overrides saved");
      setAuditIsDirty(false);
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setAuditSaving(false);
    }
  };

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
      const [d, users] = await Promise.all([
        adminApi.getRoleGroup(id),
        adminApi.listRoleGroupUsers(id),
      ]);
      setDetail(d);
      setEditName(d.name);
      setEditDescription(d.description);
      setSelectedPermIds(new Set(d.permissions.map(p => p.id)));
      setSelectedUserIds(new Set(users.map(u => u.userId)));
    } catch {
      setDetail(null);
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

  const handleDeletePermission = async (id: string, key: string) => {
    // Fetch usage before confirming
    let usageWarning = "";
    try {
      const usage = await adminApi.getPermissionUsage(id);
      const parts: string[] = [];
      if (usage.roleGroups.length > 0)
        parts.push(`${usage.roleGroups.length} role group(s): ${usage.roleGroups.join(", ")}`);
      if (usage.customRoles.length > 0)
        parts.push(`${usage.customRoles.length} custom role(s): ${usage.customRoles.join(", ")}`);
      if (usage.classificationRules > 0)
        parts.push(`${usage.classificationRules} classification access rule(s)`);
      if (usage.userOverrides > 0)
        parts.push(`${usage.userOverrides} direct user override(s)`);
      if (parts.length > 0)
        usageWarning = `\n\n⚠ This permission is currently used by:\n${parts.join("\n")}`;
    } catch {
      // If usage check fails, still allow deletion with generic warning
    }

    if (
      !confirm(
        `Delete permission "${key}"?${usageWarning}\n\nThis action cannot be undone.`,
      )
    )
      return;
    try {
      await adminApi.deletePermission(id);
      useToastStore.getState().success("Permission deleted");
      await fetchGroups();
    } catch (e) {
      useToastStore
        .getState()
        .error(e instanceof Error ? e.message : "Failed to delete permission");
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

  const handleStartEditLabel = (roleKey: string, currentLabel: string) => {
    setEditingLabelKey(roleKey);
    setEditingLabelValue(currentLabel);
  };

  const handleCancelEditLabel = () => {
    setEditingLabelKey(null);
    setEditingLabelValue("");
  };

  const handleSaveLabel = async (roleKey: string) => {
    if (!editingLabelValue.trim()) return;
    setEditingLabelLoading(true);
    try {
      const updated = await adminApi.updateCustomRole(roleKey, { label: editingLabelValue.trim() });
      useToastStore.getState().success(`Role label updated to "${updated.label}"`);
      setEditingLabelKey(null);
      setEditingLabelValue("");
      invalidateRoleLabelsCache();
      await fetchCustomRoles();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to update role label");
    } finally { setEditingLabelLoading(false); }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground font-serif">Role Builder</h2>
          <p className="text-xs text-foreground-subtle mt-1">
            Manage groups, permissions, roles, and user assignments.
          </p>
        </div>
        {subTab === "groups" && (
          <button
            onClick={() => { setCreateName(""); setCreateDescription(""); setCreateError(null); setIsCreateOpen(true); }}
            className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-semibold tracking-wider font-sans uppercase transition-colors cursor-pointer"
          >
            <Plus size={14} /> New Group
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 font-sans text-xs font-semibold select-none border-b border-border/20 pb-3">
        {(["groups", "permissions", "roles", "audit"] as SubTab[]).map(t => (
          <button key={t} onClick={() => { setSubTab(t); if (t === "roles") fetchCustomRoles(); }}
            className={cn("h-9 px-4 rounded-md border uppercase transition-colors cursor-pointer font-bold tracking-wide",
              subTab === t ? "bg-accent/10 border-accent/20 text-accent" : "border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
            )}>{t === "audit" ? "User Audit" : t}</button>
        ))}
      </div>

      {subTab === "groups" && (
      /* Two-panel layout */
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Left: Group List */}
        <div className="border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80">
            <span className="font-sans text-xs font-bold tracking-wider text-foreground-subtle uppercase">
              Groups ({groups.length})
            </span>
          </div>
          <div className="divide-y divide-border/10 max-h-[600px] overflow-y-auto">
            {groups.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-foreground-subtle">
                No role groups yet. Create one to get started.
              </div>
            ) : (
              groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => selectGroup(g.id)}
                  className={cn(
                    "w-full text-left px-5 py-4 transition-colors cursor-pointer block",
                    selectedId === g.id
                      ? "bg-accent/10 border-l-2 border-accent"
                      : "hover:bg-background-subtle/30 border-l-2 border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground font-sans truncate pr-2">
                      {g.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => handleDuplicate(g.id, e)}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-foreground-subtle/40 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                        title="Duplicate group"
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteTarget(g);
                        }}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-foreground-subtle/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Delete group"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-foreground-subtle">
                    <span className="flex items-center gap-1">
                      <Key size={11} /> {g.permissionCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={11} /> {g.userCount}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Detail / Edit */}
        <div className="lg:col-span-2 border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
          {!selectedId || !detail ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground-subtle">
              <Shield size={36} className="opacity-30" />
              <p className="font-sans text-xs font-bold uppercase tracking-wider">
                Select a group or create a new one
              </p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-accent" />
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Detail header */}
              <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Shield size={16} className="text-accent" />
                  <span className="text-sm font-bold text-foreground font-sans">
                    Editing: {detail.name}
                  </span>
                </div>
                {isDirty && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    Save Changes
                  </button>
                )}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Name & Description */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold font-sans uppercase text-foreground-subtle mb-1.5">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => { setEditName(e.target.value); setIsDirty(true); }}
                      className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold font-sans uppercase text-foreground-subtle mb-1.5">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={e => { setEditDescription(e.target.value); setIsDirty(true); }}
                      placeholder="What this group is for..."
                      className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    />
                  </div>
                </div>

                {/* Permission dependency warnings */}
                {(() => {
                  const warnings: string[] = [];
                  const has = (k: string) => selectedPermIds.has(permKeyToId.get(k) ?? "");
                  if (has("files:delete") && !has("files:read"))
                    warnings.push("files:delete without files:read — user can delete files they cannot see.");
                  if (has("users:delete") && !has("users:read"))
                    warnings.push("users:delete without users:read — user can delete users they cannot find.");
                  if (has("config:write") && !has("config:read"))
                    warnings.push("config:write without config:read — user can modify config they cannot view.");
                  if (has("governance:reject") && !has("governance:approve"))
                    warnings.push("governance:reject without governance:approve — user can reject but not approve.");
                  if (warnings.length === 0) return null;
                  return (
                    <div className="p-3 rounded-md border border-warning/30 bg-warning/5 space-y-1.5 mb-4">
                      <span className="text-[10px] font-bold font-sans uppercase text-warning tracking-wider">
                        ⚠ Permission Warnings
                      </span>
                      {warnings.map((w, i) => (
                        <p key={i} className="text-[10px] text-warning/80 font-mono leading-relaxed">
                          {w}
                        </p>
                      ))}
                    </div>
                  );
                })()}

                {/* Template Presets */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Zap size={13} className="text-accent" />
                    <span className="text-xs font-bold font-sans uppercase text-foreground-subtle tracking-wider">
                      Quick Presets
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map(p => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="h-8 px-3 rounded-md border border-accent/25 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-semibold tracking-wider font-sans uppercase transition-colors cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions by category */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Key size={13} className="text-accent" />
                    <span className="text-xs font-bold font-sans uppercase text-foreground-subtle tracking-wider">
                      Permissions ({selectedPermIds.size})
                    </span>
                  </div>
                  <div className="space-y-4">
                    {PERM_CATEGORIES.map(cat => {
                      const catPerms = permissions.filter(p => cat.keys.includes(p.key));
                      if (catPerms.length === 0) return null;
                      const catIds = catPerms.map(p => p.id);
                      const allSelected = catIds.every(id => selectedPermIds.has(id));
                      return (
                        <div key={cat.label} className="border border-border/10 rounded-md p-3.5 bg-background/10">
                          <div className="flex items-center justify-between mb-2 pb-1 border-b border-border/10">
                            <span className="text-xs font-bold font-sans uppercase text-foreground-subtle tracking-wider">
                              {cat.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat.keys)}
                              className="text-xs font-bold font-sans text-accent hover:text-accent-hover transition-colors cursor-pointer bg-transparent border-none"
                            >
                              {allSelected ? "Deselect All" : "Select All"}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {catPerms.map(perm => {
                              const isSelected = selectedPermIds.has(perm.id);
                              return (
                                <button
                                  key={perm.id}
                                  type="button"
                                  onClick={() => togglePermission(perm.id)}
                                  title={`${perm.key}: ${perm.description}`}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2.5 rounded-md border text-left transition-colors cursor-pointer",
                                    isSelected
                                      ? "border-accent/30 bg-accent/10 text-accent"
                                      : "border-border/20 bg-background/30 text-foreground-subtle hover:border-border/50"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "h-4 w-4 rounded-md border flex items-center justify-center shrink-0",
                                      isSelected
                                        ? "border-accent bg-accent text-accent-foreground"
                                        : "border-border bg-background"
                                    )}
                                  >
                                    {isSelected && <Check size={10} strokeWidth={3} />}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-xs font-mono font-bold block truncate">
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
                  <div className="flex items-center gap-1.5 mb-3">
                    <Users size={13} className="text-accent" />
                    <span className="text-xs font-bold font-sans uppercase text-foreground-subtle tracking-wider">
                      Assigned Users ({selectedUserIds.size})
                    </span>
                  </div>
                  {/* Search filter */}
                  <div className="relative mb-3">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-foreground-subtle">
                      <Search size={12} />
                    </span>
                    <input
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Search users..."
                      className="h-9 w-full pl-9 pr-3 rounded-md border border-input-border bg-input-bg text-xs font-sans text-foreground placeholder:text-foreground-subtle/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-ring"
                    />
                    {userSearch && (
                      <button
                        onClick={() => setUserSearch("")}
                        className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-foreground-subtle hover:text-foreground cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="border border-border/20 rounded-md divide-y divide-border/10 max-h-[250px] overflow-y-auto">
                    {allUsers.length === 0 ? (
                       <div className="p-4 text-center text-xs font-mono text-foreground-subtle">
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
                          <div className="p-4 text-center text-xs font-mono text-foreground-subtle">
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
                              "w-full flex items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer",
                              isSelected
                                ? "bg-accent/10"
                                : "hover:bg-background-subtle/30"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "h-4 w-4 rounded-md border flex items-center justify-center shrink-0",
                                  isSelected
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : "border-border bg-background"
                                )}
                              >
                                {isSelected && <Check size={10} strokeWidth={3} />}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-sans font-bold text-foreground block truncate">
                                  {user.fullName}
                                </span>
                                <span className="text-xs font-sans text-foreground-subtle block truncate">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase font-sans px-2.5 py-1 rounded-md border shrink-0",
                                user.role === "chief"
                                  ? "bg-accent/15 text-accent border-accent/30"
                                  : user.role === "director"
                                    ? "bg-accent/10 text-accent border-accent/20"
                                    : "bg-info/10 text-info border-info/20"
                              )}
                            >
                              {roleLabel(roleLabels, user.role)}
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
        <div className="border border-border/30 rounded-lg bg-background-panel/40 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/30 bg-background-panel/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="font-sans text-xs font-semibold tracking-wider text-foreground-subtle uppercase">
              Permissions ({permissions.length})
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={permCreateKey}
                onChange={e => setPermCreateKey(e.target.value)}
                placeholder="key (e.g. files:lock)"
                className="h-9 w-48 px-3 rounded-md border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                value={permCreateDesc}
                onChange={e => setPermCreateDesc(e.target.value)}
                placeholder="description"
                className="h-9 w-60 px-3 rounded-md border border-border bg-background text-xs font-sans placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleCreatePermission}
                disabled={permCreateLoading}
                className="h-9 px-4 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 text-xs font-semibold font-sans transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                {permCreateLoading ? <Loader2 size={14} className="animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
          <div className="divide-y divide-border/10 max-h-[500px] overflow-y-auto">
            {permissions.map(p => (
              <div key={p.id} className="px-6 py-4 flex items-center justify-between hover:bg-background-subtle/10 transition-colors">
                <div>
                  <span className="text-xs font-mono font-semibold text-foreground">{p.key}</span>
                  {editingPermId === p.id ? (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={editingPermDesc}
                        onChange={e => setEditingPermDesc(e.target.value)}
                        className="h-9 w-72 px-3 rounded-md border border-border bg-background text-xs font-sans focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <button
                        onClick={() => handleUpdatePermission(p.id)}
                        className="h-8 px-3 rounded-md bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold font-sans transition-colors cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPermId(null)}
                        className="h-8 px-3 rounded-md text-xs font-semibold font-sans text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-sans text-foreground-subtle block mt-1">{p.description}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingPermId(p.id); setEditingPermDesc(p.description); }}
                    className="h-8 px-3 rounded-md border border-border bg-background text-xs font-sans text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePermission(p.id, p.key)}
                    className="h-8 w-8 rounded-md flex items-center justify-center border border-border bg-background text-foreground-subtle/60 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-all cursor-pointer"
                    title="Delete permission"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles Management Panel */}
      {subTab === "roles" && (
        <div className="border border-border/30 rounded-lg bg-background-panel/40 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/30 bg-background-panel/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="font-sans text-xs font-semibold tracking-wider text-foreground-subtle uppercase">
              Custom Roles ({customRoles.length})
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={roleCreateKey}
                onChange={e => setRoleCreateKey(e.target.value)}
                placeholder="key (e.g. manager)"
                className="h-9 w-36 px-3 rounded-md border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                value={roleCreateLabel}
                onChange={e => setRoleCreateLabel(e.target.value)}
                placeholder="label"
                className="h-9 w-32 px-3 rounded-md border border-border bg-background text-xs font-sans placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="number"
                value={roleCreateLevel}
                onChange={e => setRoleCreateLevel(Number(e.target.value))}
                min={1}
                max={10}
                className="h-9 w-20 px-3 rounded-md border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleCreateRole}
                disabled={roleCreateLoading}
                className="h-9 px-4 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 text-xs font-semibold font-sans transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
              >
                {roleCreateLoading ? <Loader2 size={14} className="animate-spin" /> : "Create"}
              </button>
            </div>
          </div>
          <div className="divide-y divide-border/10 max-h-[500px] overflow-y-auto">
            {customRoles.length === 0 ? (
              <div className="p-8 text-center text-xs font-sans text-foreground-subtle">
                No custom roles yet. The 4 base roles (chief, director, officer, staff) are always available.
              </div>
            ) : (
              customRoles.map(r => (
                <div key={r.roleKey}>
                  <div className="px-6 py-4 flex items-center justify-between hover:bg-background-subtle/10 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-semibold text-foreground">{r.roleKey}</span>
                      {editingLabelKey === r.roleKey ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingLabelValue}
                            onChange={e => setEditingLabelValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveLabel(r.roleKey); else if (e.key === "Escape") handleCancelEditLabel(); }}
                            className="h-7 w-32 px-2 rounded-sm border border-accent/50 bg-background text-xs font-sans text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveLabel(r.roleKey)}
                            disabled={editingLabelLoading}
                            className="h-7 w-7 rounded-sm flex items-center justify-center bg-accent/15 text-accent hover:bg-accent/25 transition-colors cursor-pointer disabled:opacity-50"
                            title="Save"
                          >
                            {editingLabelLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          </button>
                          <button
                            onClick={handleCancelEditLabel}
                            className="h-7 w-7 rounded-sm flex items-center justify-center bg-background-muted/30 text-foreground-subtle hover:text-foreground transition-colors cursor-pointer"
                            title="Cancel"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 group">
                          <span className="text-xs font-sans text-foreground-subtle">{r.label}</span>
                          <button
                            onClick={() => handleStartEditLabel(r.roleKey, r.label)}
                            className="h-5 w-5 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 text-foreground-subtle/40 hover:text-foreground hover:bg-background-muted/30 transition-all cursor-pointer"
                            title="Edit label"
                          >
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )}
                      <span className="text-[10px] font-sans text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md">Lv.{r.level}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditRolePerms(r.roleKey)}
                        className="h-8 px-3 rounded-md border border-border bg-background text-xs font-sans text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer"
                      >
                        Implicit Permissions
                      </button>
                      {!["chief", "director", "officer", "staff"].includes(r.roleKey) && (
                        <button
                          onClick={() => handleDeleteRole(r.roleKey)}
                          className="h-8 w-8 rounded-md flex items-center justify-center border border-border bg-background text-foreground-subtle/60 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 transition-all cursor-pointer"
                          title="Delete role"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {editingRoleKey === r.roleKey && (
                    <div className="px-6 py-4 bg-background/30 border-t border-border/10">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-sans font-semibold text-foreground-subtle uppercase tracking-wider">Implicit Permissions for {r.roleKey}</span>
                        <button
                          onClick={handleSaveRolePerms}
                          className="h-8 px-3 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold font-sans transition-colors cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {permissions.map(perm => {
                          const isSelected = editingRolePermIds.has(perm.id);
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => setEditingRolePermIds(prev => {
                                const next = new Set(prev);
                                if (next.has(perm.id)) next.delete(perm.id); else next.add(perm.id);
                                return next;
                              })}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-colors cursor-pointer text-xs font-mono",
                                isSelected
                                  ? "border-accent/30 bg-accent/10 text-accent"
                                  : "border-border/20 bg-background/30 text-foreground-subtle hover:border-border/50"
                              )}
                            >
                              <div
                                className={cn(
                                  "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                  isSelected ? "border-accent bg-accent" : "border-border bg-background"
                                )}
                              >
                                {isSelected && <Check size={10} strokeWidth={3} />}
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

      {subTab === "audit" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
          {/* Left: Searchable User Directory */}
          <div className="border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80">
              <span className="font-sans text-xs font-bold tracking-wider text-foreground-subtle uppercase">
                User Directory
              </span>
            </div>
            {/* Search Box */}
            <div className="p-4 border-b border-border/10 bg-background-panel/20">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-foreground-subtle">
                  <Search size={12} />
                </span>
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  placeholder="Search users by name/email..."
                  className="h-9 w-full pl-9 pr-8 rounded-md border border-border bg-background text-xs font-sans text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-1 focus:ring-accent"
                />
                {auditSearchQuery && (
                  <button
                    onClick={() => setAuditSearchQuery("")}
                    className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-foreground-subtle hover:text-foreground cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
            {/* Users List */}
            <div className="divide-y divide-border/10 max-h-[500px] overflow-y-auto">
              {(() => {
                const filtered = allUsers.filter(u =>
                  !auditSearchQuery ||
                  u.fullName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
                  u.email.toLowerCase().includes(auditSearchQuery.toLowerCase())
                );
                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs font-sans text-foreground-subtle">
                      No users found.
                    </div>
                  );
                }
                return filtered.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectAuditUser(u.id, u.role)}
                    className={cn(
                      "w-full text-left px-5 py-4 transition-colors cursor-pointer block",
                      auditSelectedUserId === u.id
                        ? "bg-accent/10 border-l-2 border-accent"
                        : "hover:bg-background-subtle/30 border-l-2 border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground font-sans truncate pr-2">
                        {u.fullName}
                      </span>
                      <span className={cn(
                        "text-[9px] font-bold uppercase font-mono px-2 py-0.5 rounded border shrink-0",
                        u.role === "chief"
                          ? "bg-accent/15 text-accent border-accent/30"
                          : u.role === "director"
                            ? "bg-accent/10 text-accent border-accent/20"
                            : "bg-info/10 text-info border-info/20"
                      )}>
                        {roleLabel(roleLabels, u.role)}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-foreground-subtle mt-1 truncate">
                      {u.email}
                    </div>
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Right: Detail & Overrides */}
          <div className="lg:col-span-2 border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden flex flex-col">
            {!auditSelectedUserId ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground-subtle">
                <Users size={36} className="opacity-30" />
                <p className="font-sans text-xs font-bold uppercase tracking-wider">
                  Select a user to audit and override permissions
                </p>
              </div>
            ) : auditLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-accent" />
              </div>
            ) : (() => {
              const auditedUser = allUsers.find(u => u.id === auditSelectedUserId);
              if (!auditedUser) return null;

              return (
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80 flex items-center justify-between">
                    <div className="min-w-0 mr-4">
                      <span className="text-sm font-bold text-foreground font-sans block truncate">
                        Audit: {auditedUser.fullName}
                      </span>
                      <span className="text-xs text-foreground-subtle font-sans truncate block">
                        Base Role: <span className="font-bold uppercase font-mono text-accent/80 text-[11px]">{roleLabel(roleLabels, auditedUser.role)}</span> (Lv.{
                          auditedUser.role === "chief" ? 4 :
                          auditedUser.role === "director" ? 3 :
                          auditedUser.role === "officer" ? 2 : 1
                        })
                      </span>
                    </div>
                    {auditIsDirty && (
                      <button
                        onClick={handleSaveAuditOverrides}
                        disabled={auditSaving}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {auditSaving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Save size={12} />
                        )}
                        Save Overrides
                      </button>
                    )}
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* User Metadata */}
                    <div className="p-4 border border-border/10 rounded-md bg-background/20 space-y-2.5 font-sans text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground-subtle font-semibold">Email Address:</span>
                        <span className="font-mono text-foreground font-semibold">{auditedUser.email}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground-subtle font-semibold">Assigned Role Groups:</span>
                        <span className="text-foreground font-semibold text-right max-w-[70%] truncate">
                          {auditUserGroups.length === 0 ? (
                            <span className="italic text-foreground-subtle/60">None</span>
                          ) : (
                            auditUserGroups.map(g => g.name).join(", ")
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-foreground-subtle font-semibold">Direct Overrides Count:</span>
                        <span className="font-mono text-accent font-bold">{auditUserDirectPermIds.size}</span>
                      </div>
                    </div>

                    {/* Direct Overrides Editor */}
                    <div className="border border-border/10 rounded-lg p-4 bg-background/10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Shield size={13} className="text-accent" />
                        <span className="text-xs font-bold font-sans uppercase text-foreground-subtle tracking-wider">
                          Direct Overrides Configuration
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground-subtle mb-4 leading-relaxed font-sans">
                        Direct overrides let you bypass group membership and base role defaults to grant or revoke specific permissions directly for this user.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {permissions.map(perm => {
                          const isDirect = auditUserDirectPermIds.has(perm.id);
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => toggleAuditDirectPerm(perm.id)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 rounded-md border text-left transition-colors cursor-pointer",
                                isDirect
                                  ? "border-accent/40 bg-accent/15 text-accent"
                                  : "border-border/20 bg-background/30 text-foreground-subtle hover:border-border/50"
                              )}
                            >
                              <div
                                className={cn(
                                  "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                  isDirect
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : "border-border bg-background"
                                )}
                              >
                                {isDirect && <Check size={10} strokeWidth={3} />}
                              </div>
                              <span className="text-[11px] font-mono font-bold truncate">
                                {perm.key}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Effective Permissions Matrix */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 border-t border-border/10 pt-5">
                        <Key size={13} className="text-accent" />
                        <span className="text-xs font-bold font-sans uppercase text-foreground-subtle tracking-wider">
                          Effective Permissions Matrix
                        </span>
                      </div>

                      {PERM_CATEGORIES.map(cat => {
                        const catPerms = permissions.filter(p => cat.keys.includes(p.key));
                        if (catPerms.length === 0) return null;

                        return (
                          <div key={cat.label} className="border border-border/10 rounded-md p-3.5 bg-background/10">
                            <div className="text-xs font-bold font-sans uppercase text-foreground-subtle tracking-wider mb-3 pb-1 border-b border-border/10">
                              {cat.label}
                            </div>
                            <div className="space-y-2">
                              {catPerms.map(perm => {
                                const isChiefOrDirector = ["chief", "director", "admin_panel"].includes(auditedUser.role);
                                const isOfficerFastPath = auditedUser.role === "officer" && [
                                  "files:read",
                                  "files:write",
                                  "users:read",
                                  "governance:approve",
                                  "governance:reject",
                                  "audit:read"
                               ].includes(perm.key);

                                const isRoleImplicit = auditUserImplicitPermIds.has(perm.id);
                                const isDirectOverride = auditUserDirectPermIds.has(perm.id);

                                const grantingGroups: string[] = [];
                                auditUserGroups.forEach(g => {
                                  const gDetail = auditGroupDetails[g.id];
                                  if (gDetail && gDetail.permissions.some(p => p.id === perm.id)) {
                                    grantingGroups.push(g.name);
                                  }
                                });

                                const isGranted = isChiefOrDirector || isOfficerFastPath || isRoleImplicit || isDirectOverride || grantingGroups.length > 0;

                                const sources: string[] = [];
                                if (isChiefOrDirector) {
                                  sources.push("Chief / Director role bypass (Full Access)");
                                }
                                if (isOfficerFastPath) {
                                  sources.push("Officer base role default");
                                }
                                if (isRoleImplicit && !isChiefOrDirector && !isOfficerFastPath) {
                                  sources.push("Base Role implicit grant");
                                }
                                grantingGroups.forEach(name => {
                                  sources.push(`Inherited from Group: ${name}`);
                                });
                                if (isDirectOverride) {
                                  sources.push("Directly Assigned Override");
                                }

                                return (
                                  <div
                                    key={perm.id}
                                    className={cn(
                                      "flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded border gap-2",
                                      isGranted
                                        ? "border-accent/15 bg-accent/5"
                                        : "border-border/10 bg-background/10"
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <span className={cn(
                                        "text-xs font-mono font-bold block",
                                        isGranted ? "text-foreground" : "text-foreground-subtle/50"
                                      )}>
                                        {perm.key}
                                      </span>
                                      <span className="text-[10px] text-foreground-subtle font-sans block mt-0.5">
                                        {perm.description}
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 gap-1">
                                      <span
                                        className={cn(
                                          "text-[9px] font-bold uppercase font-sans px-2 py-0.5 rounded",
                                          isGranted
                                            ? "bg-accent/20 text-accent"
                                            : "bg-destructive/10 text-destructive border border-destructive/20"
                                        )}
                                      >
                                        {isGranted ? "Granted" : "Denied"}
                                      </span>
                                      {isGranted && sources.length > 0 && (
                                        <div className="flex flex-col items-end gap-0.5 text-[9px] text-foreground-subtle font-sans font-medium">
                                          {sources.map((src, sIdx) => (
                                            <span key={sIdx} className="text-right whitespace-nowrap bg-background-subtle/40 px-1 py-0.5 rounded text-[8px]">
                                              {src}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Create Group Modal ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-border/40 bg-background-panel shadow-2xl shadow-black/20 p-6 space-y-6">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-foreground font-sans">
                Create Role Group
              </h3>
              <p className="text-xs text-foreground-subtle font-sans">
                Define a new custom role group with granular permissions.
              </p>
            </div>
            {createError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold font-sans uppercase tracking-wider text-foreground-subtle mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engineering Leads"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  className="h-10 w-full px-3.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold font-sans uppercase tracking-wider text-foreground-subtle mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional description of this group"
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  className="h-10 w-full px-3.5 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="h-10 px-4 rounded-lg text-sm font-semibold font-sans text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading}
                className="btn-shimmer h-10 px-5 rounded-lg font-sans text-sm font-semibold tracking-wide text-accent-foreground disabled:opacity-50 cursor-pointer"
              >
                {createLoading ? (
                  <Loader2 size={14} className="animate-spin" />
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
          <div className="w-full max-w-md rounded-xl border border-border/40 bg-background-panel shadow-2xl shadow-black/20 p-6 space-y-6">
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-destructive font-sans">
                Delete Role Group
              </h3>
              <p className="text-xs text-foreground-subtle font-sans">
                This will permanently delete the group and remove all permission and user assignments. This action cannot be undone.
              </p>
            </div>
            <div className="p-4 border border-border/20 rounded-lg bg-background/30 font-mono text-xs text-foreground space-y-1.5">
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
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-10 px-4 rounded-lg text-sm font-semibold font-sans text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="h-10 px-5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold font-sans transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? (
                  <Loader2 size={14} className="animate-spin" />
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
