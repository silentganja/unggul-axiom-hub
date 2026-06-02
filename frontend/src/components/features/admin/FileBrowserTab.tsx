"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Folder, File, FileText, Search, ArrowLeft, Download, Trash2,
  Loader2, AlertCircle, Lock,
} from "lucide-react";
import {
  adminApi, BackendFileNode, AdminUserEntry,
  formatFileSize, formatTimestamp,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  initialFilter?: string;
  initialUserId?: string;
}

const CLASSIFICATION_ORDER: Record<string, number> = {
  TERBUKA: 0,
  TERHAD: 1,
  SULIT: 2,
  RAHSIA: 3,
};

function getFileIcon(file: BackendFileNode) {
  if (file.isFolder) {
    return <Folder className="text-accent shrink-0" size={16} />;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "docx" || ext === "txt") {
    return <FileText className="text-info shrink-0" size={16} />;
  }
  return <File className="text-foreground-subtle shrink-0" size={16} />;
}

export default function FileBrowserTab({ initialFilter, initialUserId }: Props) {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || "ALL");
  const [allFiles, setAllFiles] = useState<BackendFileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: "Root" },
  ]);

  // Search & Sort
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 25;

  // Preview modal
  const [previewFile, setPreviewFile] = useState<BackendFileNode | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<BackendFileNode | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    adminApi.listUsers()
      .then(u => {
        setUsers(u);
        if (selectedUserId === "ALL") {
          // Fetch files for every user in parallel, then merge
          return Promise.all(
            u.map(user =>
              adminApi.getUserFiles(user.id).catch(() => [])
            )
          ).then(results => results.flat());
        } else {
          return adminApi.getUserFiles(selectedUserId);
        }
      })
      .then(f => {
        setAllFiles(f);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  const goToFolder = useCallback((folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    setFolderStack(prev => [...prev, { id: folderId, name: folderName }]);
    setPage(1);
  }, []);

  const goBack = useCallback(() => {
    if (folderStack.length <= 1) return;
    const newStack = folderStack.slice(0, -1);
    setFolderStack(newStack);
    setCurrentFolderId(newStack[newStack.length - 1].id);
    setPage(1);
  }, [folderStack]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(o => o === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Initial filter (applied before sorting and other filtering)
  const initialFilteredFiles = !initialFilter || initialFilter === "ALL"
    ? allFiles
    : initialFilter === "LOCKED"
      ? allFiles.filter(f => !!f.lockedBy)
      : allFiles;

  // Sort a copy to avoid mutation and persist across pages
  const sortedFiles = [...initialFilteredFiles].sort((a, b) => {
    // Folders first
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    let cmp = 0;
    if (sortField === "name") cmp = a.name.localeCompare(b.name);
    else if (sortField === "size") cmp = a.sizeBytes - b.sizeBytes;
    else if (sortField === "classification") cmp = (CLASSIFICATION_ORDER[a.classification] ?? 0) - (CLASSIFICATION_ORDER[b.classification] ?? 0);
    else if (sortField === "updated") cmp = a.updatedAt.localeCompare(b.updatedAt);
    return sortOrder === "asc" ? cmp : -cmp;
  });

  // Filter files based on current folder and search
  const visibleFiles = sortedFiles.filter(f => {
    const matchesFolder = f.parentId === currentFolderId;
    const matchesSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const total = visibleFiles.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const paginatedFiles = visibleFiles.slice((page - 1) * perPage, page * perPage);

  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminApi.forceDeleteFile(deleteTarget.id);
      setAllFiles(prev => prev.filter(f => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownload = async (file: BackendFileNode) => {
    try {
      const token = localStorage.getItem("admin-token") || localStorage.getItem("auth-token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/files/${file.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Download failed");
    }
  };

  const currentPath = folderStack.map(f => f.name).join(" / ");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-foreground font-serif">File Browser</h2>
          <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">Browse and manage all files across users.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-foreground-subtle font-mono">User:</span>
          <select value={selectedUserId} onChange={e => { setSelectedUserId(e.target.value); setCurrentFolderId(null); setFolderStack([{ id: null, name: "Root" }]); }}
            className="h-7 px-2 rounded-sm border border-border bg-background text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="ALL">All Users</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation & Search */}
      <div className="flex flex-wrap items-center gap-2">
        {folderStack.length > 1 && (
          <button onClick={goBack}
            className="flex items-center gap-1 h-7 px-2 rounded-sm border border-border bg-background-panel hover:bg-background-subtle/50 text-[10px] font-mono text-foreground-subtle hover:text-foreground transition-all cursor-pointer">
            <ArrowLeft size={12} /> Back
          </button>
        )}
        <span className="text-[9px] font-mono text-foreground-muted truncate max-w-[300px]">{currentPath}</span>
        <div className="relative ml-auto">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-subtle pointer-events-none" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search in this folder..."
            className="h-7 w-48 pl-7 pr-2 rounded-sm border border-input-border bg-input-bg text-[10px] text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
        </div>
      </div>

      {error && <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive"><AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

      {/* File Table */}
      <div className="border border-border/40 rounded bg-background-panel/40 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-accent" /></div>
        ) : paginatedFiles.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border/20 rounded-sm">
            <Folder className="mx-auto text-foreground-subtle/40" size={28} />
            <p className="text-[10px] font-mono text-foreground-subtle mt-2">No files found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead>
                <tr className="border-b border-border/30 bg-background-panel/80 text-[10px] font-bold tracking-wider text-foreground-subtle uppercase select-none">
                  <th className="px-4 py-2.5 cursor-pointer hover:text-accent transition-colors" onClick={() => handleSort("name")}>Name{sortField === "name" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th className="px-4 py-2.5 w-20 cursor-pointer hover:text-accent transition-colors text-right" onClick={() => handleSort("size")}>Size{sortField === "size" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th className="px-4 py-2.5 w-24 text-center cursor-pointer hover:text-accent transition-colors" onClick={() => handleSort("classification")}>Class.{sortField === "classification" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}</th>
                  {selectedUserId === "ALL" && <th className="px-4 py-2.5 w-28">Owner</th>}
                  <th className="px-4 py-2.5 w-32 cursor-pointer hover:text-accent transition-colors" onClick={() => handleSort("updated")}>Modified{sortField === "updated" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th className="px-4 py-2.5 w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {paginatedFiles.map(f => (
                  <tr key={f.id} className="hover:bg-background-subtle/30 transition-colors group cursor-pointer"
                    onDoubleClick={() => { if (f.isFolder) goToFolder(f.id, f.name); else setPreviewFile(f); }}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5 truncate max-w-md">
                        {getFileIcon(f)}
                        <span className="truncate text-foreground group-hover:text-accent transition-colors font-sans font-semibold"
                          onClick={() => { if (f.isFolder) goToFolder(f.id, f.name); else setPreviewFile(f); }}>
                          {f.name}
                        </span>
                        {f.lockedBy && <span title={`Locked${f.lockReason ? ': ' + f.lockReason : ''}`}><Lock size={10} className="text-accent shrink-0" /></span>}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-foreground-muted">
                      {f.isFolder ? "—" : formatFileSize(f.sizeBytes)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn("px-1.5 py-0.5 rounded-sm text-[8px] font-bold uppercase border",
                        f.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                        f.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                        f.classification === "TERHAD" && "bg-info/15 text-info border-info/25",
                        f.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                      )}>{f.classification}</span>
                    </td>
                    {selectedUserId === "ALL" && (
                      <td className="px-4 py-2 text-foreground-muted text-[10px]">
                        {f.ownerId ? users.find(u => u.id === f.ownerId)?.fullName || f.ownerId.slice(0, 8) : "—"}
                      </td>
                    )}
                    <td className="px-4 py-2 text-foreground-muted text-[10px]">{formatTimestamp(f.updatedAt)}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {!f.isFolder && (
                          <button onClick={() => handleDownload(f)}
                            className="h-6 w-6 rounded flex items-center justify-center border border-transparent hover:border-accent/25 hover:bg-accent/10 text-foreground-subtle hover:text-accent transition-colors cursor-pointer" title="Download">
                            <Download size={11} />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(f)}
                          className="h-6 w-6 rounded flex items-center justify-center border border-transparent hover:border-destructive/25 hover:bg-destructive/10 text-foreground-subtle hover:text-destructive transition-colors cursor-pointer" title="Force delete">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between font-mono text-[10px] text-foreground-subtle select-none">
          <span>{total} items</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&lt;</button>
            <span className="px-2 text-foreground-muted font-bold">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&gt;</button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getFileIcon(previewFile)}
                <div>
                  <h3 className="text-sm font-semibold text-foreground font-sans">{previewFile.name}</h3>
                  <p className="text-[10px] font-mono text-foreground-subtle">
                    {previewFile.isFolder ? "Folder" : formatFileSize(previewFile.sizeBytes)} &bull; {previewFile.classification}
                  </p>
                </div>
              </div>
              <button onClick={() => setPreviewFile(null)}
                className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-foreground transition-all cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-foreground-muted">
              <div><span className="block text-[8px] text-foreground-subtle uppercase tracking-wider">ID</span>{previewFile.id.slice(0, 12)}...</div>
              <div><span className="block text-[8px] text-foreground-subtle uppercase tracking-wider">MIME</span>{previewFile.mimeType || "—"}</div>
              <div><span className="block text-[8px] text-foreground-subtle uppercase tracking-wider">Created</span>{formatTimestamp(previewFile.createdAt)}</div>
              <div><span className="block text-[8px] text-foreground-subtle uppercase tracking-wider">Modified</span>{formatTimestamp(previewFile.updatedAt)}</div>
            </div>
            <div className="flex justify-end gap-2 text-[10px] font-bold font-mono pt-2">
              {!previewFile.isFolder && (
                <button onClick={() => { handleDownload(previewFile); setPreviewFile(null); }}
                  className="h-8 px-3 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 transition-colors flex items-center gap-1.5 cursor-pointer">
                  <Download size={11} /> Download
                </button>
              )}
              <button onClick={() => { setDeleteTarget(previewFile); setPreviewFile(null); }}
                className="h-8 px-3 rounded-sm border border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/15 transition-colors flex items-center gap-1.5 cursor-pointer">
                <Trash2 size={11} /> Force Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-destructive font-serif">Force Delete</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">This action permanently deletes the file. Cannot be undone.</p>
            </div>
            <div className="p-3 border border-border/20 rounded bg-background/30 font-mono text-[10px] space-y-1">
              <div><span className="text-foreground-subtle">File:</span> <span className="text-foreground font-bold">{deleteTarget.name}</span></div>
              <div><span className="text-foreground-subtle">Type:</span> {deleteTarget.isFolder ? "Folder" : formatFileSize(deleteTarget.sizeBytes)}</div>
            </div>
            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
              <button onClick={() => setDeleteTarget(null)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors cursor-pointer">Cancel</button>
              <button onClick={handleForceDelete} disabled={deleteLoading}
                className="h-8 px-4 rounded-sm border border-destructive/35 bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors disabled:opacity-50 cursor-pointer">
                {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
