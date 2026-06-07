"use client";
import { useState } from "react";
import { Edit2, Check, Plus, Trash2, X, HelpCircle, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useToastStore } from "@/components/ui/Toast";

interface Props {
  configMap: Record<string, string>;
  setConfigMap: (m: Record<string, string>) => void;
  configEditKey: string | null; setConfigEditKey: (k: string | null) => void;
  configEditVal: string; setConfigEditVal: (v: string) => void;
}

// ── Config key metadata: category, label, description, input type ─────────────
interface ConfigMeta {
  label: string;
  description: string;
  category: "UI/UX" | "System" | "Limits & Security";
  inputType: "text" | "number" | "url" | "select";
  options?: { label: string; value: string }[];
  placeholder?: string;
}

const CONFIG_META: Record<string, ConfigMeta> = {
  // ── UI/UX ──────────────────────────────────────────────────────────────────
  ui_theme: {
    label: "UI Theme",
    description: "Color accent palette applied across the dashboard, admin console, and login pages. Determines border glows, accent highlights, and ambient background tones.",
    category: "UI/UX",
    inputType: "select",
    options: [
      { label: "Midnight (bronze/gold)", value: "midnight" },
      { label: "Cyberpunk (amber)", value: "cyberpunk" },
      { label: "Emerald (green)", value: "emerald" },
      { label: "Ocean (blue)", value: "ocean" },
    ],
  },
  ui_glass_blur: {
    label: "Glass Blur Intensity (px)",
    description: "Backdrop-filter blur radius applied to glassmorphism panels (glass-premium class). Higher values produce a stronger frosted-glass effect. Recommended range: 8–30.",
    category: "UI/UX",
    inputType: "number",
    placeholder: "20",
  },
  ui_glow_intensity: {
    label: "Glow Intensity",
    description: "Opacity multiplier for the ambient box-shadow glow on premium glass panels. Affects --border and --border-strong CSS variables. Recommended range: 0.05–0.40.",
    category: "UI/UX",
    inputType: "number",
    placeholder: "0.15",
  },
  ui_scanlines_opacity: {
    label: "Scanlines Opacity",
    description: "Opacity of the CRT-style scanline overlay grid applied to page backgrounds. Set to 0 to disable entirely. Recommended range: 0.005–0.04.",
    category: "UI/UX",
    inputType: "number",
    placeholder: "0.015",
  },
  ui_typography: {
    label: "Typography",
    description: "Base font family used for body text across the interface. 'Sans' uses Inter, 'Serif' uses Playfair Display.",
    category: "UI/UX",
    inputType: "select",
    options: [
      { label: "Sans (Inter)", value: "sans" },
      { label: "Serif (Playfair Display)", value: "serif" },
    ],
  },
  ui_org_name: {
    label: "Organization Name",
    description: "Displayed in the admin console header, sidebar brand area, and page titles throughout the application.",
    category: "UI/UX",
    inputType: "text",
    placeholder: "Unggul Axiom",
  },
  ui_logo_url: {
    label: "Logo URL",
    description: "Absolute or relative URL to a logo image shown in the admin console header and sidebar. Leave empty to show the default shield icon.",
    category: "UI/UX",
    inputType: "url",
    placeholder: "https://example.com/logo.png",
  },
  ui_greeting_header: {
    label: "Greeting Header",
    description: "Primary heading text shown in the admin console header bar next to the logo.",
    category: "UI/UX",
    inputType: "text",
    placeholder: "Strategic Portal",
  },

  // ── System ─────────────────────────────────────────────────────────────────
  default_storage_quota_bytes: {
    label: "Default Storage Quota (bytes)",
    description: "Storage allocation granted to newly created users who do not receive an explicit per-user quota. 5 GB = 5368709120 bytes.",
    category: "System",
    inputType: "number",
    placeholder: "5368709120",
  },
  jwt_expiry_hours: {
    label: "JWT Expiry (hours)",
    description: "Lifetime of issued JSON Web Tokens. Shorter values increase security but require more frequent re-authentication. Recommended: 24–168 (1 day – 1 week).",
    category: "System",
    inputType: "number",
    placeholder: "72",
  },
  allowed_classifications: {
    label: "Allowed Classifications",
    description: "Comma-separated list of security classification tiers available for file labelling. Used to populate classification dropdowns and enforce governance workflows.",
    category: "System",
    inputType: "text",
    placeholder: "UNCLASSIFIED, RESTRICTED, CONFIDENTIAL, SECRET, TOP SECRET",
  },

  // ── Limits & Security ──────────────────────────────────────────────────────
  session_timeout_minutes: {
    label: "Session Timeout (minutes)",
    description: "Idle timeout for admin console sessions. After this period of inactivity the admin is automatically logged out. Recommended: 10–60.",
    category: "Limits & Security",
    inputType: "number",
    placeholder: "15",
  },
  max_file_size_bytes: {
    label: "Max Upload Size (bytes)",
    description: "Maximum allowed file size for uploads. Files exceeding this limit are rejected by the server. 100 MB = 104857600 bytes.",
    category: "Limits & Security",
    inputType: "number",
    placeholder: "104857600",
  },
  password_min_length: {
    label: "Min Password Length",
    description: "Minimum character count enforced when creating or resetting user passwords. Recommended: 8–16.",
    category: "Limits & Security",
    inputType: "number",
    placeholder: "8",
  },
  audit_retention_days: {
    label: "Audit Log Retention (days)",
    description: "Number of days to retain audit log entries before automatic purging. Set to 0 to keep indefinitely. Recommended: 90–365.",
    category: "Limits & Security",
    inputType: "number",
    placeholder: "90",
  },
  trash_retention_days: {
    label: "Trash Retention (days)",
    description: "Number of days soft-deleted files remain in trash before permanent deletion. Set to 0 to keep indefinitely. Recommended: 30–90.",
    category: "Limits & Security",
    inputType: "number",
    placeholder: "30",
  },
};

