"use client";

import React, { useEffect, useState } from "react";
import ConfigTab from "@/components/features/admin/ConfigTab";
import { adminApi } from "@/lib/api";

export default function ConfigAdminPage() {
  const [configMap, setConfigMap] = useState<Record<string, string>>({});
  const [configEditKey, setConfigEditKey] = useState<string | null>(null);
  const [configEditVal, setConfigEditVal] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch config on mount and whenever a ui-config-update event fires
  useEffect(() => {
    const fetchConfig = () => {
      adminApi
        .getConfig()
        .then((data) => setConfigMap(data))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    };
    fetchConfig();
    window.addEventListener("ui-config-update", fetchConfig);
    return () => window.removeEventListener("ui-config-update", fetchConfig);
  }, []);

  return (
    <ConfigTab
      configMap={configMap}
      setConfigMap={setConfigMap}
      configEditKey={configEditKey}
      setConfigEditKey={setConfigEditKey}
      configEditVal={configEditVal}
      setConfigEditVal={setConfigEditVal}
      isLoading={isLoading}
    />
  );
}
