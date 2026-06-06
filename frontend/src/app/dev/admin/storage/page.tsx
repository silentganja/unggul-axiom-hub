"use client";

import React, { useState } from "react";
import StorageTab from "@/components/features/admin/StorageTab";
import { UserStorageRow } from "@/lib/api";

export default function StorageAdminPage() {
  const [storageRows, setStorageRows] = useState<UserStorageRow[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);

  return (
    <StorageTab
      storageRows={storageRows}
      setStorageRows={setStorageRows}
      storageLoading={storageLoading}
      setStorageLoading={setStorageLoading}
    />
  );
}
