"use client";

import { useFileStore } from "@/store/useFileStore";
import { Trash2, Download, FolderInput, X } from "lucide-react";


export default function FloatingActionBar() {
  const selectedIds = useFileStore((state) => state.selectedIds);
  const clearSelection = useFileStore((state) => state.clearSelection);
  const deleteSelected = useFileStore((state) => state.deleteSelected);
  const files = useFileStore((state) => state.files);

  if (selectedIds.length === 0) return null;

  const handleDownloadAll = () => {
    // Collect filenames
    const selectedFiles = files.filter((f) => selectedIds.includes(f.id));
    const names = selectedFiles.map((f) => f.name).join(", ");
    alert(`Initiating secure batch download for [${selectedIds.length}] items:\n${names}`);
  };

  const handleMoveTo = () => {
    alert(`Initiating secure directory move command for [${selectedIds.length}] selected objects.`);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-in fade-in slide-in-from-bottom-4 duration-250 select-none">
      
      {/* ── Frosted Glass Bulk Action Pill ── */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-accent/20 bg-background-panel/90 backdrop-blur-md shadow-md text-foreground">
        
        {/* Selection Count Metadata */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-accent/15 border border-accent/25 text-accent text-[9px] font-bold font-mono flex items-center justify-center animate-pulse">
            {selectedIds.length}
          </div>
          <span className="font-mono text-[11px] font-semibold text-foreground-muted">
            {selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected
          </span>
        </div>

        {/* Compact Button Actions */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={handleDownloadAll}
            className="h-8 px-2.5 rounded border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold tracking-wider uppercase font-mono text-foreground-subtle hover:text-foreground flex items-center gap-1.5 transition-colors"
            title="Download all selected"
          >
            <Download size={11} className="text-accent" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={handleMoveTo}
            className="h-8 px-2.5 rounded border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold tracking-wider uppercase font-mono text-foreground-subtle hover:text-foreground flex items-center gap-1.5 transition-colors"
            title="Move items"
          >
            <FolderInput size={11} className="text-accent" />
            <span className="hidden sm:inline">Move To</span>
          </button>

          <span className="h-4 w-px bg-border/30" />

          <button
            onClick={deleteSelected}
            className="h-8 px-2.5 rounded border border-destructive/35 bg-destructive/5 hover:bg-destructive/15 text-[10px] font-bold tracking-wider uppercase font-mono text-destructive flex items-center gap-1.5 transition-colors"
            title="Delete all selected"
          >
            <Trash2 size={11} />
            <span className="hidden sm:inline">Delete Selected</span>
          </button>

          <span className="h-4 w-px bg-border/30" />

          {/* Close Clear Action */}
          <button
            onClick={clearSelection}
            className="h-7 w-7 rounded flex items-center justify-center hover:bg-background-subtle/40 border border-transparent hover:border-border text-foreground-subtle hover:text-foreground transition-all"
            title="Clear selection"
          >
            <X size={12} />
          </button>

        </div>

      </div>
      
    </div>
  );
}
