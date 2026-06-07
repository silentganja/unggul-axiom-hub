"use client";

import React, { useEffect, useState } from "react";
import ConfigTab from "@/components/features/admin/ConfigTab";
import { adminApi } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function ConfigAdminPage() {
  const [configMap, setConfigMap] = useState<Record<string, string>>({});
  const [configEditKey, setConfigEditKey] = useState<string | null>(null);
  const [configEditVal, setConfigEditVal] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch config on mount and whenever a ui-config-update event fires
  useEffect(() => {
    const fetchConfig = () => {
      adminApi
        .getConfig()
        .then((data) => {
          setConfigMap(data);
          setFetchError(null);
        })
        .catch(() => setFetchError("Failed to load configuration"))
        .finally(() => setIsLoading(false));
    };
    fetchConfig();
    window.addEventListener("ui-config-update", fetchConfig);
    return () => window.removeEventListener("ui-config-update", fetchConfig);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground font-serif">System Configuration</h2>
          <p className="text-xs text-foreground-subtle mt-1">Runtime configuration values stored in the database.</p>
        </div>
        <div className="p-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground font-serif">System Configuration</h2>
          <p className="text-xs text-foreground-subtle mt-1">Runtime configuration values stored in the database.</p>
        </div>
        <div className="p-12 text-center text-destructive text-sm font-mono">{fetchError}</div>
      </div>
    );
  }

  return (
    <ConfigTab
      configMap={configMap}
      setConfigMap={setConfigMap}
      configEditKey={configEditKey}
      setConfigEditKey={setConfigEditKey}
      configEditVal={configEditVal}
      setConfigEditVal={setConfigEditVal}
    />
  );
}
