"use client";

import React, { Suspense } from "react";
import FileBrowserTab from "@/components/features/admin/FileBrowserTab";
import { useSearchParams } from "next/navigation";

function FileBrowserContent() {
  const searchParams = useSearchParams();
  const filter = searchParams?.get("filter") || undefined;
  const userId = searchParams?.get("userId") || undefined;

  return <FileBrowserTab initialFilter={filter} initialUserId={userId} />;
}

export default function FilesAdminPage() {
  return (
    <Suspense fallback={<div className="font-mono text-xs text-foreground-subtle">Loading file browser...</div>}>
      <FileBrowserContent />
    </Suspense>
  );
}