const CATEGORY_ORDER = ["UI/UX", "System", "Limits & Security"] as const;

export default function ConfigTab({ configMap, setConfigMap, configEditKey, setConfigEditKey, configEditVal, setConfigEditVal }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);

  const handleSave = async (key: string) => {
    try {
      await adminApi.updateConfig(key, configEditVal);
      setConfigMap({ ...configMap, [key]: configEditVal });
      setConfigEditKey(null);
      // Dispatch event so parent layouts re-read config and apply UI changes in real-time
      window.dispatchEvent(new Event("ui-config-update"));
      useToastStore.getState().success(`"${key}" updated`);
    } catch {
      useToastStore.getState().error("Failed to save configuration");
    }
  };

  const handleCreate = async () => {
    setCreateError(null);
    const key = newKey.trim();
    if (!key) { setCreateError("Key is required"); return; }
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      setCreateError("Key must start with a letter and contain only lowercase letters, numbers, and underscores");
      return;
    }
    if (configMap[key] !== undefined) {
      setCreateError(`Key "${key}" already exists. Edit it instead.`);
      return;
    }
    try {
      await adminApi.updateConfig(key, newValue);
      setConfigMap({ ...configMap, [key]: newValue });
      setNewKey("");
      setNewValue("");
      setShowCreate(false);
      window.dispatchEvent(new Event("ui-config-update"));
      useToastStore.getState().success(`"${key}" created`);
    } catch {
      useToastStore.getState().error("Failed to create configuration");
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await adminApi.deleteConfig(key);
      const next = { ...configMap };
      delete next[key];
      setConfigMap(next);
      setDeleteConfirm(null);
      if (configEditKey === key) setConfigEditKey(null);
      window.dispatchEvent(new Event("ui-config-update"));
      useToastStore.getState().success(`"${key}" deleted`);
    } catch {
      useToastStore.getState().error("Failed to delete configuration");
    }
  };

  const getInput = (key: string, value: string, meta?: ConfigMeta) => {
    if (meta?.inputType === "select" && meta.options) {
      return (
        <select
          value={configEditVal}
          onChange={e => setConfigEditVal(e.target.value)}
          className="h-9 w-64 px-3 rounded-md border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {meta.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={meta?.inputType === "number" ? "number" : meta?.inputType === "url" ? "url" : "text"}
        value={configEditVal}
        onChange={e => setConfigEditVal(e.target.value)}
        placeholder={meta?.placeholder}
        className="h-9 w-64 px-3 rounded-md border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
      />
    );
  };

  const formatDisplayValue = (key: string, value: string): string => {
    if (!value) return "-";
    const meta = CONFIG_META[key];
    if (meta?.inputType === "select" && meta.options) {
      const opt = meta.options.find(o => o.value === value);
      return opt ? opt.label : value;
    }
    if (key === "default_storage_quota_bytes" || key === "max_file_size_bytes") {
      try {
        const bytes = parseInt(value, 10);
        if (bytes >= 1073741824) return `${value} (${(bytes / 1073741824).toFixed(1)} GB)`;
        if (bytes >= 1048576) return `${value} (${(bytes / 1048576).toFixed(1)} MB)`;
        if (bytes >= 1024) return `${value} (${(bytes / 1024).toFixed(1)} KB)`;
      } catch {}
    }
    return value;
  };

  const categorize = (): Record<string, [string, string][]> => {
    const groups: Record<string, [string, string][]> = {};
    for (const cat of CATEGORY_ORDER) groups[cat] = [];
    const uncategorized: [string, string][] = [];
    for (const [key, value] of Object.entries(configMap).sort(([a], [b]) => a.localeCompare(b))) {
      const cat = CONFIG_META[key]?.category;
      if (cat && groups[cat]) {
        groups[cat].push([key, value]);
      } else {
        uncategorized.push([key, value]);
      }
    }
    // Append uncategorized as "Other" if any
    if (uncategorized.length > 0) groups["Other"] = uncategorized;
    return groups;
  };

  const grouped = categorize();
  const usedKeys = Object.keys(configMap);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground font-serif">System Configuration</h2>
          <p className="text-xs text-foreground-subtle mt-1">
            Runtime configuration values stored in the database. Changes take effect immediately.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(null); setNewKey(""); setNewValue(""); }}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-accent/25 text-accent bg-accent/5 hover:bg-accent/15 transition-colors text-[10px] font-bold tracking-wider uppercase font-mono cursor-pointer"
        >
          <Plus size={13} /> Add Config
        </button>
      </div>

      {/* ── Create New Config Panel ── */}
      {showCreate && (
        <div className="border border-accent/30 rounded-lg bg-accent/5 p-4 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">New Configuration Entry</span>
            <button onClick={() => setShowCreate(false)} className="text-foreground-subtle hover:text-foreground transition-colors cursor-pointer"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold font-mono uppercase text-foreground-subtle">Key</label>
              <input
                value={newKey}
                onChange={e => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="e.g. session_timeout_minutes"
                className="h-9 w-full px-3 rounded-md border border-border bg-background text-xs font-mono text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold font-mono uppercase text-foreground-subtle">Value</label>
              <input
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                placeholder="e.g. 30"
                className="h-9 w-full px-3 rounded-md border border-border bg-background text-xs font-mono text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:ring-1 focus:ring-accent"
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          {createError && (
            <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span>{createError}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowCreate(false)}
              className="h-8 px-3 rounded-md border border-border text-foreground-subtle hover:text-foreground text-[10px] font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="h-8 px-4 rounded-md bg-accent text-accent-foreground hover:bg-accent-hover text-[10px] font-bold font-mono uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={12} /> Create
            </button>
          </div>
        </div>
      )}

      {/* ── Grouped Config Entries ── */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, entries]) => {
          if (entries.length === 0) return null;
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-accent/70">
                  {category}
                </span>
                <span className="h-px flex-1 bg-border/20" />
              </div>
              <div className="border border-border/30 rounded-lg bg-background-panel/40 overflow-hidden divide-y divide-border/20">
                {entries.map(([key, value]) => {
                  const meta = CONFIG_META[key];
                  const isDeleteConfirming = deleteConfirm === key;
                  return (
                    <div key={key} className="flex items-center justify-between px-5 py-3.5 gap-4 group/config-row">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">
                            {meta?.label || key}
                          </span>
                          {meta?.description && (
                            <div className="relative">
                              <button
                                onClick={() => setTooltipKey(tooltipKey === key ? null : key)}
                                className="text-foreground-subtle/40 hover:text-accent transition-colors cursor-pointer"
                                tabIndex={-1}
                              >
                                <HelpCircle size={12} />
                              </button>
                              {tooltipKey === key && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setTooltipKey(null)} />
                                  <div className="absolute z-20 bottom-full left-0 mb-1.5 w-72 p-3 rounded-md border border-border/40 bg-background-panel shadow-xl backdrop-blur-md animate-in fade-in duration-100">
                                    <p className="text-xs text-foreground-subtle leading-relaxed font-sans">{meta.description}</p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-foreground-subtle/60 font-mono mt-0.5">{key}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {configEditKey === key ? (
                          <>
                            {getInput(key, value, meta)}
                            <button
                              onClick={() => handleSave(key)}
                              className="h-9 w-9 rounded-md border border-success/20 bg-success/5 text-success hover:bg-success/15 flex items-center justify-center transition-colors cursor-pointer"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setConfigEditKey(null)}
                              className="h-9 w-9 rounded-md border border-border bg-background hover:bg-background-subtle/50 text-foreground-subtle flex items-center justify-center transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : isDeleteConfirming ? (
                          <>
                            <span className="text-[10px] font-mono text-destructive font-bold uppercase tracking-wider">Delete?</span>
                            <button
                              onClick={() => handleDelete(key)}
                              className="h-8 px-3 rounded-md border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/15 transition-colors text-[10px] font-bold font-mono uppercase cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="h-8 px-3 rounded-md border border-border text-foreground-subtle hover:text-foreground transition-colors text-[10px] font-bold font-mono uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-mono text-foreground-muted max-w-[320px] truncate hidden sm:inline">
                              {formatDisplayValue(key, value)}
                            </span>
                            <button
                              onClick={() => { setConfigEditKey(key); setConfigEditVal(configMap[key] || ""); }}
                              className="h-8 w-8 rounded-md border border-border bg-background hover:bg-background-subtle/50 text-foreground-subtle flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover/config-row:opacity-100 sm:opacity-100"
                              title="Edit"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(key)}
                              className="h-8 w-8 rounded-md border border-border/40 bg-background hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-foreground-subtle/50 flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover/config-row:opacity-100 sm:opacity-100"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {usedKeys.length === 0 && !showCreate && (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm text-foreground-subtle font-sans">No configuration entries found.</p>
            <p className="text-xs text-foreground-subtle/60 font-mono">Click &ldquo;Add Config&rdquo; to create the first entry.</p>
          </div>
        )}
      </div>
    </div>
  );
}
