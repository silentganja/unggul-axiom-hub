"use client";

import { useState, useId } from "react";
import {
  X,
  Shield,
  Folder,
  File,
  FileText,
  UserPlus,
  Trash2,
  Lock,
  Globe,
  Settings,
  Users
} from "lucide-react";
import { useFileStore, FileNode, Collaborator } from "@/store/useFileStore";
import { cn } from "@/lib/utils";

export default function FileAccessSheet() {
  const addPersonEmailId = useId();
  const addPersonRoleId = useId();
  const fileClassificationSelectId = useId();

  // Zustand Store Hooks
  const activeFile = useFileStore((state) => state.activeFile);
  const isOpen = useFileStore((state) => state.isAccessSheetOpen);
  const setOpen = useFileStore((state) => state.setAccessSheetOpen);
  const setActiveFile = useFileStore((state) => state.setActiveFile);
  
  const updateClassification = useFileStore((state) => state.updateFileClassification);
  const addCollaborator = useFileStore((state) => state.addCollaborator);
  const updateCollaboratorRole = useFileStore((state) => state.updateCollaboratorRole);
  const removeCollaborator = useFileStore((state) => state.removeCollaborator);

  // Local state for add collaborator inputs
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"owner" | "editor" | "viewer">("viewer");

  if (!isOpen || !activeFile) return null;

  const handleClose = () => {
    setOpen(false);
    setActiveFile(null);
  };

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEmail.trim()) {
      // Mock name from email prefix
      const emailPrefix = newEmail.split("@")[0];
      const mockName = emailPrefix
        .split(".")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

      addCollaborator(activeFile.id, mockName, newEmail.trim(), newRole);
      setNewEmail("");
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      
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
                <h3 className="text-sm font-semibold text-foreground truncate font-sans select-all" title={activeFile.name}>
                  {activeFile.name}
                </h3>
                <span className="font-mono text-[10px] text-foreground-subtle block mt-0.5 select-none">
                  {activeFile.size} &bull; {activeFile.type === "folder" ? "Directory" : "File Object"}
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
            <div className="flex items-center gap-3">
              <label htmlFor={fileClassificationSelectId} className="sr-only">Classification Level</label>
              <select
                id={fileClassificationSelectId}
                value={activeFile.classification}
                onChange={(e) => updateClassification(activeFile.id, e.target.value as "RAHSIA" | "SULIT" | "TERBUKA")}
                className="h-8 flex-grow max-w-[160px] px-2 rounded border border-input-border bg-input-bg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="TERBUKA">TERBUKA</option>
                <option value="SULIT">SULIT</option>
                <option value="RAHSIA">RAHSIA</option>
              </select>

              <span
                className={cn(
                  "px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-widest font-mono uppercase border",
                  activeFile.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                  activeFile.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                  activeFile.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                )}
              >
                {activeFile.classification}
              </span>
            </div>
            <p className="text-[10px] text-foreground-subtle leading-relaxed">
              * Classified objects are subject to audit logging and strict distribution limits.
            </p>
          </div>

          {/* Add People Section (Google Drive parity) */}
          <div className="space-y-2.5 border-t border-border/20 pt-5">
            <h4 className="text-[10px] font-bold tracking-wider font-mono text-foreground-subtle uppercase flex items-center gap-1.5">
              <UserPlus size={12} className="text-accent" />
              Add Corporate People & Roles
            </h4>
            
            <form onSubmit={handleAddPerson} className="flex gap-2">
              <div className="flex-grow flex gap-1.5">
                <label htmlFor={addPersonEmailId} className="sr-only">Corporate email address</label>
                <input
                  id={addPersonEmailId}
                  type="email"
                  required
                  placeholder="name@unggulaxiom.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-8 flex-grow px-2.5 rounded border border-input-border bg-input-bg text-xs text-foreground placeholder-foreground-subtle/55 focus:outline-none focus:border-accent"
                />
                
                <label htmlFor={addPersonRoleId} className="sr-only">Collaborator role</label>
                <select
                  id={addPersonRoleId}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "owner" | "editor" | "viewer")}
                  className="h-8 w-20 px-1.5 rounded border border-input-border bg-input-bg text-[10px] font-mono text-foreground focus:outline-none focus:border-accent"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-shimmer h-8 px-3 rounded text-[10px] font-bold font-mono uppercase tracking-wider shrink-0"
              >
                Add
              </button>
            </form>
          </div>

          {/* Collaborator Sharing Parity List */}
          <div className="space-y-3 border-t border-border/20 pt-5">
            <h4 className="text-[10px] font-bold tracking-wider font-mono text-foreground-subtle uppercase flex items-center gap-1.5 mb-1">
              <Users size={12} className="text-accent" />
              Currently Shared Collaborators
            </h4>

            <div className="divide-y divide-border/10">
              {activeFile.collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between gap-4 py-2.5 first:pt-0"
                >
                  <div className="flex items-center gap-3 truncate">
                    {/* Compact Avatar initials */}
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

                  {/* Compact role dropdown controls */}
                  <div className="flex items-center gap-1.5">
                    {collaborator.role === "owner" ? (
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-accent border border-accent/20 bg-accent/5 px-2 py-0.5 rounded select-none">
                        Owner
                      </span>
                    ) : (
                      <>
                        <label htmlFor={`role-select-${collaborator.id}`} className="sr-only">Role for {collaborator.name}</label>
                        <select
                          id={`role-select-${collaborator.id}`}
                          value={collaborator.role}
                          onChange={(e) => updateCollaboratorRole(activeFile.id, collaborator.id, e.target.value as "owner" | "editor" | "viewer")}
                          className="h-6 w-20 px-1 rounded border border-input-border bg-input-bg text-[10px] font-mono text-foreground focus:outline-none focus:border-accent"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                        </select>

                        <button
                          onClick={() => removeCollaborator(activeFile.id, collaborator.id)}
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
