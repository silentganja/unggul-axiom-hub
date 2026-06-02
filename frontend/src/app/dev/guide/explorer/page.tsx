"use client";

import {
  Folder,
  Trash2,
  Users,
  HardDrive,
  Clock,
  Sparkles,
} from "lucide-react";

export default function FileExplorerGuidePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Folder size={10} /> SECTION 2.0
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          File Explorer &amp; Security Labels
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The File Explorer is your workspace for managing company documents. This section explains how files are organized, what the security labels mean, and how sharing works.
        </p>
      </div>

      {/* Explorer Anatomy Card */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Getting Around the File Explorer
        </h3>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          The explorer screen has three main sections to help you work:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] font-sans">
          <div className="p-3 border border-border/20 rounded bg-background/25">
            <span className="font-mono text-[9px] font-bold text-foreground uppercase block mb-1">1. Navigation Sidebar</span>
            <p className="text-foreground-muted leading-relaxed">
              Use the sidebar to jump between your main files, folders shared with you, recently opened files, starred favorites, and the trash bin. It also shows your current storage space.
            </p>
          </div>
          <div className="p-3 border border-border/20 rounded bg-background/25">
            <span className="font-mono text-[9px] font-bold text-foreground uppercase block mb-1">2. File Table</span>
            <p className="text-foreground-muted leading-relaxed">
              Lists your folders and files. You can click column headers to sort by name, size, or date, use the search bar, or select multiple files at once.
            </p>
          </div>
          <div className="p-3 border border-border/20 rounded bg-background/25">
            <span className="font-mono text-[9px] font-bold text-foreground uppercase block mb-1">3. Details Drawer</span>
            <p className="text-foreground-muted leading-relaxed">
              When you select a file, a details panel opens on the side. It shows who owns the file, who it is shared with, its security level, and if it is locked for editing.
            </p>
          </div>
        </div>
      </div>

      {/* Classifications Grid */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Understanding Security Labels
        </h3>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          To protect company data, folders and files are marked with one of four security labels:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Terbuka */}
          <div className="border border-success/20 bg-success/2 rounded p-4 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-mono text-[9px] font-bold text-success border border-success/35 px-2 py-0.5 rounded uppercase inline-block">
                TERBUKA
              </span>
              <h4 className="text-xs font-bold text-foreground font-serif">Open / General</h4>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                General company templates, user manuals, and guides. Accessible to all staff members. You can upload, download, and share these files freely.
              </p>
            </div>
            <span className="text-[9px] font-mono text-foreground-subtle/50 mt-2 block">Standard Security</span>
          </div>

          {/* Terhad */}
          <div className="border border-info/20 bg-info/2 rounded p-4 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-mono text-[9px] font-bold text-info border border-info/35 px-2 py-0.5 rounded uppercase inline-block font-sans">
                TERHAD
              </span>
              <h4 className="text-xs font-bold text-foreground font-serif">Restricted</h4>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Internal project files, guidelines, and departmental announcements. Restricted to internal company staff; cannot be shared externally.
              </p>
            </div>
            <span className="text-[9px] font-mono text-foreground-subtle/50 mt-2 block">Internal Use Only</span>
          </div>

          {/* Sulit */}
          <div className="border border-warning/20 bg-warning/2 rounded p-4 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-mono text-[9px] font-bold text-warning border border-warning/35 px-2 py-0.5 rounded uppercase inline-block">
                SULIT
              </span>
              <h4 className="text-xs font-bold text-foreground font-serif">Confidential</h4>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Sensitive budgets, strategy drafts, and planning documents. Visible only to the owner and team members specifically invited to collaborate.
              </p>
            </div>
            <span className="text-[9px] font-mono text-foreground-subtle/50 mt-2 block">Confidential Clearance</span>
          </div>

          {/* Rahsia */}
          <div className="border border-destructive/20 bg-destructive/2 rounded p-4 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-mono text-[9px] font-bold text-destructive border border-destructive/35 px-2 py-0.5 rounded uppercase inline-block">
                RAHSIA
              </span>
              <h4 className="text-xs font-bold text-foreground font-serif">Secret</h4>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Executive minutes, strategic merger plans, and board-level documents. Restricted to department heads, directors, and executives.
              </p>
            </div>
            <span className="text-[9px] font-mono text-foreground-subtle/50 mt-2 block">Executive Board Only</span>
          </div>
        </div>
      </div>

      {/* Collaborator Sharing Models */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            Sharing Files &amp; Access Roles
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          You can share folders and files with colleagues by typing their email addresses. When sharing, you must choose one of three access roles:
        </p>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 border border-border/10 rounded bg-background/20 flex flex-col sm:flex-row justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Viewer (View &amp; Read Only)</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans font-sans">
                Can preview and download files. Cannot upload new versions, delete files, rename items, or invite others.
              </p>
            </div>
            <span className="text-[9px] font-semibold text-foreground-subtle border border-border px-2 py-0.5 rounded uppercase h-fit w-fit select-none">
              Viewer
            </span>
          </div>

          <div className="p-3 border border-border/10 rounded bg-background/20 flex flex-col sm:flex-row justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Editor (Write &amp; Edit Permissions)</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans font-sans">
                Can upload files, edit documents, add new versions, and rename files or folders. Cannot lower a file&apos;s security level or remove the owner.
              </p>
            </div>
            <span className="text-[9px] font-semibold text-info border border-info/30 bg-info/5 px-2 py-0.5 rounded uppercase h-fit w-fit select-none">
              Editor
            </span>
          </div>

          <div className="p-3 border border-border/10 rounded bg-background/20 flex flex-col sm:flex-row justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Owner (Full Control)</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans font-sans">
                Complete control over the file or folder. Can delete files, permanently erase them, change security labels, and add or remove other collaborators.
              </p>
            </div>
            <span className="text-[9px] font-semibold text-accent border border-accent/30 bg-accent-subtle/30 px-2 py-0.5 rounded uppercase h-fit w-fit select-none">
              Owner
            </span>
          </div>
        </div>
      </div>

      {/* Quota & Lifecycle details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage Quotas */}
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive size={15} className="text-accent" />
            <h3 className="font-mono text-[9px] font-bold text-foreground uppercase tracking-wider font-sans">
              Personal Storage Space
            </h3>
          </div>
          <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
            By default, all staff receive **100 GB** of file storage space. If you are close to running out of space, a warning message will appear on your screen. You can ask management to increase your quota if needed.
          </p>
          <div className="flex items-center gap-1.5 text-accent font-mono text-[9px]">
            <Sparkles size={11} /> Clear your Trash regularly to save storage space.
          </div>
        </div>

        {/* Trash lifecycle */}
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-accent" />
            <h3 className="font-mono text-[9px] font-bold text-foreground uppercase tracking-wider font-sans">
              Deletions &amp; Restoring Files
            </h3>
          </div>
          <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
            Deleted files are moved to the Trash bin. They are kept safe there and can be restored back to their original folders at any time. Files in the Trash still count toward your storage quota until permanently deleted by an administrator.
          </p>
          <div className="flex items-center gap-1.5 text-accent font-mono text-[9px]">
            <Clock size={11} /> Restoring a file preserves all previous sharing permissions.
          </div>
        </div>
      </div>
    </div>
  );
}
