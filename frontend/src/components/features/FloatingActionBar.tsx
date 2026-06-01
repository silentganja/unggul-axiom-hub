"use client";

import { useState } from "react";
import { useFileStore } from "@/store/useFileStore";
import { Trash2, Download, FolderInput, X, Folder, ArrowLeft, Loader2 } from "lucide-react";

export default function FloatingActionBar() {
  const selectedIds = useFileStore((state) => state.selectedIds);
  const clearSelection = useFileStore((state) => state.clearSelection);
  const deleteSelected = useFileStore((state) => state.deleteSelected);
  const moveFiles = useFileStore((state) => state.moveFiles);
  const files = useFileStore((state) => state.files);
  const currentFolderId = useFileStore((state) => state.currentFolderId);

  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<string | null>(currentFolderId);
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  const handleDownloadAll = () => {
    const selectedFiles = files.filter((f) => selectedIds.includes(f.id) && f.type === "file");
    if (selectedFiles.length === 0) return;
    // Download sequentially with a small delay to avoid browser blocking
    selectedFiles.forEach((f, i) => {
      setTimeout(() => {
        const store = useFileStore.getState();
        store.downloadFile(f.id);
      }, i * 300);
    });
  };

  const handleMove = async () => {
    setIsMoving(true);
    setMoveError(null);
    try {
      await moveFiles(selectedIds, moveTargetId);
      setIsMoveOpen(false);
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : "Move failed");
    } finally {
      setIsMoving(false);
    }
  };

  // Build folder breadcrumb trail for the move dialog
  const breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: "My Files" }];
  let trailId: string | null = moveTargetId ?? null;
  while (trailId) {
    const folder = files.find((f) => f.id === trailId && f.type === "folder");
    if (folder) {
      breadcrumbs.push({ id: folder.id, name: folder.name });
      trailId = folder.parentId;
    } else break;
  }
  const targetName = moveTargetId
    ? files.find((f) => f.id === moveTargetId && f.type === "folder")?.name || "Folder"
    : "My Files (Root)";

  const childFolders = files.filter(
    (f) => f.type === "folder" && f.parentId === moveTargetId && !selectedIds.includes(f.id)
  );

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-in fade-in slide-in-from-bottom-4 duration-250 select-none">
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-accent/20 bg-background-panel/90 backdrop-blur-md shadow-md text-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-accent/15 border border-accent/25 text-accent text-[9px] font-bold font-mono flex items-center justify-center">
              {selectedIds.length}
            </div>
            <span className="font-mono text-[11px] font-semibold text-foreground-muted">
              {selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handleDownloadAll} className="h-8 px-2.5 rounded border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold tracking-wider uppercase font-mono text-foreground-subtle hover:text-foreground flex items-center gap-1.5 transition-colors">
              <Download size={11} className="text-accent" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button onClick={() => { setIsMoveOpen(true); setMoveTargetId(currentFolderId); }} className="h-8 px-2.5 rounded border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold tracking-wider uppercase font-mono text-foreground-subtle hover:text-foreground flex items-center gap-1.5 transition-colors">
              <FolderInput size={11} className="text-accent" />
              <span className="hidden sm:inline">Move To</span>
            </button>
            <span className="h-4 w-px bg-border/30" />
            <button onClick={deleteSelected} className="h-8 px-2.5 rounded border border-destructive/35 bg-destructive/5 hover:bg-destructive/15 text-[10px] font-bold tracking-wider uppercase font-mono text-destructive flex items-center gap-1.5 transition-colors">
              <Trash2 size={11} />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <span className="h-4 w-px bg-border/30" />
            <button onClick={clearSelection} className="h-7 w-7 rounded flex items-center justify-center hover:bg-background-subtle/40 border border-transparent hover:border-border text-foreground-subtle hover:text-foreground transition-all">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Move folder picker dialog */}
      {isMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Move to Folder</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                Moving {selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} to:{" "}
                <span className="text-accent font-bold">{targetName}</span>
              </p>
            </div>

            {/* Parent navigation */}
            {moveTargetId && (
              <button
                onClick={() => {
                  const parent = files.find((f) => f.id === moveTargetId && f.type === "folder");
                  setMoveTargetId(parent?.parentId ?? null);
                }}
                className="flex items-center gap-2 text-[10px] font-bold font-mono text-foreground-subtle hover:text-accent uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ArrowLeft size={12} /> Parent Folder
              </button>
            )}

            {/* Folder list */}
            {moveError && (
              <div className="flex items-start gap-1.5 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] text-destructive font-mono">{moveError}</div>
            )}
            <div className="max-h-[240px] overflow-y-auto border border-border/20 rounded-sm bg-background/30 divide-y divide-border/10">
              {childFolders.length === 0 ? (
                <div className="p-6 text-center text-[10px] text-foreground-subtle font-mono">
                  No sub-folders here
                </div>
              ) : (
                childFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setMoveTargetId(f.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-foreground hover:bg-accent-subtle/20 transition-colors text-left cursor-pointer"
                  >
                    <Folder size={14} className="text-accent shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-between gap-2 text-[10px] font-bold font-mono pt-2">
              <button
                onClick={() => setMoveTargetId(null)}
                className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors"
              >
                Move to Root
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMoveOpen(false)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors">Cancel</button>
                <button onClick={handleMove} disabled={isMoving} className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50">
                  {isMoving ? <Loader2 size={12} className="animate-spin" /> : `Move Here`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
