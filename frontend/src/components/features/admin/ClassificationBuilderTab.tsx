"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Loader2, AlertCircle, Plus, Trash2, Shield, Save,
  Star, Eye, Pencil,
} from "lucide-react";
import { useToastStore } from "@/components/ui/Toast";
import {
  adminApi,
  Permission,
  ClassificationEntry,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Sub-tabs ─────────────────────────────────────────────────────────────────
type SubTab = "classifications" | "access";

export default function ClassificationBuilderTab() {
  // ── List state ─────────────────────────────────────────────────────────────
  const [classifications, setClassifications] = useState<ClassificationEntry[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAccessId, setSelectedAccessId] = useState<string | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);

  // ── Edit state ─────────────────────────────────────────────────────────────
  const [editKey, setEditKey] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editLevel, setEditLevel] = useState(0);
  const [editDescription, setEditDescription] = useState("");
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // ── Access edit state ──────────────────────────────────────────────────────
  const [selectedReadIds, setSelectedReadIds] = useState<Set<string>>(new Set());
  const [selectedWriteIds, setSelectedWriteIds] = useState<Set<string>>(new Set());
  const [accessIsDirty, setAccessIsDirty] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);

  // ── Create modal ───────────────────────────────────────────────────────────
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState("");
  const [createLabel, setCreateLabel] = useState("");
  const [createLevel, setCreateLevel] = useState(1);
  const [createDescription, setCreateDescription] = useState("");
  const [createIsDefault, setCreateIsDefault] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Sub-tab ────────────────────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<SubTab>("classifications");

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<ClassificationEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch data on mount ────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p] = await Promise.all([
        adminApi.listClassifications(),
        adminApi.listPermissions(),
      ]);
      setClassifications(c);
      setPermissions(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load classifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // ── Select a classification for editing ────────────────────────────────────
  const selectClassification = (c: ClassificationEntry) => {
    if (isDirty && selectedId && selectedId !== c.id) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    setSelectedId(c.id);
    setEditKey(c.key);
    setEditLabel(c.label);
    setEditLevel(c.level);
    setEditDescription(c.description);
    setEditIsDefault(c.isDefault);
    setIsDirty(false);
  };

  // ── Select a classification for access control ─────────────────────────────
  const selectAccessClassification = async (c: ClassificationEntry) => {
    if (accessIsDirty) {
      if (!confirm("You have unsaved access changes. Discard them?")) return;
    }
    setSelectedAccessId(c.id);
    setAccessLoading(true);
    setAccessIsDirty(false);
    try {
      const detail = await adminApi.getClassificationPermissions(c.id);
      setSelectedReadIds(new Set(detail.readPermissions.map((p) => p.id)));
      setSelectedWriteIds(new Set(detail.writePermissions.map((p) => p.id)));
    } catch {
      useToastStore.getState().error("Failed to load access rules");
    } finally {
      setAccessLoading(false);
    }
  };

  // ── Toggle permission IDs ──────────────────────────────────────────────────
  const toggleRead = (permId: string) => {
    setSelectedReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
    setAccessIsDirty(true);
  };

  const toggleWrite = (permId: string) => {
    setSelectedWriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
    setAccessIsDirty(true);
  };

  // ── Save classification edits ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedId) return;
    if (!editKey.trim() || !editLabel.trim()) {
      useToastStore.getState().error("Key and label are required");
      return;
    }
    setIsSaving(true);
    try {
      await adminApi.updateClassification(selectedId, {
        key: editKey.trim().toUpperCase(),
        label: editLabel.trim(),
        level: editLevel,
        description: editDescription.trim(),
        isDefault: editIsDefault,
      });
      useToastStore.getState().success("Classification saved");
      setIsDirty(false);
      await fetchData();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save access rules ──────────────────────────────────────────────────────
  const handleSaveAccess = async () => {
    if (!selectedAccessId) return;
    setAccessSaving(true);
    try {
      await adminApi.setClassificationPermissions(selectedAccessId, {
        readPermissionIds: Array.from(selectedReadIds),
        writePermissionIds: Array.from(selectedWriteIds),
      });
      useToastStore.getState().success("Access rules saved");
      setAccessIsDirty(false);
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setAccessSaving(false);
    }
  };

  // ── Create classification ──────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!createKey.trim() || !createLabel.trim()) {
      setCreateError("Key and label are required");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const created = await adminApi.createClassification({
        key: createKey.trim().toUpperCase(),
        label: createLabel.trim(),
        level: createLevel,
        description: createDescription.trim(),
        isDefault: createIsDefault,
      });
      useToastStore.getState().success("Classification created");
      setIsCreateOpen(false);
      setCreateKey("");
      setCreateLabel("");
      setCreateLevel(1);
      setCreateDescription("");
      setCreateIsDefault(false);
      await fetchData();
      selectClassification(created);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Delete classification ──────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteClassification(deleteTarget.id);
      useToastStore.getState().success("Classification deleted");
      if (selectedId === deleteTarget.id) {
        setSelectedId(null);
      }
      if (selectedAccessId === deleteTarget.id) {
        setSelectedAccessId(null);
      }
      setDeleteTarget(null);
      await fetchData();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Set as default ─────────────────────────────────────────────────────────
  const handleSetDefault = async (id: string) => {
    try {
      await adminApi.setDefaultClassification(id);
      useToastStore.getState().success("Default classification updated");
      await fetchData();
    } catch (e) {
      useToastStore.getState().error(e instanceof Error ? e.message : "Failed to set default");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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

  const selected = classifications.find((c) => c.id === selectedId);
  const selectedAccess = classifications.find((c) => c.id === selectedAccessId);

  // Only file-relevant permissions belong in classification access rules.
  // User management, storage, config, and RBAC admin permissions are unrelated.
  const CLASSIFICATION_RELEVANT_PERMS = new Set([
    "files:read", "files:write", "files:delete", "files:classify",
    "shares:manage", "governance:approve", "governance:reject",
    "admin:access", "audit:read",
  ]);
  const classificationPerms = permissions.filter((p) =>
    CLASSIFICATION_RELEVANT_PERMS.has(p.key),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground font-serif">Classification Builder</h2>
          <p className="text-xs text-foreground-subtle mt-1">
            Define data classification tiers, hierarchy levels, and access rules.
          </p>
        </div>
        {subTab === "classifications" && (
          <button
            onClick={() => {
              setCreateKey(""); setCreateLabel(""); setCreateLevel(1);
              setCreateDescription(""); setCreateIsDefault(false); setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 h-9 px-4 rounded-md border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 text-xs font-semibold tracking-wider font-sans uppercase transition-colors cursor-pointer"
          >
            <Plus size={14} /> New Classification
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-2 font-sans text-xs font-semibold select-none border-b border-border/20 pb-3">
        {(["classifications", "access"] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={cn(
              "h-9 px-4 rounded-md border uppercase transition-colors cursor-pointer font-bold tracking-wide capitalize",
              subTab === t
                ? "bg-accent/10 border-accent/20 text-accent"
                : "border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
            )}
          >
            {t === "access" ? "Access Control" : t}
          </button>
        ))}
      </div>

      {/* ── Classifications Sub-tab ──────────────────────────────────────────── */}
      {subTab === "classifications" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
          {/* Left: Classification list */}
          <div className="border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80">
              <span className="font-sans text-xs font-bold tracking-wider text-foreground-subtle uppercase">
                Tiers ({classifications.length})
              </span>
            </div>
            <div className="divide-y divide-border/10 max-h-[600px] overflow-y-auto">
              {classifications.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-foreground-subtle">
                  No classifications yet. Create one to get started.
                </div>
              ) : (
                classifications.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectClassification(c)}
                    className={cn(
                      "w-full text-left px-5 py-4 transition-colors cursor-pointer block",
                      selectedId === c.id
                        ? "bg-accent/10 border-l-2 border-accent"
                        : "hover:bg-background-subtle/30 border-l-2 border-transparent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground font-sans">
                          {c.key}
                        </span>
                        {c.isDefault && (
                          <Star size={11} className="text-accent fill-accent shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetDefault(c.id);
                          }}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-foreground-subtle/40 hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                          title="Set as default"
                        >
                          <Star size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(c);
                          }}
                          className="h-7 w-7 rounded-md flex items-center justify-center text-foreground-subtle/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Delete classification"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-foreground-subtle">
                      <span className="truncate">{c.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] font-mono text-foreground-subtle/60">
                      <span>Level {c.level}</span>
                      <span>·</span>
                      <span>{c.fileCount} file(s)</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right: Edit form */}
          <div className="lg:col-span-2 border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-foreground-subtle">
                <Shield size={36} className="opacity-30" />
                <p className="text-xs font-mono uppercase tracking-wider">
                  Select a classification to edit
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">
                    Edit: {selected.key}
                  </h3>
                  <button
                    onClick={() => {
                      if (isDirty && !confirm("Discard unsaved changes?")) return;
                      selectClassification(selected);
                    }}
                    className="text-xs font-mono text-accent hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Key */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">
                      Classification Key
                    </label>
                    <input
                      type="text"
                      value={editKey}
                      onChange={(e) => { setEditKey(e.target.value); setIsDirty(true); }}
                      className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="e.g. TERHAD"
                    />
                  </div>

                  {/* Label */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">
                      Display Label
                    </label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => { setEditLabel(e.target.value); setIsDirty(true); }}
                      className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="e.g. Terhad (Restricted)"
                    />
                  </div>

                  {/* Level */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">
                      Hierarchy Level (higher = more restricted)
                    </label>
                    <input
                      type="number"
                      value={editLevel}
                      onChange={(e) => { setEditLevel(Number(e.target.value)); setIsDirty(true); }}
                      className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                      min={0}
                      max={99}
                    />
                  </div>

                  {/* Default */}
                  <div className="space-y-1 flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editIsDefault}
                        onChange={(e) => { setEditIsDefault(e.target.checked); setIsDirty(true); }}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider">
                        Default for new files
                      </span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => { setEditDescription(e.target.value); setIsDirty(true); }}
                    className="h-10 w-full px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="Who can access, usage notes..."
                  />
                </div>

                {/* File count warning + Save */}
                <div className="flex items-center justify-between pt-2 border-t border-border/10">
                  <span className="text-[11px] font-mono text-foreground-subtle">
                    {selected.fileCount > 0
                      ? `${selected.fileCount} file(s) use this classification. Renaming the key will update all files.`
                      : "No files use this classification yet."}
                  </span>
                  <button
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-accent text-accent-foreground hover:bg-accent-hover text-xs font-semibold tracking-wider font-sans uppercase transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Access Control Sub-tab ───────────────────────────────────────────── */}
      {subTab === "access" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
          {/* Left: Classification list for access selection */}
          <div className="border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30 bg-background-panel/80">
              <span className="font-sans text-xs font-bold tracking-wider text-foreground-subtle uppercase">
                Select Tier
              </span>
            </div>
            <div className="divide-y divide-border/10 max-h-[600px] overflow-y-auto">
              {classifications.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectAccessClassification(c)}
                  className={cn(
                    "w-full text-left px-5 py-4 transition-colors cursor-pointer block",
                    selectedAccessId === c.id
                      ? "bg-accent/10 border-l-2 border-accent"
                      : "hover:bg-background-subtle/30 border-l-2 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground font-sans">{c.key}</span>
                    {c.isDefault && <Star size={11} className="text-accent fill-accent shrink-0" />}
                  </div>
                  <span className="text-[11px] font-mono text-foreground-subtle mt-0.5 block">
                    Level {c.level} · {c.fileCount} file(s)
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Permission checkboxes for read/write */}
          <div className="lg:col-span-2 border border-border/20 rounded-lg bg-background-panel/40 overflow-hidden">
            {!selectedAccessId || !selectedAccess ? (
              <div className="flex flex-col items-center justify-center py-12 gap-6 text-foreground-subtle px-6">
                <Eye size={36} className="opacity-30" />
                <div className="text-center space-y-2">
                  <p className="text-xs font-mono uppercase tracking-wider">
                    Select a classification above to manage its access rules
                  </p>
                  <p className="text-[10px] text-foreground-subtle/70 font-sans leading-relaxed max-w-md">
                    To set <strong>default access rules</strong> that auto-apply
                    to every new classification tier, configure these keys in the{" "}
                    <strong>Config</strong> tab:
                  </p>
                  <div className="inline-block text-left font-mono text-[10px] bg-background/50 border border-border/20 rounded p-3 mt-2 space-y-1">
                    <div>
                      <span className="text-accent">classification_default_read_perms</span>
                      <span className="text-foreground-subtle"> = files:read</span>
                    </div>
                    <div>
                      <span className="text-accent">classification_default_write_perms</span>
                      <span className="text-foreground-subtle"> = files:classify</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : accessLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={20} className="animate-spin text-accent" />
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground font-sans uppercase tracking-wider">
                      Access Rules: {selectedAccess.key}
                    </h3>
                    <p className="text-xs text-foreground-subtle mt-0.5">
                      Configure which permissions grant read and write access to this classification tier.
                    </p>
                  </div>
                </div>

                {/* Read permissions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-accent" />
                    <h4 className="text-xs font-bold text-foreground font-sans uppercase tracking-wider">
                      Read Access (who can view)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {classificationPerms.map((perm) => {
                      const pid = perm.id;
                      const checked = selectedReadIds.has(pid);
                      return (
                        <label
                          key={`read-${pid}`}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors text-xs",
                            checked
                              ? "border-accent/40 bg-accent/5"
                              : "border-border/20 hover:border-border/50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRead(pid)}
                            className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent shrink-0"
                          />
                          <span className="font-mono text-[10px] text-foreground font-semibold">
                            {perm.key}
                          </span>
                          <span className="text-[10px] text-foreground-subtle truncate hidden md:inline">
                            {perm.description}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Write permissions */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Pencil size={14} className="text-accent" />
                    <h4 className="text-xs font-bold text-foreground font-sans uppercase tracking-wider">
                      Write Access (who can assign/change to this tier)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {classificationPerms.map((perm) => {
                      const pid = perm.id;
                      const checked = selectedWriteIds.has(pid);
                      return (
                        <label
                          key={`write-${pid}`}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-colors text-xs",
                            checked
                              ? "border-accent/40 bg-accent/5"
                              : "border-border/20 hover:border-border/50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleWrite(pid)}
                            className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent shrink-0"
                          />
                          <span className="font-mono text-[10px] text-foreground font-semibold">
                            {perm.key}
                          </span>
                          <span className="text-[10px] text-foreground-subtle truncate hidden md:inline">
                            {perm.description}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Save access */}
                <div className="flex items-center justify-end pt-2 border-t border-border/10">
                  <button
                    onClick={handleSaveAccess}
                    disabled={!accessIsDirty || accessSaving}
                    className="flex items-center gap-1.5 h-9 px-4 rounded-md bg-accent text-accent-foreground hover:bg-accent-hover text-xs font-semibold tracking-wider font-sans uppercase transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {accessSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save Access Rules
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Modal ──────────────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-border/80 bg-background-panel p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">New Classification</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                Define a new data classification tier.
              </p>
            </div>
            {createError && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                    Key
                  </label>
                  <input
                    type="text"
                    value={createKey}
                    onChange={(e) => setCreateKey(e.target.value.toUpperCase())}
                    placeholder="e.g. RAHSIA"
                    className="h-9 w-full px-2.5 rounded border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                    Level
                  </label>
                  <input
                    type="number"
                    value={createLevel}
                    onChange={(e) => setCreateLevel(Number(e.target.value))}
                    min={0}
                    max={99}
                    className="h-9 w-full px-2.5 rounded border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                  Label
                </label>
                <input
                  type="text"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  placeholder="e.g. Rahsia (Secret)"
                  className="h-9 w-full px-2.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                  Description
                </label>
                <input
                  type="text"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Usage notes..."
                  className="h-9 w-full px-2.5 rounded border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createIsDefault}
                  onChange={(e) => setCreateIsDefault(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                <span className="text-[10px] font-semibold text-foreground-subtle font-mono uppercase">
                  Set as default for new files
                </span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={createLoading}
                className="px-3 h-8 rounded border border-border hover:bg-background-subtle/40 text-foreground-subtle hover:text-foreground uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLoading}
                className="px-3 h-8 rounded bg-accent text-accent-foreground hover:bg-accent-hover uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
              >
                {createLoading ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Delete Classification</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                Are you sure you want to delete{" "}
                <span className="text-accent font-bold">{deleteTarget.key}</span>?
                {deleteTarget.fileCount > 0 && (
                  <span className="text-destructive block mt-1">
                    ⚠ This classification is used by {deleteTarget.fileCount} file(s). You must
                    reclassify them before deleting.
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-3 h-8 rounded border border-border hover:bg-background-subtle/40 text-foreground-subtle hover:text-foreground uppercase tracking-wider cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading || deleteTarget.fileCount > 0}
                className="px-3 h-8 rounded bg-destructive text-white hover:bg-destructive/80 uppercase tracking-wider cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              >
                {deleteLoading ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
