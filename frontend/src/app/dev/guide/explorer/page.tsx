"use client";

import {
  Folder,
  FileText,
  Star,
  Trash2,
  Users,
  HardDrive,
  CheckCircle,
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
          File Explorer &amp; Classifications
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The File Explorer represents the interface for handling our organization&apos;s records. Below are deep-dive operation guidelines, security definitions, and lifecycle procedures.
        </p>
      </div>

      {/* Explorer Anatomy Card */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Explorer Workspace Layout
        </h3>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          The explorer screen is split into three main modules:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] font-sans">
          <div className="p-3 border border-border/20 rounded bg-background/25">
            <span className="font-mono text-[9px] font-bold text-foreground uppercase block mb-1">1. Navigation Sidebar</span>
            <p className="text-foreground-muted leading-relaxed">
              Provides navigation anchors: Overview, Files (Personal/Shared Folders), Recent, Favorites, and Trash. Handles personal storage quota indicators.
            </p>
          </div>
          <div className="p-3 border border-border/20 rounded bg-background/25">
            <span className="font-mono text-[9px] font-bold text-foreground uppercase block mb-1">2. Core Document Table</span>
            <p className="text-foreground-muted leading-relaxed">
              Lists folders and files with names, sizes, modified dates, and classification indicators. Supports column sorting, search filters, and bulk multi-item selections.
            </p>
          </div>
          <div className="p-3 border border-border/20 rounded bg-background/25">
            <span className="font-mono text-[9px] font-bold text-foreground uppercase block mb-1">3. File Access Sheet</span>
            <p className="text-foreground-muted leading-relaxed">
              Toggles details drawer for selected files. Displays owner IDs, sharing access lists, file classification levels, and active locking properties.
            </p>
          </div>
        </div>
      </div>

      {/* Classifications Grid */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Classification Levels &amp; Safeguards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Terbuka */}
          <div className="border border-success/20 bg-success/2 rounded p-4 space-y-2">
            <span className="font-mono text-[9px] font-bold text-success border border-success/35 px-2 py-0.5 rounded uppercase inline-block">
              TERBUKA
            </span>
            <h4 className="text-xs font-bold text-foreground font-serif">Open/Unrestricted</h4>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              General administrative templates, SOPs, press materials, and documentation guides. Open to all authenticated staff members. Download and share requests are executed immediately.
            </p>
          </div>

          {/* Sulit */}
          <div className="border border-warning/20 bg-warning/2 rounded p-4 space-y-2">
            <span className="font-mono text-[9px] font-bold text-warning border border-warning/35 px-2 py-0.5 rounded uppercase inline-block">
              SULIT
            </span>
            <h4 className="text-xs font-bold text-foreground font-serif">Confidential / Sensitive</h4>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Department budgets, technical specification drafts, employee metrics, and internal audits. Visible only to folder owners and specifically shared collaborators.
            </p>
          </div>

          {/* Rahsia */}
          <div className="border border-destructive/20 bg-destructive/2 rounded p-4 space-y-2">
            <span className="font-mono text-[9px] font-bold text-destructive border border-destructive/35 px-2 py-0.5 rounded uppercase inline-block">
              RAHSIA
            </span>
            <h4 className="text-xs font-bold text-foreground font-serif">Secret / Board Level</h4>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Board of directors documents, strategic merger planning, regulatory litigation assets, and critical databases. Restricted globally to Directors and Chief roles.
            </p>
          </div>
        </div>
      </div>

      {/* Collaborator Sharing Models */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            Collaborator Sharing Roles
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          Files and folders can be shared with specific employees using their corporate emails. When sharing, you must assign one of the following roles:
        </p>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 border border-border/10 rounded bg-background/20 flex flex-col sm:flex-row justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Viewer Permissions</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Can preview and download documents. Cannot upload new items, rename files, or configure sharing properties.
              </p>
            </div>
            <span className="text-[9px] font-semibold text-foreground-subtle border border-border px-2 py-0.5 rounded uppercase h-fit w-fit select-none">
              Viewer
            </span>
          </div>

          <div className="p-3 border border-border/10 rounded bg-background/20 flex flex-col sm:flex-row justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Editor Permissions</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Full write permissions: can upload new assets, edit existing files, and rename folder paths. Cannot downgrade classification levels or remove the owner.
              </p>
            </div>
            <span className="text-[9px] font-semibold text-info border border-info/30 bg-info/5 px-2 py-0.5 rounded uppercase h-fit w-fit select-none">
              Editor
            </span>
          </div>

          <div className="p-3 border border-border/10 rounded bg-background/20 flex flex-col sm:flex-row justify-between gap-2">
            <div className="space-y-0.5">
              <span className="font-bold text-foreground font-sans block">Owner Permissions</span>
              <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                Complete control. Can delete files, execute permanent destruction, adjust classification structures, and revoke collaborator access.
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
            <h3 className="font-mono text-[9px] font-bold text-foreground uppercase tracking-wider">
              Storage Quota Enforcement
            </h3>
          </div>
          <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
            By default, all staff accounts receive **100 GB** of portal storage space. If your upload reaches 90% capacity, a alert banner will trigger. Quota limits can be adjusted by Chief administrators inside the Storage Console panel.
          </p>
          <div className="flex items-center gap-1.5 text-accent font-mono text-[9px]">
            <Sparkles size={11} /> Optimize space by clearing Trash regularly.
          </div>
        </div>

        {/* Trash lifecycle */}
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 size={15} className="text-accent" />
            <h3 className="font-mono text-[9px] font-bold text-foreground uppercase tracking-wider">
              Trash &amp; Information Retention
            </h3>
          </div>
          <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
            Deleted files are sent to the Trash. They do not expire automatically, but they still count towards your storage quota. You can restore items to their original folders or prompt an administrator to execute hard deletion to free up space.
          </p>
          <div className="flex items-center gap-1.5 text-accent font-mono text-[9px]">
            <Clock size={11} /> Restoration retains all previous sharing configurations.
          </div>
        </div>
      </div>
    </div>
  );
}
