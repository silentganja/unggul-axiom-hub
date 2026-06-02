"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Shield,
  Folder,
  Lock,
  Unlock,
  Users,
  Search,
  FileText,
  CheckCircle,
  HelpCircle,
  UploadCloud,
  Trash2,
  Play,
  ChevronRight,
  Sparkles,
  Clock,
  Settings,
  AlertCircle,
  Eye,
  Star,
  HardDrive,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  desc: string;
  role: string;
  badge?: string;
}

interface Scenario {
  id: string;
  title: string;
  icon: React.ReactNode;
  overview: string;
  steps: Step[];
  outcome: string;
}

export default function GuidePage() {
  const router = useRouter();
  const searchId = useId();

  // State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("overview");
  const [activeScenarioId, setActiveScenarioId] = useState("secure-doc");
  const [activeScenarioStep, setActiveScenarioStep] = useState(0);

  // Sections data
  const sections = [
    { id: "overview", label: "Overview", icon: <BookOpen size={14} /> },
    { id: "file-explorer", label: "File Explorer", icon: <Folder size={14} /> },
    { id: "governance", label: "Governance Flow", icon: <Shield size={14} /> },
    { id: "scenarios", label: "Example Scenarios", icon: <Play size={14} /> },
    { id: "roles", label: "Role Directory", icon: <Users size={14} /> },
  ];

  // Scenarios data
  const scenarios: Scenario[] = [
    {
      id: "secure-doc",
      title: "Securing Sensitive Files",
      icon: <Lock size={16} className="text-accent" />,
      overview: "How to upload a strategic document, lock it from edits, and restrict access through classification upgrades.",
      steps: [
        {
          title: "Upload & Classify",
          desc: "Upload the document (e.g. 'Q3 Budget.pdf') to your workspace. Select 'SULIT' (Confidential) in the upload panel classification selector.",
          role: "Staff / Officer",
          badge: "Upload File"
        },
        {
          title: "Submit Lock Request",
          desc: "Select the file, click 'Governance' in the Action Bar, and submit a 'FILE_LOCK' request stating: 'Prevent modifications during draft review'.",
          role: "Staff / Officer",
          badge: "Lock Request"
        },
        {
          title: "Request Classification Upgrade",
          desc: "Submit a second request for 'CLASSIFICATION_UPGRADE' targeting the same file to set its status to 'RAHSIA' (Secret) to restrict views to Board Members only.",
          role: "Staff / Officer",
          badge: "Upgrade Request"
        },
        {
          title: "Supervisor Approval",
          desc: "A Director or Chief accesses the Admin/Governance Console, reviews the audit log, and clicks 'Approve' on both pending items.",
          role: "Director / Chief",
          badge: "Approval Gate"
        }
      ],
      outcome: "The file is locked (cannot be renamed, moved, or deleted) and upgraded to RAHSIA classification, securing it against unauthorized internal leakage."
    },
    {
      id: "collaboration",
      title: "Team Folder & Collaboration",
      icon: <Users size={16} className="text-accent" />,
      overview: "Creating a shared workspace, delegating permissions to your team members, and editing safely without overlap.",
      steps: [
        {
          title: "Create & Share Folder",
          desc: "Create a folder named 'Marketing Campaigns 2026'. Right-click the folder, choose 'Share', enter team members' emails, and set roles to 'editor'.",
          role: "Folder Owner",
          badge: "Share Settings"
        },
        {
          title: "Conflict Prevention",
          desc: "When working on a shared file, click 'Lock File' (Governance Lock) to inform other team members you are editing. This prevents overwrite conflicts.",
          role: "Collaborator (Editor)",
          badge: "Temporary Lock"
        },
        {
          title: "Upload Revision",
          desc: "Once edits are finalized locally, upload the revised file. The explorer maintains classification settings automatically.",
          role: "Collaborator (Editor)",
          badge: "Upload Revision"
        },
        {
          title: "Release Lock",
          desc: "Unlock the file to allow other editors to work on it, keeping the collaboration stream active and transparent.",
          role: "Collaborator (Editor)",
          badge: "Unlock"
        }
      ],
      outcome: "Team members collaborate in real-time, completely protected from version conflicts, with all edits securely tracked in the activity feed."
    },
    {
      id: "deletion",
      title: "Audited Deletion & Recovery",
      icon: <Trash2 size={16} className="text-accent" />,
      overview: "Moving obsolete files to the Trash, restoring accidental deletions, and permanent disposal audits.",
      steps: [
        {
          title: "Soft Delete to Trash",
          desc: "Select obsolete files or drafts and click 'Delete' in the action bar. The files are marked as 'Trashed' and hidden from the standard file explorer.",
          role: "File Owner / Admin",
          badge: "Soft Delete"
        },
        {
          title: "Accidental Deletion Recovery",
          desc: "Navigate to the 'Trash' tab in the left sidebar. Locate the file, select it, and click 'Restore'. The file is returned to its original parent folder.",
          role: "File Owner",
          badge: "Restore"
        },
        {
          title: "Permanent Destruction",
          desc: "For permanent removal, go to the 'Trash' tab, select the file, and choose 'Permanently Delete'. This generates a permanent audit trail entry.",
          role: "Admin Only",
          badge: "Hard Delete"
        }
      ],
      outcome: "Information lifecycle is strictly controlled: accidental file loss is prevented through trash bins, while permanent deletions are securely audited."
    }
  ];

  const currentScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  // Helper to filter page content based on search query
  const matchesSearch = (text: string) => {
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="min-h-dvh bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground relative">
      {/* Premium Background Ambient Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[5%] w-[45%] h-[45%] rounded-full bg-accent/5 blur-[120px] ambient-glow-1" />
        <div className="absolute top-[40%] right-[5%] w-[40%] h-[40%] rounded-full bg-accent/4 blur-[130px] ambient-glow-2" />
        <div className="absolute inset-0 scan-grid opacity-[0.015] dark:opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="h-8 w-8 flex items-center justify-center rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
                Strategic Portal Documentation
              </h1>
              <p className="font-mono text-[9px] text-foreground-subtle tracking-wide uppercase mt-0.5">
                Staff Operations Guide &amp; Governance Playbook
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-foreground-subtle">
                <Search size={12} />
              </span>
              <input
                id={searchId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guide..."
                className="h-8 w-48 sm:w-56 pl-8 pr-3 rounded border border-input-border bg-input-bg text-xs text-foreground placeholder-foreground-subtle/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-ring"
              />
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Navigation Sidebar */}
          <nav className="lg:col-span-3 space-y-2 lg:sticky lg:top-6 select-none">
            <div className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest px-3 mb-2">
              Guide Directory
            </div>
            <div className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    const el = document.getElementById(section.id);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded border transition-all cursor-pointer text-left",
                    activeSection === section.id
                      ? "bg-accent-subtle/30 border-accent/30 text-accent font-extrabold"
                      : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-panel/40"
                  )}
                >
                  {section.icon}
                  <span className="capitalize">{section.label}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-border/10 mt-4 hidden lg:block">
              <div className="p-3 rounded border border-border/20 bg-background-panel/20 backdrop-blur-sm space-y-2 text-[10px] font-mono text-foreground-subtle">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Shield size={12} className="text-accent" />
                  <span>Compliance Alert</span>
                </div>
                <p className="leading-relaxed">
                  All platform actions are recorded in the system audit logs. Ensure proper governance steps are adhered to when modifying files classified as SULIT or RAHSIA.
                </p>
              </div>
            </div>
          </nav>

          {/* Guide Content Area */}
          <main className="lg:col-span-9 space-y-8 max-w-4xl pb-16">
            
            {/* Section: Overview */}
            <section
              id="overview"
              className={cn(
                "glass-premium rounded p-6 space-y-4 border border-border/20",
                searchQuery && !matchesSearch("overview portal strategic metadata") && "opacity-45"
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <BookOpen size={18} className="text-accent" />
                <h2 className="text-base font-bold font-serif text-foreground">
                  1. Strategic Portal Overview
                </h2>
              </div>
              
              <p className="text-foreground-muted text-xs leading-relaxed font-sans">
                The **Strategic Portal** is Unggul Axiom&apos;s corporate data vault and strategic planning hub. It integrates structured **File Hosting** with **Government-grade Information Security &amp; Approval Workflows**. Unlike standard cloud storages, this portal is specifically designed to enforce organizational hierarchies, prevent data tampering, and ensure complete transparency of operational audits.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 border border-border/30 rounded bg-background/25 flex flex-col gap-1">
                  <Folder size={16} className="text-accent" />
                  <span className="font-mono text-[9px] font-bold text-foreground uppercase mt-1">Structured Files</span>
                  <span className="text-[10px] text-foreground-subtle leading-normal font-sans">
                    Hierarchy organization with metadata tagging and customizable storage controls.
                  </span>
                </div>
                <div className="p-3 border border-border/30 rounded bg-background/25 flex flex-col gap-1">
                  <Shield size={16} className="text-accent" />
                  <span className="font-mono text-[9px] font-bold text-foreground uppercase mt-1">Strict Governance</span>
                  <span className="text-[10px] text-foreground-subtle leading-normal font-sans">
                    Approval workflows for locks, unlocks, and file classification modifications.
                  </span>
                </div>
                <div className="p-3 border border-border/30 rounded bg-background/25 flex flex-col gap-1">
                  <Clock size={16} className="text-accent" />
                  <span className="font-mono text-[9px] font-bold text-foreground uppercase mt-1">Audit Trails</span>
                  <span className="text-[10px] text-foreground-subtle leading-normal font-sans">
                    Un-alterable logs of logins, file actions, and supervisor decision steps.
                  </span>
                </div>
              </div>
            </section>

            {/* Section: File Explorer */}
            <section
              id="file-explorer"
              className={cn(
                "glass-premium rounded p-6 space-y-4 border border-border/20",
                searchQuery && !matchesSearch("file explorer upload classification sharing") && "opacity-45"
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <Folder size={18} className="text-accent" />
                <h2 className="text-base font-bold font-serif text-foreground">
                  2. File Explorer &amp; Classifications
                </h2>
              </div>
              
              <p className="text-foreground-muted text-xs leading-relaxed font-sans">
                The File Explorer serves as the primary workspace for all staff. Folders and files are secured based on **Information Classification Ratings**.
              </p>

              {/* Classifications Explained */}
              <div className="space-y-2">
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">
                  Understanding Classifications:
                </h3>
                <div className="border border-border/25 rounded overflow-hidden">
                  <table className="w-full text-left font-mono text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-background-panel/60 border-b border-border/20 text-foreground-subtle select-none">
                        <th className="p-2 w-28">Classification</th>
                        <th className="p-2">Access Guidelines</th>
                        <th className="p-2 w-28 text-center">Visibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      <tr>
                        <td className="p-2 font-bold text-success bg-success/5">TERBUKA</td>
                        <td className="p-2 text-foreground-muted font-sans text-[11px] leading-tight">
                          General operations documents. Accessible to all authenticated portal members. No special approvals needed.
                        </td>
                        <td className="p-2 text-center text-foreground-subtle">All Staff</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-warning bg-warning/5">SULIT</td>
                        <td className="p-2 text-foreground-muted font-sans text-[11px] leading-tight">
                          Confidential strategic plans, department workflows, and drafts. Restricted to specific teams and executives.
                        </td>
                        <td className="p-2 text-center text-foreground-subtle">Shared Users</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-bold text-destructive bg-destructive/5">RAHSIA</td>
                        <td className="p-2 text-foreground-muted font-sans text-[11px] leading-tight">
                          Highly sensitive documents. Board meeting transcripts, strategic mergers, or financial audits.
                        </td>
                        <td className="p-2 text-center text-foreground-subtle">Chief &amp; Directors</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Core Explorer Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5 font-sans">
                  <div className="flex items-center gap-1.5 text-foreground font-bold text-xs">
                    <Users size={12} className="text-accent" />
                    <span>Collaborator Sharing</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted leading-relaxed">
                    You can grant folder or file access to colleagues by clicking the **Share** button. Permissions include **Owner** (full control), **Editor** (can upload/delete/rename), and **Viewer** (read/download only).
                  </p>
                </div>
                <div className="space-y-1.5 font-sans">
                  <div className="flex items-center gap-1.5 text-foreground font-bold text-xs">
                    <HardDrive size={12} className="text-accent" />
                    <span>Quota Tracking &amp; Favorites</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted leading-relaxed">
                    Track your personal storage quota at the bottom of the sidebar. Quick-access important assets by clicking the **Star** icon to save them to your **Favorites** tab.
                  </p>
                </div>
                <div className="space-y-1.5 font-sans">
                  <div className="flex items-center gap-1.5 text-foreground font-bold text-xs">
                    <Trash2 size={12} className="text-accent" />
                    <span>Soft Deletes &amp; Trash Recovery</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted leading-relaxed">
                    Deleting an item sends it to the **Trash**. Staff can restore mistakenly deleted items back to their active folder directory. Permanent deletions are restricted to administrators.
                  </p>
                </div>
                <div className="space-y-1.5 font-sans">
                  <div className="flex items-center gap-1.5 text-foreground font-bold text-xs">
                    <Eye size={12} className="text-accent" />
                    <span>File Preview Drawer</span>
                  </div>
                  <p className="text-[11px] text-foreground-muted leading-relaxed">
                    Select any file to toggle the file details panel, showing classification levels, collaborator rosters, size properties, and real-time locking status.
                  </p>
                </div>
              </div>
            </section>

            {/* Section: Governance Flow */}
            <section
              id="governance"
              className={cn(
                "glass-premium rounded p-6 space-y-4 border border-border/20",
                searchQuery && !matchesSearch("governance request lock unlock approval classification") && "opacity-45"
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <Shield size={18} className="text-accent" />
                <h2 className="text-base font-bold font-serif text-foreground">
                  3. Governance System &amp; Approval Flows
                </h2>
              </div>
              
              <p className="text-foreground-muted text-xs leading-relaxed font-sans">
                The **Governance System** prevents unauthorized file modification, security downgrades, or data destruction. Major file changes are gated by supervisor approval.
              </p>

              {/* Request Process Diagram */}
              <div className="p-4 rounded border border-border/30 bg-background/30 font-mono text-[9px] text-foreground-subtle space-y-4">
                <span className="font-bold text-foreground block uppercase tracking-wider">Governance Request Lifecycle:</span>
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
                  <div className="p-2 border border-border rounded w-full md:w-36 bg-background-panel/40">
                    <span className="text-accent font-bold">1. SUBMIT</span>
                    <p className="mt-1 text-[8px] leading-tight font-sans">Staff submits request via floating action bar</p>
                  </div>
                  <ChevronRight size={14} className="rotate-90 md:rotate-0 text-foreground-subtle" />
                  <div className="p-2 border border-border rounded w-full md:w-36 bg-background-panel/40">
                    <span className="text-accent font-bold">2. QUEUE</span>
                    <p className="mt-1 text-[8px] leading-tight font-sans">Placed in PENDING tasks database</p>
                  </div>
                  <ChevronRight size={14} className="rotate-90 md:rotate-0 text-foreground-subtle" />
                  <div className="p-2 border border-border rounded w-full md:w-36 bg-background-panel/40">
                    <span className="text-accent font-bold">3. REVIEW</span>
                    <p className="mt-1 text-[8px] leading-tight font-sans">Supervisor checks reasons and logs</p>
                  </div>
                  <ChevronRight size={14} className="rotate-90 md:rotate-0 text-foreground-subtle" />
                  <div className="p-2 border border-border rounded w-full md:w-36 bg-background-panel/40">
                    <span className="text-accent font-bold">4. EXECUTE</span>
                    <p className="mt-1 text-[8px] leading-tight font-sans">Approved changes automatically apply</p>
                  </div>
                </div>
              </div>

              {/* Operation Types */}
              <div className="space-y-3 font-sans">
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground-subtle">
                  Core Governance Request Types:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full border border-border bg-background-panel/50 text-accent flex items-center justify-center font-mono font-bold text-xs shrink-0">L</div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">File Lock (FILE_LOCK)</h4>
                      <p className="text-[11px] text-foreground-muted mt-0.5 leading-relaxed">
                        Prevents editing, renaming, moving, or deleting the target file. Submit a lock request when you are reviewing drafts or freeze a file for official audits.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full border border-border bg-background-panel/50 text-accent flex items-center justify-center font-mono font-bold text-xs shrink-0">U</div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">File Unlock (FILE_UNLOCK)</h4>
                      <p className="text-[11px] text-foreground-muted mt-0.5 leading-relaxed">
                        Releases a locked file so editors can make changes. Requires detailing the scope of updates to be performed.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full border border-border bg-background-panel/50 text-accent flex items-center justify-center font-mono font-bold text-xs shrink-0">↑</div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Classification Upgrade</h4>
                      <p className="text-[11px] text-foreground-muted mt-0.5 leading-relaxed">
                        Raises security levels (e.g. TERBUKA → SULIT). Useful if a document becomes sensitive or contains strategic data.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full border border-border bg-background-panel/50 text-accent flex items-center justify-center font-mono font-bold text-xs shrink-0">↓</div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Classification Downgrade</h4>
                      <p className="text-[11px] text-foreground-muted mt-0.5 leading-relaxed">
                        Lowers security levels (e.g. SULIT → TERBUKA). Subject to intense verification to ensure sensitive data is not leaked to public staff.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Example Scenarios */}
            <section
              id="scenarios"
              className={cn(
                "glass-premium rounded p-6 space-y-4 border border-border/20",
                searchQuery && !matchesSearch("scenarios example collaborative deletion locking scenario") && "opacity-45"
              )}
            >
              <div className="flex items-center justify-between border-b border-border/10 pb-2">
                <div className="flex items-center gap-2">
                  <Play size={18} className="text-accent" />
                  <h2 className="text-base font-bold font-serif text-foreground">
                    4. Example Operational Scenarios
                  </h2>
                </div>
                <span className="font-mono text-[8px] font-semibold text-accent border border-accent/20 bg-accent-subtle/30 px-2 py-0.5 rounded uppercase">
                  Interactive Simulator
                </span>
              </div>
              
              <p className="text-foreground-muted text-xs leading-relaxed font-sans">
                Select a scenario below to walk through step-by-step instructions on how staff members navigate the File Explorer and Governance mechanisms in tandem.
              </p>

              {/* Scenario Tab Selectors */}
              <div className="flex flex-wrap gap-2 select-none border-b border-border/10 pb-3">
                {scenarios.map((scen) => (
                  <button
                    key={scen.id}
                    onClick={() => {
                      setActiveScenarioId(scen.id);
                      setActiveScenarioStep(0);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded border font-mono text-[10px] font-bold uppercase transition-all cursor-pointer",
                      activeScenarioId === scen.id
                        ? "bg-accent/15 border-accent/40 text-accent"
                        : "border-border/30 text-foreground-subtle hover:text-foreground hover:bg-background-panel/40"
                    )}
                  >
                    {scen.icon}
                    <span>{scen.title}</span>
                  </button>
                ))}
              </div>

              {/* Scenario Simulator Card */}
              <div className="border border-border/30 rounded bg-background/20 overflow-hidden flex flex-col md:flex-row min-h-[250px]">
                {/* Left Side: Steps Tracker */}
                <div className="md:w-1/3 bg-background-panel/50 border-r border-border/20 p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="font-mono text-[8px] font-bold tracking-widest text-foreground-subtle uppercase block">
                      Sequence Progress
                    </span>
                    <div className="space-y-1">
                      {currentScenario.steps.map((step, idx) => (
                        <button
                          key={step.title}
                          onClick={() => setActiveScenarioStep(idx)}
                          className={cn(
                            "w-full flex items-center gap-2 p-1.5 rounded-sm text-left font-mono text-[10px] transition-colors cursor-pointer",
                            activeScenarioStep === idx
                              ? "bg-accent text-accent-foreground font-extrabold"
                              : "text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
                          )}
                        >
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current text-[8px]">
                            {idx + 1}
                          </span>
                          <span className="truncate">{step.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/10 font-mono text-[9px] text-foreground-subtle/70">
                    <Clock size={11} className="inline mr-1" />
                    Real-time execution simulation
                  </div>
                </div>

                {/* Right Side: Step details & outcome */}
                <div className="flex-1 p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-2 animate-in fade-in duration-200" key={activeScenarioStep}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-accent">
                        Step {activeScenarioStep + 1}: {currentScenario.steps[activeScenarioStep].badge}
                      </span>
                      <span className="font-mono text-[8px] font-semibold text-foreground-subtle border border-border px-2 py-0.5 rounded uppercase">
                        Role: {currentScenario.steps[activeScenarioStep].role}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground font-sans">
                      {currentScenario.steps[activeScenarioStep].title}
                    </h4>
                    <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                      {currentScenario.steps[activeScenarioStep].desc}
                    </p>
                  </div>

                  {/* Navigation Buttons for Steps */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setActiveScenarioStep((prev) => Math.max(0, prev - 1))}
                      disabled={activeScenarioStep === 0}
                      className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase rounded border border-border text-foreground-subtle hover:text-foreground hover:bg-background-panel/40 disabled:opacity-30 cursor-pointer"
                    >
                      Prev Step
                    </button>
                    {activeScenarioStep < currentScenario.steps.length - 1 ? (
                      <button
                        onClick={() => setActiveScenarioStep((prev) => prev + 1)}
                        className="btn-shimmer px-3 py-1 text-[9px] font-mono font-bold uppercase rounded flex items-center gap-1 cursor-pointer"
                      >
                        Next Step <ChevronRight size={10} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-success font-mono text-[9px] border border-success/30 bg-success/5 px-2.5 py-1 rounded">
                        <CheckCircle size={10} /> Scenario Ready
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Scenario outcome block */}
              <div className="p-4 rounded border border-border/25 bg-background-panel/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-accent font-mono text-[9px] font-bold uppercase tracking-wider">
                  <Sparkles size={11} /> Scenario Outcome
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
                  {currentScenario.outcome}
                </p>
              </div>
            </section>

            {/* Section: Roles */}
            <section
              id="roles"
              className={cn(
                "glass-premium rounded p-6 space-y-4 border border-border/20",
                searchQuery && !matchesSearch("roles credentials staff officer director chief permissions") && "opacity-45"
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <Users size={18} className="text-accent" />
                <h2 className="text-base font-bold font-serif text-foreground">
                  5. Platform Roles &amp; Permissions
                </h2>
              </div>
              
              <p className="text-foreground-muted text-xs leading-relaxed font-sans">
                Each member of Unggul Axiom is mapped to a specific platform role defining their global authority to modify portal states and approve governance queues.
              </p>

              <div className="space-y-3 font-mono text-[10px]">
                {/* Staff */}
                <div className="border border-border/30 rounded p-3 bg-background/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground uppercase">Staff Role</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border bg-background-muted/40 text-foreground-subtle border-border/40 uppercase">
                      Individual Contributor
                    </span>
                  </div>
                  <p className="text-foreground-muted font-sans text-[11px] leading-relaxed">
                    Standard portal users. Can create folders, upload assets, share files with other colleagues, and submit governance requests (Locks/Upgrades). Cannot approve governance tasks or configure storage metrics.
                  </p>
                </div>

                {/* Officer */}
                <div className="border border-border/30 rounded p-3 bg-background/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-info uppercase">Officer Role</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border bg-info/10 text-info border-info/20 uppercase">
                      Operational Supervisor
                    </span>
                  </div>
                  <p className="text-foreground-muted font-sans text-[11px] leading-relaxed">
                    Medium tier supervisor. Has editing controls over team assets. Can submit classification overrides and lock requests. Officer decisions act as pre-validation checkmarks for executive approvals.
                  </p>
                </div>

                {/* Director */}
                <div className="border border-border/30 rounded p-3 bg-background/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent/80 uppercase">Director Role</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border bg-accent/10 text-accent border-accent/20 uppercase">
                      Business Unit Leader
                    </span>
                  </div>
                  <p className="text-foreground-muted font-sans text-[11px] leading-relaxed">
                    Executive level. Can review and approve/reject all pending governance requests submitted by staff members under their business scope. Full visibility into files classified up to RAHSIA.
                  </p>
                </div>

                {/* Chief */}
                <div className="border border-border/30 rounded p-3 bg-background/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-accent uppercase">Chief Role</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border bg-accent/15 text-accent border-accent/30 uppercase">
                      Global Administrator
                    </span>
                  </div>
                  <p className="text-foreground-muted font-sans text-[11px] leading-relaxed">
                    Ultimate authority. Can force-approve/reject any governance request globally, execute bulk user modifications, adjust file classification rules, and override global platform configurations in the Admin Console.
                  </p>
                </div>
              </div>
            </section>

            {/* Quick Help Accordion */}
            <div className="border border-border/30 rounded p-4 bg-background-panel/40 backdrop-blur-sm space-y-2">
              <div className="flex items-center gap-1.5 text-foreground font-serif text-sm font-semibold">
                <HelpCircle size={15} className="text-accent" />
                <span>Frequently Asked Questions</span>
              </div>
              <div className="divide-y divide-border/10 text-xs">
                <div className="py-2.5 space-y-1 font-sans">
                  <h4 className="font-bold text-foreground">Why can&apos;t I delete my file?</h4>
                  <p className="text-foreground-subtle text-[11px] leading-relaxed">
                    Check if the file is locked. Look for the **Lock Icon** in the explorer list or file details. A file locked by the governance process cannot be deleted, moved, or renamed until a FILE_UNLOCK request is submitted and approved by an authorized Director or Chief.
                  </p>
                </div>
                <div className="py-2.5 space-y-1 font-sans">
                  <h4 className="font-bold text-foreground">What is the difference between sharing as Editor vs. Viewer?</h4>
                  <p className="text-foreground-subtle text-[11px] leading-relaxed">
                    An **Editor** can upload files into a shared folder, rename existing files, or delete them. A **Viewer** can only view the contents and download files; they cannot upload items or overwrite existing documents.
                  </p>
                </div>
                <div className="py-2.5 space-y-1 font-sans">
                  <h4 className="font-bold text-foreground">Who handles governance approvals?</h4>
                  <p className="text-foreground-subtle text-[11px] leading-relaxed">
                    Any user with the role of **Director** or **Chief** has access to the Admin/Governance Console to approve or reject pending requests. Contact your department lead if your request is pending urgent approval.
                  </p>
                </div>
              </div>
            </div>

          </main>
        </div>

        {/* Footer ticker */}
        <footer className="w-full bg-background-panel/40 border border-border/30 px-4 py-2 rounded flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-foreground-subtle select-none">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>OPERATIONAL SYSTEMS MANUAL</span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span>VERSION 1.0.4</span>
            <span className="text-foreground-subtle/30">|</span>
            <span>UNSTABLE IN DEV CONSOLE</span>
          </div>
          <span className="flex items-center gap-1">
            <Lock size={9} className="text-accent" /> SECURE CONTEXT
          </span>
        </footer>
      </div>
    </div>
  );
}
