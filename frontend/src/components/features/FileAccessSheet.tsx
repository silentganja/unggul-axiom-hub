"use client";

import { useState, useId, useEffect } from "react";
import {
  X,
  Shield,
  Folder,
  File,
  FileText,
  UserPlus,
  Trash2,
  Lock,
  Users,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { useFileStore, FileNode, Collaborator } from "@/store/useFileStore";
import { filesApi, formatTimestamp } from "@/lib/api";

export default function FileAccessSheet() {
  const addPersonEmailId = useId();
  const addPersonRoleId = useId();
  const fileClassificationSelectId = useId();

  const activeFile = useFileStore((state) => state.activeFile);
  const isOpen = useFileStore((state) => state.isAccessSheetOpen);
  const setOpen = useFileStore((state) => state.setAccessSheetOpen);
  const setActiveFile = useFileStore((state) => state.setActiveFile);
  const fileShares = useFileStore((state) => state.fileShares);
  const updateFileInStore = useFileStore((state) => state.updateFileClassification);

  const shareFile = useFileStore((state) => state.shareFile);
  const removeShare = useFileStore((state) => state.removeShare);
  const fetchFileShares = useFileStore((state) => state.fetchFileShares);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"editor" | "viewer">("viewer");
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Classification editing — track pending change
  const [classSaving, setClassSaving] = useState(false);
  const [classSaved, setClassSaved] = useState(false);
  const [pendingClass, setPendingClass] = useState<string | null>(null);

  // Editor value: pending edit or actual file classification
  const editClass = pendingClass ?? activeFile?.classification ?? "TERBUKA";

  useEffect(() => {
    if (isOpen && activeFile) {
      fetchFileShares(activeFile.id);
    }
  }, [isOpen, activeFile, fetchFileShares]);

  if (!isOpen || !activeFile) return null;

  const handleClose = () => {
    setOpen(false);
    setActiveFile(null);
    setShareError(null);
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setShareError(null);
    setIsSharing(true);
    try {
      await shareFile(activeFile.id, newEmail.trim(), newRole);
      setNewEmail("");
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to share");
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      await removeShare(activeFile.id, userId);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to remove share");
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const userEntry = fileShares.find((s) => s.id === userId);
      if (userEntry) {
        await shareFile(activeFile.id, userEntry.email, role);
      }
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleSaveClassification = async () => {
    setClassSaving(true);
    setClassSaved(false);
    try {
      const updated = await filesApi.updateClassification(activeFile.id, editClass);
      updateFileInStore(activeFile.id, updated.classification as "RAHSIA" | "SULIT" | "TERHAD" | "TERBUKA");
      setPendingClass(null);
      setClassSaved(true);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Failed to update classification");
    } finally {
      setClassSaving(false);
    }
  };

  // Helper to extract initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Helper to render type icons
  const getFileIcon = (file: FileNode) => {
    if (file.type === "folder") {
      return <Folder className="text-accent shrink-0 fill-accent/5" size={18} />;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || ext === "docx" || ext === "txt") {
      return <FileText className="text-info shrink-0" size={18} />;
    }
    return <File className="text-foreground-subtle shrink-0" size={18} />;
  };

  // Build the full collaborators list: activeFile.collaborators (owner) + fileShares
  const ownerEntry: Collaborator | undefined = activeFile.collaborators.find(
    (c) => c.role === "owner"
  );
  const allCollaborators: Collaborator[] = [
    ...(ownerEntry ? [ownerEntry] : []),
    ...fileShares,
  ];

  return (
    <div key={activeFile.id} className="fixed inset-0 z-50 flex justify-end">
      {/* ── Backdrop Blur Overlay ── */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={handleClose}
      />

      {/* ── Opaque Slide-over Container ── */}
      <div className="relative w-full max-w-md h-full bg-background-panel border-l border-border/40 shadow-md flex flex-col justify-between animate-in slide-in-from-right duration-250 z-10">
        {/* Scrollable Container */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {/* Header section */}
          <div className="flex items-start justify-between border-b border-border/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded border border-border bg-background/50 flex items-center justify-center">
                {getFileIcon(activeFile)}
              </div>
              <div className="max-w-[240px] truncate">
                <h3
                  className="text-sm font-semibold text-foreground truncate font-sans select-all"
                  title={activeFile.name}
                >
                  {activeFile.name}
                </h3>
                <span className="font-mono text-[10px] text-foreground-subtle block mt-0.5 select-none">
                  {activeFile.size} &bull;{" "}
                  {activeFile.type === "folder" ? "Directory" : "File Object"}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-foreground transition-all"
            >
              <X size={14} />
            </button>
          </div>

          {/* Security Classification Section */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-bold tracking-wider font-mono text-foreground-subtle uppercase flex items-center gap-1.5">
              <Shield size={12} className="text-accent" />
              Security Classification Level
            </h4>
            <div className="flex items-center gap-2">
              <select
                id={fileClassificationSelectId}
                value={editClass}
                onChange={(e) => { setPendingClass(e.target.value); setClassSaved(false); }}
                className="h-8 flex-grow max-w-[140px] px-2 rounded border border-input-border bg-input-bg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="TERBUKA">TERBUKA</option>
                <option value="TERHAD">TERHAD</option>
                <option value="SULIT">SULIT</option>
                <option value="RAHSIA">RAHSIA</option>
              </select>
              <button
                onClick={handleSaveClassification}
                disabled={classSaving || editClass === activeFile.classification}
                className="h-8 px-3 rounded-sm border border-accent/30 bg-accent/10 hover:bg-accent/20 text-[10px] font-bold font-mono uppercase tracking-wider text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {classSaving ? <Loader2 size={11} className="animate-spin" /> : classSaved ? <CheckCircle size={11} /> : null}
                {classSaved ? "Saved" : "Save"}
              </button>
            </div>
            <p className="text-[10px] text-foreground-subtle leading-relaxed">
              * Classification changes are audited. For restricted files, use the Governance Board.
            </p>
          </div>

          {/* Lock Status Section */}
          <div className="space-y-2.5 border-t border-border/20 pt-5">
            <h4 className="text-[10px] font-bold tracking-wider font-mono text-foreground-subtle uppercase flex items-center gap-1.5">
              <Lock size={12} className={activeFile.lockedBy ? "text-warning" : "text-success"} />
              Lock Status
            </h4>
            {activeFile.lockedBy ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-warning" />
                  <span className="text-xs font-semibold text-foreground">Locked by {activeFile.lockedBy}</span>
                </div>
                {activeFile.lockReason && (
                  <p className="text-[10px] font-mono text-foreground-subtle ml-6">Reason: {activeFile.lockReason}</p>
                )}
                {activeFile.lockedAt && (
                  <p className="text-[10px] font-mono text-foreground-subtle ml-6">Locked at: {formatTimestamp(activeFile.lockedAt)}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-success" />
                <span className="text-xs font-mono text-success font-bold">Unrestricted</span>
              </div>
            )}
          </div>

          {/* Add People Section */}
          <div className="space-y-2.5 border-t border-border/20 pt-5">
            <h4 className="text-[10px] font-bold tracking-wider font-mono text-foreground-subtle uppercase flex items-center gap-1.5">
              <UserPlus size={12} className="text-accent" />
              Add Corporate People & Roles
            </h4>

            {shareError && (
              <div className="flex items-start gap-1.5 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-[10px] text-destructive font-mono">
                {shareError}
              </div>
            )}

            <form onSubmit={handleAddPerson} className="flex gap-2">
              <div className="flex-grow flex gap-1.5">
                <label htmlFor={addPersonEmailId} className="sr-only">
                  Corporate email address
                </label>
                <input
                  id={addPersonEmailId}
                  type="email"
                  required
                  placeholder="name@unggulaxiom.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={isSharing}
                  className="h-8 flex-grow px-2.5 rounded border border-input-border bg-input-bg text-xs text-foreground placeholder-foreground-subtle/55 focus:outline-none focus:border-accent disabled:opacity-50"
                />
                <label htmlFor={addPersonRoleId} className="sr-only">
                  Collaborator role
                </label>
                <select
                  id={addPersonRoleId}
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as "editor" | "viewer")
                  }
                  disabled={isSharing}
                  className="h-8 w-20 px-1.5 rounded border border-input-border bg-input-bg text-[10px] font-mono text-foreground focus:outline-none focus:border-accent disabled:opacity-50"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isSharing}
                className="btn-shimmer h-8 px-3 rounded text-[10px] font-bold font-mono uppercase tracking-wider shrink-0 disabled:opacity-50"
              >
                {isSharing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Add"
                )}
              </button>
            </form>
          </div>

          {/* Collaborator Sharing List */}
          <div className="space-y-3 border-t border-border/20 pt-5">
            <h4 className="text-[10px] font-bold tracking-wider font-mono text-foreground-subtle uppercase flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-accent" />
              Currently Shared Collaborators
            </h4>

            <div className="divide-y divide-border/10">
              {allCollaborators.length === 0 && (
                <p className="py-4 text-center text-[10px] text-foreground-subtle font-mono">
                  No collaborators yet
                </p>
              )}
              {allCollaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between gap-4 py-2.5 first:pt-0"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="h-7 w-7 rounded bg-accent/15 border border-accent/25 text-accent text-[9px] font-bold font-mono flex items-center justify-center shrink-0">
                      {getInitials(collaborator.name)}
                    </div>
                    <div className="truncate max-w-[180px]">
                      <span className="block text-xs font-semibold text-foreground truncate">
                        {collaborator.name}
                      </span>
                      <span className="block text-[10px] text-foreground-subtle truncate select-all">
                        {collaborator.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {collaborator.role === "owner" ? (
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-accent border border-accent/20 bg-accent/5 px-2 py-0.5 rounded select-none">
                        Owner
                      </span>
                    ) : (
                      <>
                        <label
                          htmlFor={`role-select-${collaborator.id}`}
                          className="sr-only"
                        >
                          Role for {collaborator.name}
                        </label>
                        <select
                          id={`role-select-${collaborator.id}`}
                          value={collaborator.role}
                          onChange={(e) =>
                            handleRoleChange(collaborator.id, e.target.value)
                          }
                          className="h-6 w-20 px-1 rounded border border-input-border bg-input-bg text-[10px] font-mono text-foreground focus:outline-none focus:border-accent"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>

                        <button
                          onClick={() => handleRemoveShare(collaborator.id)}
                          className="h-6 w-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-colors shrink-0"
                          title="Remove access"
                        >
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Audit Statement */}
        <div className="p-4 bg-background-panel border-t border-border/20 text-center flex items-center justify-center gap-2 text-[10px] font-mono text-foreground-subtle">
          <Lock size={12} className="text-accent" />
          Restricted secure credential verification
        </div>
      </div>
    </div>
  );
}
