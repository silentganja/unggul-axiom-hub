"use client";
import { useEffect, useState } from "react";
import { Loader2, Edit2, Check } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useToastStore } from "@/components/ui/Toast";

interface Props {
  configMap: Record<string, string>;
  setConfigMap: (m: Record<string, string>) => void;
  configEditKey: string | null; setConfigEditKey: (k: string | null) => void;
  configEditVal: string; setConfigEditVal: (v: string) => void;
}

const LABELS: Record<string, string> = {
  default_storage_quota_bytes: "Default Storage Quota (bytes, 5 GB = 5368709120)",
  jwt_expiry_hours: "JWT Expiry (hours)",
  allowed_classifications: "Allowed Classifications",
};

export default function ConfigTab({ configMap, setConfigMap, configEditKey, setConfigEditKey, configEditVal, setConfigEditVal }: Props) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    adminApi.getConfig().then(setConfigMap).catch(() => {}).finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (key: string) => {
    try { await adminApi.updateConfig(key, configEditVal); setConfigMap({...configMap, [key]: configEditVal}); setConfigEditKey(null); }
    catch { useToastStore.getState().error("Failed to save configuration"); }
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-foreground font-serif">System Configuration</h2>
        <p className="text-xs text-foreground-subtle mt-1">Runtime configuration values stored in the database.</p>
      </div>
      <div className="border border-border/30 rounded-lg bg-background-panel/40 overflow-hidden divide-y divide-border/20">
        {isLoading ? (
          <div className="p-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>
        ) : (
          Object.entries(LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between px-6 py-4 gap-4">
              <div>
                <span className="text-sm font-semibold text-foreground">{label}</span>
                <p className="text-xs text-foreground-subtle font-mono mt-1">{key}</p>
              </div>
              <div className="flex items-center gap-3">
                {configEditKey === key ? (
                  <>
                    <input value={configEditVal} onChange={e => setConfigEditVal(e.target.value)}
                      className="h-9 w-64 px-3 rounded-md border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
                    <button onClick={() => handleSave(key)} className="h-9 w-9 rounded-md border border-success/20 bg-success/5 text-success hover:bg-success/15 flex items-center justify-center transition-colors cursor-pointer"><Check size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-mono text-foreground-muted max-w-[300px] truncate">{configMap[key] || "-"}</span>
                    <button onClick={() => { setConfigEditKey(key); setConfigEditVal(configMap[key] || ""); }} className="h-9 w-9 rounded-md border border-border bg-background hover:bg-background-subtle/50 text-foreground-subtle flex items-center justify-center transition-colors cursor-pointer"><Edit2 size={13} /></button>
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
