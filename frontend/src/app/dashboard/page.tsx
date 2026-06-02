"use client";

import { useState, useId, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Folder,
  File,
  FileText,
  MoreHorizontal,
  Trash2,
  Download,
  Share2,
  Star,
  FolderPlus,
  Check,
  Search,
  Upload,
  Eye,
  Edit2,
  FileCheck,
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useFileStore, FileNode } from "@/store/useFileStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import FileAccessSheet from "@/components/features/FileAccessSheet";
import FloatingActionBar from "@/components/features/FloatingActionBar";
import ExecutiveOverview from "@/components/features/ExecutiveOverview";
import FilePreviewOverlay from "@/components/features/FilePreviewOverlay";
import { cn } from "@/lib/utils";

// ── Portal-based dropdown that escapes parent overflow clipping ─────────────
function RowDropdownMenu({
  open,
  onClose,
  anchorEl,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const recalc = useCallback(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const mw = 176; // w-44
    let left = rect.right - mw;
    if (left < 8) left = 8;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    const mh = 400;
    const top = rect.bottom + 4;
    const finalTop =
      top + mh > window.innerHeight - 8 ? rect.top - mh - 4 : top;
    setPos({ top: finalTop, left });
  }, [anchorEl]);

  useEffect(() => {
    if (!open) return;

    // Defer initial position calc to avoid setState-in-effect lint
    rafRef.current = requestAnimationFrame(recalc);

    window.addEventListener("scroll", recalc, true);
    window.addEventListener("resize", recalc);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", recalc, true);
      window.removeEventListener("resize", recalc);
    };
  }, [open, recalc]);

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        ref={menuRef}
        className="fixed z-[60] w-44 rounded border border-border/80 bg-background-panel shadow-lg p-1 space-y-0.5 text-left font-mono"
        style={{ top: pos.top, left: pos.left }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

export default function FileExplorerPage() {
  const folderNameInputId = useId();
  const classificationInputId = useId();
  const renameInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Zustand Store Hooks ────────────────────────────────────────────────────
  const files = useFileStore((state) => state.files);
  const selectedIds = useFileStore((state) => state.selectedIds);
  const searchQuery = useFileStore((state) => state.searchQuery);
  const setSearchQuery = useFileStore((state) => state.setSearchQuery);
  const activeView = useFileStore((state) => state.activeView);
  const isLoading = useFileStore((state) => state.isLoading);
  const error = useFileStore((state) => state.error);
  const fetchFiles = useFileStore((state) => state.fetchFiles);
  const currentFolderId = useFileStore((state) => state.currentFolderId);
  const page = useFileStore((state) => state.page);
  const totalPages = useFileStore((state) => state.totalPages);
  const total = useFileStore((state) => state.total);
  const sort = useFileStore((state) => state.sort);
  const order = useFileStore((state) => state.order);
  const setPage = useFileStore((state) => state.setPage);
  const setSort = useFileStore((state) => state.setSort);
  const uploadProgress = useFileStore((state) => state.uploadProgress);
  const uploadFileNameStore = useFileStore((state) => state.uploadFileName);
  const downloadFile = useFileStore((state) => state.downloadFile);

  const toggleSelection = useFileStore((state) => state.toggleSelection);
  const selectAll = useFileStore((state) => state.selectAll);
  const deleteFile = useFileStore((state) => state.deleteFile);
  const createFolder = useFileStore((state) => state.createFolder);
  const uploadFileReal = useFileStore((state) => state.uploadFileReal);
  const toggleFavorite = useFileStore((state) => state.toggleFavorite);

  const setActiveFile = useFileStore((state) => state.setActiveFile);
  const setAccessSheetOpen = useFileStore((state) => state.setAccessSheetOpen);
  const renameFile = useFileStore((state) => state.renameFile);
  const mapsToFolder = useFileStore((state) => state.mapsToFolder);
  const setActiveView = useFileStore((state) => state.setActiveView);
  const goBack = useFileStore((state) => state.goBack);
  const setPreviewFileId = useFileStore((state) => state.setPreviewFileId);

  const sharedFiles = useFileStore((state) => state.sharedFiles);
  const isLoadingShared = useFileStore((state) => state.isLoadingShared);
  const errorShared = useFileStore((state) => state.errorShared);
  const fetchSharedFiles = useFileStore((state) => state.fetchSharedFiles);

  const trashFiles = useFileStore((state) => state.trashFiles);
  const isLoadingTrash = useFileStore((state) => state.isLoadingTrash);
  const errorTrash = useFileStore((state) => state.errorTrash);
  const fetchTrash = useFileStore((state) => state.fetchTrash);
  const restoreFile = useFileStore((state) => state.restoreFile);
  const permanentDelete = useFileStore((state) => state.permanentDelete);

  const tasks = useOperationsStore((state) => state.tasks);
  const isLoadingTasks = useOperationsStore((state) => state.isLoading);
  const errorTasks = useOperationsStore((state) => state.error);
  const fetchTasks = useOperationsStore((state) => state.fetchTasks);
  const approveTask = useOperationsStore((state) => state.approveTask);
  const rejectTask = useOperationsStore((state) => state.rejectTask);
  const submitRequest = useOperationsStore((state) => state.submitRequest);

  // ── Fetch files on mount and when folder changes ───────────────────────────
  useEffect(() => {
    fetchFiles();
  }, [currentFolderId, fetchFiles]);

  // ── Fetch shared files when switching to shared view ───────────────────────
  useEffect(() => {
    if (activeView === "shared") {
      fetchSharedFiles();
    }
  }, [activeView, fetchSharedFiles]);

  // ── Fetch trash when switching to trash view ──────────────────────────────
  useEffect(() => {
    if (activeView === "trash") {
      fetchTrash();
    }
  }, [activeView, fetchTrash]);

  // ── Fetch governance tasks when switching to governance view ──────────────
  useEffect(() => {
    if (activeView === "governance") {
      fetchTasks();
    }
  }, [activeView, fetchTasks]);

  // ── Component state ────────────────────────────────────────────────────────
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Governance modal state
  const [isGovModalOpen, setIsGovModalOpen] = useState(false);
  const [govForm, setGovForm] = useState({
    type: "FILE_LOCK",
    title: "",
    description: "",
    targetFileId: "",
  });
  const [govFormError, setGovFormError] = useState<string | null>(null);
  const [govFormLoading, setGovFormLoading] = useState(false);

  // Form states
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadClassification, setUploadClassification] = useState<"RAHSIA" | "SULIT" | "TERBUKA">("TERBUKA");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

  // ── Drag & drop handlers ───────────────────────────────────────────────────
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      for (let i = 0; i < droppedFiles.length; i++) {
        uploadFileReal(droppedFiles[i], uploadClassification);
      }
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredFiles = files.filter((file) => {
    const matchesFolder = file.parentId === currentFolderId;
    const matchesSearch =
      !searchQuery || file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const allFilteredIds = filteredFiles.map((f) => f.id);
  const isAllSelected =
    filteredFiles.length > 0 &&
    filteredFiles.every((file) => selectedIds.includes(file.id));

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      selectAll(selectedIds.filter((id) => !allFilteredIds.includes(id)));
    } else {
      selectAll(Array.from(new Set([...selectedIds, ...allFilteredIds])));
    }
  };

  // ── Create folder ──────────────────────────────────────────────────────────
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      await createFolder(newFolderName.trim());
      setNewFolderName("");
      setIsFolderModalOpen(false);
    }
  };

  // ── Upload file ────────────────────────────────────────────────────────────
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      await uploadFileReal(selectedFile, uploadClassification);
      setSelectedFile(null);
      setIsUploadModalOpen(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // ── Rename ─────────────────────────────────────────────────────────────────
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim() && renameTargetId) {
      await renameFile(renameTargetId, renameValue.trim());
      setRenameValue("");
      setRenameTargetId(null);
      setIsRenameModalOpen(false);
    }
  };

  const getFileIcon = (file: FileNode) => {
    if (file.type === "folder") {
      return <Folder className="text-accent shrink-0 fill-accent/5" size={16} strokeWidth={2} />;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || ext === "docx" || ext === "txt") {
      return <FileText className="text-info shrink-0" size={16} strokeWidth={2} />;
    }
    return <File className="text-foreground-subtle shrink-0" size={16} strokeWidth={2} />;
  };

  const openAccessControl = (file: FileNode) => {
    setActiveFile(file);
    setAccessSheetOpen(true);
  };

  const initiateRename = (file: FileNode) => {
    setRenameTargetId(file.id);
    setRenameValue(file.name);
    setIsRenameModalOpen(true);
  };

  const currentFolder = files.find(
    (f) => f.id === currentFolderId && f.type === "folder"
  );
  const currentTitle = currentFolder ? currentFolder.name : "My Files";

  // ── View routing ───────────────────────────────────────────────────────────
  if (activeView === "overview") {
    return <ExecutiveOverview />;
  }

  if (activeView === "governance") {
    const pendingTasks = tasks.filter((t) => t.status === "PENDING");
    const historyTasks = tasks.filter((t) => t.status !== "PENDING");
    const lockedFiles = files.filter((f) => f.lockedBy);

    const handleGovSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!govForm.title.trim()) {
        setGovFormError("Title is required.");
        return;
      }
      setGovFormLoading(true);
      setGovFormError(null);
      try {
        await submitRequest({
          type: govForm.type,
          title: govForm.title.trim(),
          description: govForm.description.trim() || undefined,
          targetFileId: govForm.targetFileId || undefined,
          metadata:
            govForm.type === "CLASSIFICATION_UPGRADE" || govForm.type === "CLASSIFICATION_DOWNGRADE"
              ? { newClassification: "SULIT" }
              : govForm.type === "FILE_LOCK"
                ? { lockReason: govForm.description || "Governance review required" }
                : undefined,
        });
        setGovForm({ type: "FILE_LOCK", title: "", description: "", targetFileId: "" });
        setIsGovModalOpen(false);
      } catch (err) {
        setGovFormError(err instanceof Error ? err.message : "Failed to submit request");
      } finally {
        setGovFormLoading(false);
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4 select-none">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded border border-accent/20 bg-accent-subtle flex items-center justify-center">
                <Shield size={14} className="text-accent" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
                Corporate Governance Console
              </h1>
            </div>
            <p className="text-xs text-foreground-subtle font-mono mt-1">
              Authorization workflow for file locks, unlocks, and classification changes.
            </p>
          </div>
          <button
            onClick={() => setIsGovModalOpen(true)}
            className="btn-shimmer h-8 px-3 rounded text-[11px] font-bold tracking-wider uppercase font-mono flex items-center gap-1.5 shadow-sm transition-all"
          >
            <FileCheck size={12} />
            New Request
          </button>
        </div>

        {/* Status ticker */}
        <div className="w-full bg-background-panel/40 border border-border/30 px-4 py-1.5 rounded-sm flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-foreground-subtle select-none">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>GOVERNANCE REGISTER: ACTIVE</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span>LOCKED ASSETS: {lockedFiles.length}</span>
            <span className="text-foreground-subtle/30">|</span>
            <span>PENDING: {pendingTasks.length}</span>
            <span className="text-foreground-subtle/30">|</span>
            <span>PROCESSED: {historyTasks.length}</span>
          </div>
          <span className="flex items-center gap-1"><Shield size={10} className="text-accent" /> ACTIVE</span>
        </div>

        {errorTasks && (
          <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{errorTasks}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Approval Queue */}
          <div className="lg:col-span-7 border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5 space-y-4 flex flex-col">
            <div className="border-b border-border/20 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">
                  Authorization Sign-Off Register
                </h2>
                <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
                  Pending requests requiring administrative approval.
                </p>
              </div>
              <span className="h-5 px-2 rounded-full bg-accent-subtle border border-accent/20 text-[9px] font-mono font-bold text-accent flex items-center justify-center">
                {pendingTasks.length} Pending
              </span>
            </div>

            {isLoadingTasks ? (
              <div className="py-12 text-center">
                <Loader2 size={20} className="mx-auto text-accent animate-spin mb-2" />
                <p className="text-[10px] text-foreground-subtle font-mono">LOADING...</p>
              </div>
            ) : pendingTasks.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-border/20 rounded-sm bg-background/10 text-foreground-subtle flex-1">
                <CheckCircle className="mx-auto text-success/60 mb-2" size={18} />
                <p className="text-[10px] font-mono">ALL PROTOCOLS SATISFIED</p>
                <p className="text-[9px] text-foreground-subtle mt-1">Submit a new request to initiate governance workflow.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 flex-1">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="p-3 border border-border/30 rounded-sm bg-background-panel/40 flex items-center justify-between gap-3 transition-all">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider font-mono uppercase border",
                          task.type === "FILE_LOCK" && "bg-destructive/10 text-destructive border-destructive/20",
                          task.type === "FILE_UNLOCK" && "bg-success/10 text-success border-success/20",
                          task.type === "CLASSIFICATION" && "bg-warning/10 text-warning border-warning/20"
                        )}>{task.type.replace("_", " ")}</span>
                        <span className="font-mono text-[9px] text-foreground-subtle">{task.timestamp}</span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">{task.title}</h4>
                      <p className="text-[9px] font-mono text-foreground-muted">REQ: {task.requestedBy} • {task.amountValue}</p>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono shrink-0">
                      <button onClick={() => rejectTask(task.id)} className="h-6 px-2.5 rounded-sm border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/15 text-[9px] font-bold uppercase transition-all cursor-pointer">Decline</button>
                      <button onClick={() => approveTask(task.id)} className="h-6 px-2.5 rounded-sm border border-success/20 text-success bg-success/5 hover:bg-success/15 text-[9px] font-bold uppercase transition-all cursor-pointer">Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* History */}
            <div className="space-y-2 pt-3 border-t border-border/10">
              <span className="block font-mono text-[9px] font-bold text-foreground-subtle/70 uppercase tracking-wider">
                Processed History ({historyTasks.length})
              </span>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {historyTasks.slice(0, 20).map((task) => (
                  <div key={task.id} className="p-2 border border-border/10 rounded-sm bg-background/10 flex items-center justify-between text-[10px] font-mono">
                    <div className="truncate max-w-[280px]">
                      <span className="font-bold text-foreground truncate block">{task.title}</span>
                      <span className="text-[8px] text-foreground-subtle">{task.requestedBy} • {task.timestamp}</span>
                    </div>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ml-2",
                      task.status === "APPROVED" ? "bg-success/10 text-success border border-success/15" : "bg-destructive/10 text-destructive border border-destructive/15"
                    )}>{task.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Active Locks + Request Info */}
          <div className="lg:col-span-5 border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">Active Lock Registry</h2>
                <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
                  Files currently restricted by governance locks. Submit an unlock request to release.
                </p>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {lockedFiles.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-border/20 rounded bg-background/5 text-foreground-subtle">
                    <Lock className="mx-auto text-success/50 mb-2" size={20} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Zero Active Locks</h4>
                    <p className="text-[10px] text-foreground-subtle mt-1 max-w-xs mx-auto leading-relaxed">
                      All files are currently unrestricted. Use the New Request button to lock sensitive files.
                    </p>
                  </div>
                ) : (
                  lockedFiles.map((file) => (
                    <div key={file.id} className="p-3 border border-border/25 rounded-sm bg-background-panel/40 text-xs space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-1 py-0.5 rounded-sm text-[8px] font-bold tracking-wider font-mono uppercase border",
                          file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                          file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                          file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                        )}>{file.classification}</span>
                        <span className="font-mono text-[9px] text-foreground-subtle">ID: {file.id.slice(0, 8)}</span>
                      </div>
                      <h4
                        onClick={() => { setActiveView("files"); mapsToFolder(file.parentId); }}
                        className="font-bold text-foreground truncate hover:text-accent cursor-pointer"
                      >{file.name}</h4>
                      <p className="text-[10px] text-foreground-subtle font-mono">{file.lockReason || 'Governance lock'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="border-t border-border/10 pt-3 flex justify-between items-center text-[9px] font-mono text-foreground-subtle select-none mt-4">
              <span>GOVERNANCE WORKFLOW v1.0</span>
              <span className="text-success font-bold">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* ── New Governance Request Modal ── */}
        {isGovModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground font-serif">New Governance Request</h3>
                <p className="text-[10px] text-foreground-subtle font-mono">Submit an authorization request for review.</p>
              </div>
              {govFormError && (
                <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertCircle size={12} className="mt-0.5 shrink-0" /><span>{govFormError}</span>
                </div>
              )}
              <form onSubmit={handleGovSubmit} className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Request Type</label>
                  <select
                    value={govForm.type}
                    onChange={(e) => setGovForm((f) => ({ ...f, type: e.target.value }))}
                    className="h-8 w-full px-2 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="FILE_LOCK">File Lock</option>
                    <option value="FILE_UNLOCK">File Unlock</option>
                    <option value="CLASSIFICATION_UPGRADE">Classification Upgrade</option>
                    <option value="CLASSIFICATION_DOWNGRADE">Classification Downgrade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lock Q3 Financial Report"
                    value={govForm.title}
                    onChange={(e) => setGovForm((f) => ({ ...f, title: e.target.value }))}
                    className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Target File ID (optional)</label>
                  <input
                    type="text"
                    placeholder="UUID of the file"
                    value={govForm.targetFileId}
                    onChange={(e) => setGovForm((f) => ({ ...f, targetFileId: e.target.value }))}
                    className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Description / Reason</label>
                  <textarea
                    rows={3}
                    placeholder="Explain why this request is needed..."
                    value={govForm.description}
                    onChange={(e) => setGovForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
                  <button type="button" onClick={() => setIsGovModalOpen(false)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors">Cancel</button>
                  <button type="submit" disabled={govFormLoading} className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50">
                    {govFormLoading ? <Loader2 size={12} className="animate-spin" /> : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Shared with Me view ────────────────────────────────────────────────────
  if (activeView === "shared") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4 select-none">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
                Shared with Me
              </h1>
            </div>
            <p className="text-xs text-foreground-subtle font-mono mt-1">
              Files and folders that other users have shared with you.
            </p>
          </div>
        </div>

        {errorShared && (
          <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{errorShared}</span>
          </div>
        )}

        <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
          {isLoadingShared ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 size={32} className="mx-auto text-accent animate-spin" />
              <p className="text-xs text-foreground-subtle font-mono">LOADING SHARED DIRECTORY...</p>
            </div>
          ) : sharedFiles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Share2 className="mx-auto text-foreground-subtle/40" size={32} />
              <h3 className="text-sm font-semibold text-foreground">No shared files</h3>
              <p className="text-xs text-foreground-subtle max-w-sm mx-auto leading-relaxed">
                No one has shared any files with you yet. Ask a colleague to share a file using the file access panel.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/30 bg-background-panel/80 text-[11px] font-bold tracking-wider text-foreground-subtle uppercase font-mono select-none">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold w-24">Size</th>
                    <th className="px-4 py-2.5 font-semibold w-28 text-center">Classification</th>
                    <th className="px-4 py-2.5 font-semibold w-36">Shared By</th>
                    <th className="px-4 py-2.5 font-semibold w-24 text-center">Role</th>
                    <th className="px-4 py-2.5 font-semibold w-40">Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-xs">
                  {sharedFiles.map((file) => (
                    <tr
                      key={file.id}
                      onDoubleClick={() => {
                        if (file.type === "folder") {
                          mapsToFolder(file.id);
                        } else {
                          setPreviewFileId(file.id);
                        }
                      }}
                      className={cn(
                        "group transition-colors duration-100 select-none",
                        file.type === "folder" ? "cursor-pointer" : "",
                        "hover:bg-background-subtle/30"
                      )}
                    >
                      <td className="px-4 py-2 font-medium">
                        <div className="flex items-center gap-2.5 truncate max-w-md">
                          {getFileIcon(file)}
                          <span
                            onClick={() => {
                              if (file.type !== "folder") setPreviewFileId(file.id);
                            }}
                            className="truncate text-foreground group-hover:text-accent transition-colors font-sans cursor-pointer select-all"
                          >
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted select-none">{file.size}</td>
                      <td className="px-4 py-2 text-center select-none">
                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-wider font-mono uppercase border",
                          file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                          file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                          file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                        )}>{file.classification}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted truncate max-w-[140px]">
                        {file.lockedBy || "—"}
                      </td>
                      <td className="px-4 py-2 text-center select-none">
                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider font-mono uppercase border",
                          file.accessRole === "editor"
                            ? "bg-info/10 text-info border-info/20"
                            : "bg-background-muted/40 text-foreground-subtle border-border/40"
                        )}>
                          {file.accessRole}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted select-none">{file.modifiedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Shared helper for recent/favorites views ──────────────────────────────
  const renderSimpleListView = (title: string, subtitle: string, viewFiles: FileNode[]) => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4 select-none">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">{title}</h1>
          <p className="text-xs text-foreground-subtle font-mono mt-1">{subtitle}</p>
        </div>
      </div>
      <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
        {viewFiles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <h3 className="text-sm font-semibold text-foreground">No items</h3>
            <p className="text-xs text-foreground-subtle max-w-sm mx-auto">Nothing to display in this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/30 bg-background-panel/80 text-[11px] font-bold tracking-wider text-foreground-subtle uppercase font-mono select-none">
                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold w-24">Size</th>
                  <th className="px-4 py-2.5 font-semibold w-28 text-center">Classification</th>
                  <th className="px-4 py-2.5 font-semibold w-40">Modified</th>
                  <th className="w-12 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-xs">
                {viewFiles.map((file) => (
                  <tr
                    key={file.id}
                    onDoubleClick={() => {
                      if (file.type === "folder") mapsToFolder(file.id);
                      else setPreviewFileId(file.id);
                    }}
                    className="group transition-colors duration-100 hover:bg-background-subtle/30 cursor-pointer"
                  >
                    <td className="px-4 py-2 font-medium">
                      <div className="flex items-center gap-2.5 truncate max-w-md">
                        {getFileIcon(file)}
                        <span className="truncate text-foreground group-hover:text-accent transition-colors font-sans select-all">{file.name}</span>
                        {file.isFavorite && <Star className="text-accent fill-accent shrink-0" size={10} />}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted">{file.size}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={cn(
                        "inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-wider font-mono uppercase border",
                        file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                        file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                        file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                      )}>{file.classification}</span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted">{file.modifiedAt}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (menuOpenId === file.id) {
                            setMenuOpenId(null);
                            setMenuAnchorEl(null);
                          } else {
                            setMenuAnchorEl(e.currentTarget as HTMLElement);
                            setMenuOpenId(file.id);
                          }
                        }}
                        className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-foreground transition-colors"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      <RowDropdownMenu
                        open={menuOpenId === file.id}
                        onClose={() => { setMenuOpenId(null); setMenuAnchorEl(null); }}
                        anchorEl={menuAnchorEl}
                      >
                        <button
                          onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); if (file.type !== "folder") setPreviewFileId(file.id); else openAccessControl(file); }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors"
                        >
                          <Eye size={11} className="text-foreground-subtle shrink-0" /> View
                        </button>
                        <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); openAccessControl(file); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors">
                          <Share2 size={11} className="text-foreground-subtle shrink-0" /> Manage Access
                        </button>
                        <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); toggleFavorite(file.id); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors">
                          <Star size={11} className={cn("shrink-0", file.isFavorite ? "text-accent fill-accent" : "text-foreground-subtle")} />
                          {file.isFavorite ? "Remove Favorite" : "Add Favorite"}
                        </button>
                        <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); downloadFile(file.id); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors">
                          <Download size={11} className="text-foreground-subtle shrink-0" /> Download
                        </button>
                        <hr className="border-t border-border/10 my-1" />
                        <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); deleteFile(file.id); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-destructive hover:bg-destructive/15 rounded transition-colors">
                          <Trash2 size={11} className="text-destructive shrink-0" /> Move to Trash
                        </button>
                      </RowDropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // ── Recent Files view ─────────────────────────────────────────────────────
  if (activeView === "recent") {
    const recentViewFiles = [...files].sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return renderSimpleListView("Recent Files", `${recentViewFiles.length} items`, recentViewFiles);
  }

  // ── Favorites view ─────────────────────────────────────────────────────────
  if (activeView === "favorites") {
    const favFiles = files.filter((f) => f.isFavorite);
    return renderSimpleListView("Favorites", `${favFiles.length} favorited`, favFiles);
  }

  // ── Trash view ─────────────────────────────────────────────────────────────
  if (activeView === "trash") {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4 select-none">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
              Trash Repository
            </h1>
            <p className="text-xs text-foreground-subtle font-mono mt-1">
              Files remain in trash for 30 days before automatic removal.
            </p>
          </div>
        </div>
        {errorTrash && (
          <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" /><span>{errorTrash}</span>
          </div>
        )}
        <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
          {isLoadingTrash ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 size={32} className="mx-auto text-accent animate-spin" />
              <p className="text-xs text-foreground-subtle font-mono">LOADING TRASH...</p>
            </div>
          ) : trashFiles.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Trash2 className="mx-auto text-foreground-subtle/40" size={32} />
              <h3 className="text-sm font-semibold text-foreground">Trash is empty</h3>
              <p className="text-xs text-foreground-subtle max-w-sm mx-auto leading-relaxed">
                Deleted files will appear here and can be restored within 30 days.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/30 bg-background-panel/80 text-[11px] font-bold tracking-wider text-foreground-subtle uppercase font-mono select-none">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold w-24">Size</th>
                    <th className="px-4 py-2.5 font-semibold w-28 text-center">Classification</th>
                    <th className="px-4 py-2.5 font-semibold w-40">Trashed</th>
                    <th className="px-4 py-2.5 font-semibold w-40 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-xs">
                  {trashFiles.map((file) => (
                    <tr key={file.id} className="group transition-colors duration-100 hover:bg-background-subtle/30">
                      <td className="px-4 py-2 font-medium">
                        <div className="flex items-center gap-2.5 truncate max-w-md">
                          {getFileIcon(file)}
                          <span className="truncate text-foreground font-sans">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted">{file.size}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-wider font-mono uppercase border",
                          file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                          file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                          file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                        )}>{file.classification}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted">{file.modifiedAt}</td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => restoreFile(file.id)}
                            className="h-7 px-2.5 rounded-sm border border-success/20 text-success bg-success/5 hover:bg-success/15 text-[9px] font-bold tracking-wider uppercase font-mono transition-all cursor-pointer"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => { if (confirm(`Permanently delete "${file.name}"? This cannot be undone.`)) permanentDelete(file.id); }}
                            className="h-7 px-2.5 rounded-sm border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/15 text-[9px] font-bold tracking-wider uppercase font-mono transition-all cursor-pointer"
                          >
                            Delete Forever
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
      </div>
    );
  }

  // ── Main file explorer view ─────────────────────────────────────────────────
  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      className="space-y-6 relative"
    >
      {/* ── Title and Toolbars ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4 select-none">
        <div>
          <div className="flex items-center gap-2">
            {currentFolderId && (
              <button
                onClick={goBack}
                className="h-7 w-7 flex items-center justify-center rounded-sm border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft size={14} strokeWidth={2} />
              </button>
            )}
            <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">{currentTitle}</h1>
          </div>
          <p className="text-xs text-foreground-subtle font-mono mt-1">
            {filteredFiles.length} item{filteredFiles.length !== 1 ? "s" : ""} found
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="h-8 px-3 rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-[11px] font-bold tracking-wider uppercase font-mono text-foreground-muted flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus size={12} className="text-accent" />
            New Folder
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="btn-shimmer h-8 px-3 rounded text-[11px] font-bold tracking-wider uppercase font-mono flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Upload size={12} />
            Upload File
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Mobile search ── */}
      <div className="sm:hidden relative">
        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-foreground-subtle">
          <Search size={12} />
        </span>
        <label htmlFor="mobile-search-input" className="sr-only">Search corporate drive</label>
        <input
          id="mobile-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search files..."
          className="h-8 w-full pl-8 pr-3 rounded border border-input-border bg-input-bg text-xs text-foreground focus:outline-none focus:border-accent"
        />
      </div>

      {/* ── File explorer table ── */}
      <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 size={32} className="mx-auto text-accent animate-spin" />
            <p className="text-xs text-foreground-subtle font-mono">FETCHING CORPORATE DIRECTORY...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Folder className="mx-auto text-foreground-subtle/40" size={32} />
            <h3 className="text-sm font-semibold text-foreground">No files located</h3>
            <p className="text-xs text-foreground-subtle max-w-sm mx-auto leading-relaxed">
              No directories or objects match your current directory filters or search queries.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/30 bg-background-panel/80 text-[11px] font-bold tracking-wider text-foreground-subtle uppercase font-mono select-none">
                  <th className="w-10 px-4 py-2.5 text-center">
                    <label className="relative flex items-center justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAllToggle}
                        className="sr-only peer"
                      />
                      <span className="h-3.5 w-3.5 rounded-sm border border-input-border bg-input-bg transition-all peer-checked:bg-accent peer-checked:border-accent peer-focus-visible:ring-1 peer-focus-visible:ring-accent flex items-center justify-center">
                        <Check size={8} className="text-accent-foreground hidden peer-checked:block" strokeWidth={3} />
                      </span>
                    </label>
                  </th>
                  <th className="px-4 py-2.5 font-semibold cursor-pointer hover:text-accent transition-colors select-none" onClick={() => setSort("name")}>Name{sort === "name" ? (order === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th className="px-4 py-2.5 font-semibold w-24 cursor-pointer hover:text-accent transition-colors select-none" onClick={() => setSort("size")}>Size{sort === "size" ? (order === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th className="px-4 py-2.5 font-semibold w-28 text-center cursor-pointer hover:text-accent transition-colors select-none" onClick={() => setSort("classification")}>Class.{sort === "classification" ? (order === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th className="px-4 py-2.5 font-semibold w-40 cursor-pointer hover:text-accent transition-colors select-none" onClick={() => setSort("updated")}>Modified{sort === "updated" ? (order === "asc" ? " ↑" : " ↓") : ""}</th>
                  <th className="px-4 py-2.5 font-semibold w-28 text-center">Access</th>
                  <th className="w-12 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-xs">
                {filteredFiles.map((file) => {
                  const isSelected = selectedIds.includes(file.id);
                  return (
                    <tr
                      key={file.id}
                      onDoubleClick={() => {
                        if (file.type === "folder") {
                          mapsToFolder(file.id);
                        } else {
                          setPreviewFileId(file.id);
                        }
                      }}
                      className={cn(
                        "group transition-colors duration-100 select-none",
                        file.type === "folder" ? "cursor-pointer" : "",
                        isSelected
                          ? "bg-accent-subtle/5 hover:bg-accent-subtle/10"
                          : "hover:bg-background-subtle/30"
                      )}
                    >
                      <td className="px-4 py-2 text-center">
                        <label className="relative flex items-center justify-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(file.id)}
                            className="sr-only peer"
                          />
                          <span className="h-3.5 w-3.5 rounded-sm border border-input-border bg-input-bg transition-all peer-checked:bg-accent peer-checked:border-accent peer-focus-visible:ring-1 peer-focus-visible:ring-accent flex items-center justify-center">
                            <Check size={8} className="text-accent-foreground hidden peer-checked:block" strokeWidth={3} />
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-2 font-medium">
                        <div className="flex items-center gap-2.5 truncate max-w-md">
                          {getFileIcon(file)}
                          <span
                            onClick={() => {
                              if (file.type === "folder") {
                                mapsToFolder(file.id);
                              } else {
                                openAccessControl(file);
                              }
                            }}
                            className="truncate text-foreground group-hover:text-accent transition-colors font-sans cursor-pointer select-all"
                          >
                            {file.name}
                          </span>
                          {file.lockedBy && (
                            <span title={`LOCKED: ${file.lockReason || 'Pending Corporate Approval'} (Locked by ${file.lockedBy})`}>
                              <Lock className="text-accent shrink-0 fill-accent/15 cursor-help" size={10} />
                            </span>
                          )}
                          {file.isFavorite && <Star className="text-accent fill-accent shrink-0" size={10} />}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted select-none">{file.size}</td>
                      <td className="px-4 py-2 text-center select-none">
                        <span className={cn(
                          "inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-wider font-mono uppercase border",
                          file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                          file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                          file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                        )}>{file.classification}</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted select-none">{file.modifiedAt}</td>
                      <td className="px-4 py-2 text-center select-none">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-background/50 border border-border/20 text-[9px] font-mono capitalize text-foreground-subtle">{file.accessRole}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (menuOpenId === file.id) {
                              setMenuOpenId(null);
                              setMenuAnchorEl(null);
                            } else {
                              setMenuAnchorEl(e.currentTarget as HTMLElement);
                              setMenuOpenId(file.id);
                            }
                          }}
                          className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        <RowDropdownMenu
                          open={menuOpenId === file.id}
                          onClose={() => { setMenuOpenId(null); setMenuAnchorEl(null); }}
                          anchorEl={menuAnchorEl}
                        >
                          <button
                            onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); if (file.type !== "folder") setPreviewFileId(file.id); else openAccessControl(file); }}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors"
                          >
                            <Eye size={11} className="text-foreground-subtle shrink-0" /> View
                          </button>
                          <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); openAccessControl(file); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors">
                            <Share2 size={11} className="text-foreground-subtle shrink-0" /> Manage Access
                          </button>
                          {file.lockedBy ? (
                            <button disabled title={`LOCKED: ${file.lockReason || 'Pending Corporate Approval'}`} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-subtle/40 bg-background/5 cursor-not-allowed text-left rounded">
                              <Edit2 size={11} className="text-foreground-subtle/30 shrink-0" /><span>Rename</span>
                              <span className="ml-auto text-[8px] font-bold text-accent uppercase">LOCKED</span>
                            </button>
                          ) : (
                            <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); initiateRename(file); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors">
                              <Edit2 size={11} className="text-foreground-subtle shrink-0" /> Rename
                            </button>
                          )}
                          <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); toggleFavorite(file.id); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors">
                            <Star size={11} className={cn("shrink-0", file.isFavorite ? "text-accent fill-accent" : "text-foreground-subtle")} />
                            {file.isFavorite ? "Remove Favorite" : "Add Favorite"}
                          </button>
                          <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); downloadFile(file.id); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors">
                            <Download size={11} className="text-foreground-subtle shrink-0" /> Download
                          </button>
                          <hr className="border-t border-border/10 my-1" />
                          {file.lockedBy ? (
                            <button disabled className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-destructive/40 bg-background/5 cursor-not-allowed text-left rounded">
                              <Trash2 size={11} className="text-destructive/30 shrink-0" /><span>Delete</span>
                              <span className="ml-auto text-[8px] font-bold text-accent uppercase">LOCKED</span>
                            </button>
                          ) : (
                            <button onClick={() => { setMenuOpenId(null); setMenuAnchorEl(null); deleteFile(file.id); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-destructive hover:bg-destructive/15 rounded transition-colors">
                              <Trash2 size={11} className="text-destructive shrink-0" /> Delete
                            </button>
                          )}
                        </RowDropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 select-none font-mono text-[10px] text-foreground-subtle">
          <span>{total.toLocaleString()} items total</span>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&lt;</button>
            <span className="px-2 text-foreground-muted font-bold">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="h-7 w-7 rounded border border-border bg-background-panel hover:bg-background-subtle/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-foreground transition-colors">&gt;</button>
          </div>
        </div>
      )}

      {/* ── FileAccessSheet ── */}
      <FileAccessSheet />
      <FloatingActionBar />

      {/* ── Folder Creation Modal ── */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Create New Directory</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">Specify the title for the new container.</p>
            </div>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <div>
                <label htmlFor={folderNameInputId} className="sr-only">Folder Directory Title</label>
                <input
                  id={folderNameInputId}
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Audit_Logs_2026"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground placeholder-foreground-subtle/50 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
                <button type="button" onClick={() => setIsFolderModalOpen(false)} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors">Cancel</button>
                <button type="submit" className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground">Create Folder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── File Upload Modal ── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Secure File Upload</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">Select a file to upload securely to the repository.</p>
            </div>
            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Select File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    onChange={handleFileSelect}
                    className="h-8 w-full text-xs text-foreground file:mr-2 file:py-1 file:px-2 file:rounded-sm file:border file:border-border file:bg-background file:text-xs file:text-foreground file:cursor-pointer hover:file:bg-accent-subtle/20"
                  />
                  {selectedFile && (
                    <p className="text-[9px] font-mono text-foreground-muted mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor={classificationInputId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Classification Security Level</label>
                  <select
                    id={classificationInputId}
                    value={uploadClassification}
                    onChange={(e) => setUploadClassification(e.target.value as "RAHSIA" | "SULIT" | "TERBUKA")}
                    className="h-8 w-full px-2 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  >
                    <option value="TERBUKA">TERBUKA (Unrestricted)</option>
                    <option value="SULIT">SULIT (Restricted C-Suite)</option>
                    <option value="RAHSIA">RAHSIA (Highest Protocol)</option>
                  </select>
                </div>
              </div>
              {/* Upload progress bar */}
              {uploadProgress !== null && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[9px] font-mono text-foreground-subtle">
                    <span>Uploading{uploadFileNameStore ? `: ${uploadFileNameStore}` : ""}</span>
                    <span className="font-bold text-accent">{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-background-subtle rounded-full overflow-hidden border border-border/10">
                    <div className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
                <button type="button" onClick={() => { setIsUploadModalOpen(false); setSelectedFile(null); }} disabled={uploadProgress !== null} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors disabled:opacity-30">Cancel</button>
                <button type="submit" disabled={uploadProgress !== null} className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50">Commit Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Rename Modal ── */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Rename Object</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">Input a new designation for this repository record.</p>
            </div>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <div>
                <label htmlFor={renameInputId} className="sr-only">New record title</label>
                <input
                  id={renameInputId}
                  type="text"
                  required
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
                <button type="button" onClick={() => { setIsRenameModalOpen(false); setRenameTargetId(null); }} className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors">Cancel</button>
                <button type="submit" className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground">Apply Rename</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Drag & Drop Overlay ── */}
      {isDragging && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200 select-none cursor-copy"
        >
          <div className="absolute inset-6 rounded-sm border border-dashed border-accent/40 flex flex-col items-center justify-center gap-4 bg-background-panel/95 backdrop-blur-md shadow-2xl pointer-events-none">
            <div className="h-12 w-12 rounded-full border border-accent/30 bg-accent/5 flex items-center justify-center animate-pulse">
              <Shield className="text-accent animate-spin-slow" size={24} strokeWidth={1.5} />
            </div>
            <p className="font-mono text-xs font-bold tracking-[0.15em] text-accent text-center max-w-md uppercase leading-relaxed px-4">
              RELEASE FILES TO UPLOAD SECURELY TO CURRENT WORKSPACE
            </p>
            <div className="flex items-center gap-1.5 text-[9px] text-foreground-subtle font-mono uppercase tracking-widest bg-background/50 border border-border/20 px-2.5 py-1 rounded-sm">
              <Lock size={10} className="text-accent animate-bounce" /> AES-256 Encrypted Transfer
            </div>
          </div>
        </div>
      )}
      {/* Phase 6 secure file previewer overlay modal */}
      <FilePreviewOverlay />
    </div>
  );
}
