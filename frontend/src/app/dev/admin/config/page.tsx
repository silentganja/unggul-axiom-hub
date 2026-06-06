"use client";

import React, { useState } from "react";
import ConfigTab from "@/components/features/admin/ConfigTab";

export default function ConfigAdminPage() {
  const [configMap, setConfigMap] = useState<Record<string, string>>({});
  const [configEditKey, setConfigEditKey] = useState<string | null>(null);
  const [configEditVal, setConfigEditVal] = useState("");

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
