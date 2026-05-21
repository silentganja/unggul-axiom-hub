"use client";

import { useState, useId } from "react";
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
  ArrowLeft,
  Shield,
  Lock,
  CheckCircle
} from "lucide-react";
import { useFileStore, FileNode } from "@/store/useFileStore";
import { useOperationsStore } from "@/store/useOperationsStore";
import FileAccessSheet from "@/components/features/FileAccessSheet";
import FloatingActionBar from "@/components/features/FloatingActionBar";
import ExecutiveOverview from "@/components/features/ExecutiveOverview";
import FilePreviewOverlay from "@/components/features/FilePreviewOverlay";
import { cn } from "@/lib/utils";

export default function FileExplorerPage() {
  const folderNameInputId = useId();
  const uploadNameInputId = useId();
  const uploadSizeInputId = useId();
  const classificationInputId = useId();
  const renameInputId = useId();

  // Zustand Store Hooks
  const files = useFileStore((state) => state.files);
  const selectedIds = useFileStore((state) => state.selectedIds);
  const searchQuery = useFileStore((state) => state.searchQuery);
  const setSearchQuery = useFileStore((state) => state.setSearchQuery);
  const activeView = useFileStore((state) => state.activeView);

  const toggleSelection = useFileStore((state) => state.toggleSelection);
  const selectAll = useFileStore((state) => state.selectAll);
  const deleteFile = useFileStore((state) => state.deleteFile);
  const deleteSelected = useFileStore((state) => state.deleteSelected);
  const createFolder = useFileStore((state) => state.createFolder);
  const uploadFile = useFileStore((state) => state.uploadFile);
  const toggleFavorite = useFileStore((state) => state.toggleFavorite);

  // Phase 3 Zustand Hooks
  const setActiveFile = useFileStore((state) => state.setActiveFile);
  const setAccessSheetOpen = useFileStore((state) => state.setAccessSheetOpen);
  const renameFile = useFileStore((state) => state.renameFile);

  // Phase 4 Zustand Hooks & Navigation
  const currentFolderId = useFileStore((state) => state.currentFolderId);
  const mapsToFolder = useFileStore((state) => state.mapsToFolder);
  const goBack = useFileStore((state) => state.goBack);

  // Phase 6 Zustand Hooks
  const setPreviewFileId = useFileStore((state) => state.setPreviewFileId);
  const unlockFile = useFileStore((state) => state.unlockFile);

  // Operations Store Hooks
  const tasks = useOperationsStore((state) => state.tasks);
  const approveTask = useOperationsStore((state) => state.approveTask);
  const rejectTask = useOperationsStore((state) => state.rejectTask);

  // Component Dialog/Modal States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);

  // Phase 4 Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

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
        const file = droppedFiles[i];
        const rawSize = file.size;
        let sizeStr = "--";
        if (rawSize > 1024 * 1024) {
          sizeStr = `${(rawSize / (1024 * 1024)).toFixed(1)} MB`;
        } else if (rawSize > 1024) {
          sizeStr = `${(rawSize / 1024).toFixed(0)} KB`;
        } else {
          sizeStr = `${rawSize} B`;
        }
        uploadFile(file.name, sizeStr, "TERBUKA");
      }
    }
  };

  // Form Field States
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileSize, setUploadFileSize] = useState("");
  const [uploadClassification, setUploadClassification] = useState<"RAHSIA" | "SULIT" | "TERBUKA">("TERBUKA");
  const [renameValue, setRenameValue] = useState("");

  // Dynamic Folder & Search Filter (Phase 4 context)
  const filteredFiles = files.filter((file) => {
    const matchesFolder = file.parentId === currentFolderId;
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const allFilteredIds = filteredFiles.map((f) => f.id);
  const isAllSelected =
    filteredFiles.length > 0 &&
    filteredFiles.every((file) => selectedIds.includes(file.id));

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      const newSelected = selectedIds.filter((id) => !allFilteredIds.includes(id));
      selectAll(newSelected);
    } else {
      const newSelected = Array.from(new Set([...selectedIds, ...allFilteredIds]));
      selectAll(newSelected);
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName("");
      setIsFolderModalOpen(false);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFileName.trim()) {
      const sizeStr = uploadFileSize.trim() ? uploadFileSize.trim() : "2.4 MB";
      uploadFile(uploadFileName.trim(), sizeStr, uploadClassification);
      setUploadFileName("");
      setUploadFileSize("");
      setIsUploadModalOpen(false);
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renameValue.trim() && renameTargetId) {
      renameFile(renameTargetId, renameValue.trim());
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
    setActiveMenuId(null);
  };

  const initiateRename = (file: FileNode) => {
    setRenameTargetId(file.id);
    setRenameValue(file.name);
    setIsRenameModalOpen(true);
    setActiveMenuId(null);
  };

  const currentFolder = files.find((f) => f.id === currentFolderId && f.type === "folder");
  const currentTitle = currentFolder ? currentFolder.name : "My Files";

  if (activeView === "overview") {
    return <ExecutiveOverview />;
  }

  if (activeView === "governance") {
    const pendingTasks = tasks.filter((t) => t.status === "PENDING");
    const historyTasks = tasks.filter((t) => t.status !== "PENDING");
    const lockedFiles = files.filter((f) => f.lockedBy);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header Title */}
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
              High-security C-Suite authorization workflows, lock parameters, and asset override registries.
            </p>
          </div>
        </div>

        {/* Ticker status */}
        <div className="w-full bg-background-panel/40 border border-border/30 px-4 py-1.5 rounded-sm flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-foreground-subtle select-none">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>SECURITY LEVEL: EX-SECURE PROTOCOL</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span>TOTAL LOCKED ASSETS: {lockedFiles.length}</span>
            <span className="text-foreground-subtle/30">|</span>
            <span>PENDING SIGNATURES: {pendingTasks.length}</span>
          </div>
          <span>AXIOM SIGN-OFF: ACTIVE</span>
        </div>

        {/* Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: C-Suite Approvals Queue */}
          <div className="lg:col-span-6 border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">
                Authorization Sign-Off Register
              </h2>
              <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
                Pending and completed corporate actions requiring strategic signature confirmation.
              </p>
            </div>

            {/* Pending Approvals */}
            <div className="space-y-3">
              <span className="block font-mono text-[9px] font-bold text-foreground-subtle uppercase tracking-wider">
                Pending Actions ({pendingTasks.length})
              </span>
              {pendingTasks.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border/20 rounded-sm bg-background/10 text-foreground-subtle">
                  <CheckCircle className="mx-auto text-success/60 mb-2" size={18} />
                  <p className="text-[10px] font-mono">ALL PROTOCOLS SATISFIED</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 border border-border/30 rounded-sm bg-background-panel/40 flex items-center justify-between gap-3 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider font-mono uppercase border",
                            task.type === "FINANCE" && "bg-warning/15 text-warning border-warning/25",
                            task.type === "BLUEPRINT" && "bg-info/15 text-info border-info/25",
                            task.type === "HR_OPS" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                          )}>
                            {task.type}
                          </span>
                          <span className="font-mono text-[9px] text-foreground-subtle">
                            {task.timestamp}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">{task.title}</h4>
                        <p className="text-[9px] font-mono text-foreground-muted">REQ: {task.requestedBy} • {task.amountValue}</p>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <button
                          onClick={() => rejectTask(task.id)}
                          className="h-6 px-2.5 rounded-sm border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/15 text-[9px] font-bold uppercase transition-all cursor-pointer"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => approveTask(task.id)}
                          className="h-6 px-2.5 rounded-sm border border-success/20 text-success bg-success/5 hover:bg-success/15 text-[9px] font-bold uppercase transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Governance Sign-Off History */}
            <div className="space-y-3 pt-3 border-t border-border/10">
              <span className="block font-mono text-[9px] font-bold text-foreground-subtle/70 uppercase tracking-wider">
                Authorized Sign-Off History ({historyTasks.length})
              </span>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {historyTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 border border-border/10 rounded-sm bg-background/10 flex items-center justify-between text-[10px] select-all font-mono"
                  >
                    <div className="truncate max-w-[240px]">
                      <span className="font-bold text-foreground truncate block">{task.title}</span>
                      <span className="text-[8px] text-foreground-subtle uppercase">Authorized by C-Suite</span>
                    </div>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                      task.status === "APPROVED" ? "bg-success/10 text-success border border-success/15" : "bg-destructive/10 text-destructive border border-destructive/15"
                    )}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Active Governance Locks & Override Terminal */}
          <div className="lg:col-span-6 border border-border/30 rounded-sm bg-background-panel/20 backdrop-blur-sm p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground font-serif">
                  Axiom Lock Registry & Override
                </h2>
                <p className="text-[10px] text-foreground-subtle font-mono mt-0.5">
                  View and manage directory objects and telemetry files currently restricted by corporate blocks.
                </p>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {lockedFiles.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-border/20 rounded bg-background/5 text-foreground-subtle">
                    <Lock className="mx-auto text-success/50 mb-2" size={20} />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Zero Restrictive Locks</h4>
                    <p className="text-[10px] text-foreground-subtle mt-1 max-w-xs mx-auto leading-relaxed">
                      All corporate repository assets are currently unrestricted with normal operational read/write availability.
                    </p>
                  </div>
                ) : (
                  lockedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 border border-border/25 rounded-sm bg-background-panel/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-1 py-0.5 rounded-sm text-[8px] font-bold tracking-wider font-mono uppercase border",
                            file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                            file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                            file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                          )}>
                            {file.classification}
                          </span>
                          <span className="font-mono text-[9px] text-foreground-subtle truncate max-w-[100px]">ID: {file.id}</span>
                        </div>
                        <h4 
                          onClick={() => setPreviewFileId(file.id)}
                          className="font-bold text-foreground truncate hover:text-accent cursor-pointer max-w-[200px]"
                          title="Preview secure file"
                        >
                          {file.name}
                        </h4>
                        <p className="text-[10px] text-foreground-subtle leading-tight font-mono">
                          LOCKED BY: {file.lockedBy}<br />
                          REASON: {file.lockReason || 'Pending Corporate Approval'}
                        </p>
                      </div>

                      <button
                        onClick={() => unlockFile(file.id)}
                        className="h-7 px-3 rounded-sm border border-accent/30 text-accent bg-accent/5 hover:bg-accent/15 transition-all text-[9px] font-bold tracking-wider uppercase font-mono shrink-0 self-end sm:self-center cursor-pointer"
                      >
                        Override Unlock
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-border/10 pt-3 flex justify-between items-center text-[9px] font-mono text-foreground-subtle select-none mt-4">
              <span>EX-OVERRIDE COMPLIANCE ACTIVE</span>
              <span className="text-warning flex items-center gap-0.5">
                <Shield size={10} /> C-SUITE ONLY
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Action Controls */}
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

      {/* ── Search Bar Input for Small Screens ── */}
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

      {/* ── The File Explorer Data Table (Cloudflare Parity) ── */}
      <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
        
        {filteredFiles.length === 0 ? (
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
                  
                  {/* Select All Checkbox */}
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

                  <th className="px-4 py-2.5 font-semibold">Name</th>
                  <th className="px-4 py-2.5 font-semibold w-24">Size</th>
                  <th className="px-4 py-2.5 font-semibold w-28 text-center">Classification</th>
                  <th className="px-4 py-2.5 font-semibold w-40">Modified</th>
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
                      {/* Row Checkbox */}
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

                      {/* File Name */}
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
                              <Lock
                                className="text-accent shrink-0 fill-accent/15 cursor-help"
                                size={10}
                              />
                            </span>
                          )}
                          {file.isFavorite && (
                            <Star className="text-accent fill-accent shrink-0" size={10} />
                          )}
                        </div>
                      </td>

                      {/* File Size */}
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted select-none">
                        {file.size}
                      </td>

                      {/* Security Classification Badge */}
                      <td className="px-4 py-2 text-center select-none">
                        <span
                          className={cn(
                            "inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-wider font-mono uppercase border",
                            file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                            file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                            file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                          )}
                        >
                          {file.classification}
                        </span>
                      </td>

                      {/* Modified At */}
                      <td className="px-4 py-2 font-mono text-[11px] text-foreground-muted select-none">
                        {file.modifiedAt}
                      </td>

                      {/* Access Role */}
                      <td className="px-4 py-2 text-center select-none">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-background/50 border border-border/20 text-[9px] font-mono capitalize text-foreground-subtle">
                          {file.accessRole}
                        </span>
                      </td>

                      {/* Row Context Menu */}
                      <td className="px-4 py-2 text-right relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                          className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal size={14} />
                        </button>

                        {/* Dropdown Options Popup (Phase 3 Google Drive / Shadcn Parity) */}
                        {activeMenuId === file.id && (
                          <>
                            <div
                              className="fixed inset-0 z-20 cursor-default"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-4 mt-1 z-30 w-44 rounded border border-border/80 bg-background-panel shadow-md p-1 space-y-0.5 text-left font-mono">
                              
                              <button
                                onClick={() => {
                                  if (file.type !== "folder") {
                                    setPreviewFileId(file.id);
                                  } else {
                                    openAccessControl(file);
                                  }
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors"
                              >
                                <Eye size={11} className="text-foreground-subtle shrink-0" />
                                View Details
                              </button>

                              <button
                                onClick={() => openAccessControl(file)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors"
                              >
                                <Share2 size={11} className="text-foreground-subtle shrink-0" />
                                Manage Access
                              </button>

                              {file.lockedBy ? (
                                <button
                                  disabled
                                  title={`LOCKED: ${file.lockReason || 'Pending Corporate Approval'} (Locked by ${file.lockedBy})`}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-subtle/40 bg-background/5 cursor-not-allowed text-left rounded"
                                >
                                  <Edit2 size={11} className="text-foreground-subtle/30 shrink-0" />
                                  <span>Rename</span>
                                  <span className="ml-auto text-[8px] font-bold text-accent uppercase font-mono tracking-tighter">LOCKED</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => initiateRename(file)}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors"
                                >
                                  <Edit2 size={11} className="text-foreground-subtle shrink-0" />
                                  Rename
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  toggleFavorite(file.id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors"
                              >
                                <Star size={11} className={cn("shrink-0", file.isFavorite ? "text-accent fill-accent" : "text-foreground-subtle")} />
                                {file.isFavorite ? "Remove Favorite" : "Add Favorite"}
                              </button>

                              <button
                                onClick={() => {
                                  alert(`Securely downloading: ${file.name}`);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded transition-colors"
                              >
                                <Download size={11} className="text-foreground-subtle shrink-0" />
                                Download
                              </button>

                              {/* 1px divider separation for destructive actions */}
                              <hr className="border-t border-border/10 my-1" />

                              {file.lockedBy ? (
                                <button
                                  disabled
                                  title={`LOCKED: ${file.lockReason || 'Pending Corporate Approval'} (Locked by ${file.lockedBy})`}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-destructive/40 bg-background/5 cursor-not-allowed text-left rounded"
                                >
                                  <Trash2 size={11} className="text-destructive/30 shrink-0" />
                                  <span>Delete</span>
                                  <span className="ml-auto text-[8px] font-bold text-accent uppercase font-mono tracking-tighter">LOCKED</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    deleteFile(file.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-destructive hover:bg-destructive/15 rounded transition-colors"
                                >
                                  <Trash2 size={11} className="text-destructive shrink-0" />
                                  Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-over Panel Integration ── */}
      <FileAccessSheet />

      {/* ── Floating Action Bar Integration ── */}
      <FloatingActionBar />

      {/* ── MODALS FOR OPERATIONS ── */}

      {/* ── MODALS FOR OPERATIONS ── */}

      {/* Folder Creation Modal */}
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
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Simulated File Upload</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">Inject a simulated binary object into storage.</p>
            </div>
            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div className="space-y-2.5">
                <div>
                  <label htmlFor={uploadNameInputId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Object Name</label>
                  <input
                    id={uploadNameInputId}
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Q4_Strategy_Draft.docx"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground placeholder-foreground-subtle/50 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                </div>
                <div>
                  <label htmlFor={uploadSizeInputId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Object Size</label>
                  <input
                    id={uploadSizeInputId}
                    type="text"
                    placeholder="e.g. 1.2 MB or 450 KB"
                    value={uploadFileSize}
                    onChange={(e) => setUploadFileSize(e.target.value)}
                    className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground placeholder-foreground-subtle/50 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
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

              <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground"
                >
                  Commit Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Rename Modal */}
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
                <button
                  type="button"
                  onClick={() => {
                    setIsRenameModalOpen(false);
                    setRenameTargetId(null);
                  }}
                  className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground"
                >
                  Apply Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Phase 4 Drag & Drop Secure Upload Overlay */}
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
