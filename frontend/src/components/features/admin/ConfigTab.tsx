"use client";
import { useEffect } from "react";
import { Loader2, Edit2, Check } from "lucide-react";
import { adminApi } from "@/lib/api";

interface Props {
  configMap: Record<string, string>;
  setConfigMap: (m: Record<string, string>) => void;
  configEditKey: string | null; setConfigEditKey: (k: string | null) => void;
  configEditVal: string; setConfigEditVal: (v: string) => void;
}

const LABELS: Record<string, string> = {
  default_storage_quota_bytes: "Default Storage Quota (bytes)",
  jwt_expiry_hours: "JWT Expiry (hours)",
  allowed_classifications: "Allowed Classifications",
};

export default function ConfigTab({ configMap, setConfigMap, configEditKey, setConfigEditKey, configEditVal, setConfigEditVal }: Props) {
  useEffect(() => {
    adminApi.getConfig().then(setConfigMap).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (key: string) => {
    try { await adminApi.updateConfig(key, configEditVal); setConfigMap({...configMap, [key]: configEditVal}); setConfigEditKey(null); }
    catch { alert("Failed to save"); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-foreground font-serif">System Configuration</h2>
        <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">Runtime configuration values stored in the database.</p>
      </div>
      <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden divide-y divide-border/20">
        {Object.keys(LABELS).length === 0 ? (
          <div className="p-8 text-center"><Loader2 size={16} className="animate-spin mx-auto text-accent" /></div>
        ) : (
          Object.entries(LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-xs font-bold text-foreground font-mono">{label}</span>
                <p className="text-[9px] text-foreground-subtle font-mono mt-0.5">{key}</p>
              </div>
              <div className="flex items-center gap-2">
                {configEditKey === key ? (
                  <>
                    <input value={configEditVal} onChange={e => setConfigEditVal(e.target.value)}
                      className="h-7 w-48 px-2 rounded-sm border border-border bg-background text-[10px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    <button onClick={() => handleSave(key)} className="h-7 w-7 rounded-sm border border-success/20 bg-success/5 text-success hover:bg-success/15 flex items-center justify-center transition-colors cursor-pointer"><Check size={12} /></button>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-mono text-foreground-muted max-w-[300px] truncate">{configMap[key] || "—"}</span>
                    <button onClick={() => { setConfigEditKey(key); setConfigEditVal(configMap[key] || ""); }} className="h-7 w-7 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-foreground-subtle flex items-center justify-center transition-colors cursor-pointer"><Edit2 size={11} /></button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
