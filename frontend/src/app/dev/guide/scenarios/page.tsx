"use client";

import { useState } from "react";
import {
  Play,
  Lock,
  Users,
  Trash2,
  ChevronRight,
  Clock,
  Sparkles,
  CheckCircle,
  FileCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  desc: string;
  role: string;
  badge: string;
  mockLog?: string;
}

interface Scenario {
  id: string;
  title: string;
  icon: React.ReactNode;
  overview: string;
  steps: Step[];
  outcome: string;
}

export default function ScenariosGuidePage() {
  const [activeScenarioId, setActiveScenarioId] = useState("secure-doc");
  const [activeScenarioStep, setActiveScenarioStep] = useState(0);

  const scenarios: Scenario[] = [
    {
      id: "secure-doc",
      title: "Securing Sensitive Files",
      icon: <Lock size={14} className="text-accent" />,
      overview: "How to upload a strategic document, lock it from edits, and restrict access through classification upgrades.",
      steps: [
        {
          title: "Upload & Classify",
          desc: "Upload the document (e.g., 'Q3 Budget.pdf') to your workspace. Select 'SULIT' (Confidential) in the upload panel classification selector.",
          role: "Staff / Officer",
          badge: "Upload File",
          mockLog: "POST /api/files/upload HTTP/1.1\nHost: hub.unggulaxiom.com\nContent-Type: multipart/form-data\n\n-> payload: { parentId: null, classification: 'SULIT', file: <Q3 Budget.pdf> }\n<- Response: 201 Created { id: 'f-8972', name: 'Q3 Budget.pdf', classification: 'SULIT' }"
        },
        {
          title: "Submit Lock Request",
          desc: "Select the file, click 'Governance' in the Action Bar, and submit a 'FILE_LOCK' request stating: 'Prevent modifications during draft review'.",
          role: "Staff / Officer",
          badge: "Lock Request",
          mockLog: "POST /api/governance/requests HTTP/1.1\n-> payload: { targetFileId: 'f-8972', type: 'FILE_LOCK', title: 'Lock Draft', metadata: { lockReason: 'Prevent modifications' } }\n<- Response: 201 Created { id: 'req-431', status: 'PENDING' }"
        },
        {
          title: "Request Classification Upgrade",
          desc: "Submit a second request for 'CLASSIFICATION_UPGRADE' targeting the same file to set its status to 'RAHSIA' (Secret) to restrict views to Board Members only.",
          role: "Staff / Officer",
          badge: "Upgrade Request",
          mockLog: "POST /api/governance/requests HTTP/1.1\n-> payload: { targetFileId: 'f-8972', type: 'CLASSIFICATION_UPGRADE', title: 'Restrict to Board', metadata: { newClassification: 'RAHSIA' } }\n<- Response: 201 Created { id: 'req-432', status: 'PENDING' }"
        },
        {
          title: "Supervisor Approval",
          desc: "A Director or Chief accesses the Admin/Governance Console, reviews the audit log, and clicks 'Approve' on both pending items.",
          role: "Director / Chief",
          badge: "Approval Gate",
          mockLog: "POST /api/governance/requests/req-431/approve HTTP/1.1\nAuthorization: Bearer USER_JWT\n-> payload: { reason: 'Lock approved for audit compliance' }\n<- Response: 200 OK { status: 'approved' }\n\nPOST /api/governance/requests/req-432/approve HTTP/1.1\nAuthorization: Bearer USER_JWT\n-> payload: { reason: 'Upgrade to RAHSIA approved for board review' }\n<- Response: 200 OK { status: 'approved' }"
        }
      ],
      outcome: "The file is locked (cannot be renamed, moved, or deleted) and upgraded to RAHSIA classification, securing it against unauthorized internal leakage."
    },
    {
      id: "collaboration",
      title: "Team Folder & Collaboration",
      icon: <Users size={14} className="text-accent" />,
      overview: "Creating a shared workspace, delegating permissions to your team members, and editing safely without overlap.",
      steps: [
        {
          title: "Create & Share Folder",
          desc: "Create a folder named 'Marketing Campaigns 2026'. Right-click the folder, choose 'Share', enter team members' emails, and set roles to 'editor'.",
          role: "Folder Owner",
          badge: "Share Settings",
          mockLog: "POST /api/files/folders HTTP/1.1\n-> payload: { name: 'Marketing Campaigns 2026', parentId: null, classification: 'TERBUKA' }\n<- Response: 201 Created { id: 'fold-391', name: 'Marketing Campaigns 2026' }\n\nPOST /api/files/fold-391/shares HTTP/1.1\n-> payload: { email: 'colleague@unggulaxiom.com', role: 'editor' }\n<- Response: 200 OK { status: 'shared' }"
        },
        {
          title: "Conflict Prevention",
          desc: "When working on a shared file, click 'Lock File' (Governance Lock) to inform other team members you are editing. This prevents overwrite conflicts.",
          role: "Collaborator (Editor)",
          badge: "Temporary Lock",
          mockLog: "POST /api/governance/requests HTTP/1.1\n-> payload: { targetFileId: 'f-7128', type: 'FILE_LOCK', title: 'Lock for Editing' }\n<- Response: 201 Created { id: 'req-987', status: 'PENDING' }"
        },
        {
          title: "Upload Revision",
          desc: "Once edits are finalized locally, upload the revised file. The explorer maintains classification settings automatically.",
          role: "Collaborator (Editor)",
          badge: "Upload Revision",
          mockLog: "POST /api/files/upload HTTP/1.1\nContent-Type: multipart/form-data\n-> payload: { parentId: 'fold-391', classification: 'TERBUKA', file: campaigns_draft_v2.docx }\n<- Response: 200 OK"
        },
        {
          title: "Release Lock",
          desc: "Unlock the file to allow other editors to work on it, keeping the collaboration stream active and transparent.",
          role: "Collaborator (Editor)",
          badge: "Unlock",
          mockLog: "POST /api/governance/requests HTTP/1.1\n-> payload: { targetFileId: 'f-7128', type: 'FILE_UNLOCK', title: 'Unlock Revision' }\n<- Response: 201 Created { id: 'req-988', status: 'PENDING' }"
        }
      ],
      outcome: "Team members collaborate in real-time, completely protected from version conflicts, with all edits securely tracked in the activity feed."
    },
    {
      id: "deletion",
      title: "Audited Deletion & Recovery",
      icon: <Trash2 size={14} className="text-accent" />,
      overview: "Moving obsolete files to the Trash, restoring accidental deletions, and permanent disposal audits.",
      steps: [
        {
          title: "Soft Delete to Trash",
          desc: "Select obsolete files or drafts and click 'Delete' in the action bar. The files are marked as 'Trashed' and hidden from the standard file explorer.",
          role: "File Owner / Admin",
          badge: "Soft Delete",
          mockLog: "DELETE /api/files/f-1049 HTTP/1.1\n<- Response: 200 OK { fileId: 'f-1049', status: 'TRASHED' }"
        },
        {
          title: "Accidental Deletion Recovery",
          desc: "Navigate to the 'Trash' tab in the left sidebar. Locate the file, select it, and click 'Restore'. The file is returned to its original parent folder.",
          role: "File Owner",
          badge: "Restore",
          mockLog: "POST /api/files/f-1049/restore HTTP/1.1\n<- Response: 200 OK { status: 'restored' }"
        },
        {
          title: "Permanent Destruction",
          desc: "For permanent removal, go to the 'Trash' tab, select the file, and choose 'Permanently Delete'. This generates a permanent audit trail entry.",
          role: "Admin Only",
          badge: "Hard Delete",
          mockLog: "DELETE /api/files/f-1049/permanent HTTP/1.1\nAuthorization: Bearer USER_JWT\n<- Response: 200 OK { status: 'deleted' }"
        }
      ],
      outcome: "Information lifecycle is strictly controlled: accidental file loss is prevented through trash bins, while permanent deletions are securely audited."
    }
  ];

  const currentScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Play size={10} /> SECTION 5.0
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          Operational Scenarios
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          Review step-by-step simulations of real-world workflows inside the Strategic Portal. Toggle scenarios below to inspect the logical flow and mock API outputs.
        </p>
      </div>

      {/* Scenario Select Tab */}
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

      {/* Main Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-border/30 rounded bg-background/20 overflow-hidden min-h-[350px]">
        {/* Progress Tracker (Sidebar inside panel) */}
        <div className="lg:col-span-4 bg-background-panel/50 border-b lg:border-b-0 lg:border-r border-border/20 p-4 space-y-4 flex flex-col justify-between select-none">
          <div className="space-y-2">
            <span className="font-mono text-[8px] font-bold tracking-widest text-foreground-subtle uppercase block">
              Workflow Steps
            </span>
            <div className="space-y-1">
              {currentScenario.steps.map((step, idx) => (
                <button
                  key={step.title}
                  onClick={() => setActiveScenarioStep(idx)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-2 rounded text-left font-mono text-[10px] transition-colors cursor-pointer",
                    activeScenarioStep === idx
                      ? "bg-accent text-accent-foreground font-extrabold"
                      : "text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
                  )}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[8px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="truncate">{step.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-border/10 font-mono text-[8px] text-foreground-subtle/60">
            <Clock size={11} className="inline mr-1" />
            Interactive logic simulator
          </div>
        </div>

        {/* Step details & outcome */}
        <div className="lg:col-span-8 p-4 sm:p-6 flex flex-col justify-between gap-6 min-w-0">
          <div className="space-y-4 animate-in fade-in duration-200" key={activeScenarioStep}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/10 pb-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-accent">
                Step {activeScenarioStep + 1}: {currentScenario.steps[activeScenarioStep].badge}
              </span>
              <span className="font-mono text-[8px] font-semibold text-foreground-subtle border border-border px-2 py-0.5 rounded uppercase self-start">
                Authorized Role: {currentScenario.steps[activeScenarioStep].role}
              </span>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground font-sans">
                {currentScenario.steps[activeScenarioStep].title}
              </h4>
              <p className="text-xs text-foreground-muted leading-relaxed font-sans">
                {currentScenario.steps[activeScenarioStep].desc}
              </p>
            </div>

            {/* Mock API Log Overlay */}
            {currentScenario.steps[activeScenarioStep].mockLog && (
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 font-mono text-[8px] font-bold text-accent uppercase tracking-wider">
                  <FileCode size={10} /> Request/Response Console
                </span>
                <pre className="p-3 rounded border border-border/30 bg-background/80 font-mono text-[9px] leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre">
                  {currentScenario.steps[activeScenarioStep].mockLog}
                </pre>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-border/10">
            <button
              onClick={() => setActiveScenarioStep((prev) => Math.max(0, prev - 1))}
              disabled={activeScenarioStep === 0}
              className="px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded border border-border text-foreground-subtle hover:text-foreground hover:bg-background-panel/40 disabled:opacity-30 cursor-pointer"
            >
              Prev Step
            </button>
            {activeScenarioStep < currentScenario.steps.length - 1 ? (
              <button
                onClick={() => setActiveScenarioStep((prev) => prev + 1)}
                className="btn-shimmer px-4 py-1.5 text-[9px] font-mono font-bold uppercase rounded flex items-center gap-1 cursor-pointer"
              >
                Next Step <ChevronRight size={10} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-success font-mono text-[9px] border border-success/30 bg-success/5 px-3 py-1.5 rounded select-none">
                <CheckCircle size={11} /> Workflow Completed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scenario outcome summary */}
      <div className="p-4 rounded border border-border/25 bg-background-panel/30 space-y-1.5">
        <div className="flex items-center gap-1.5 text-accent font-mono text-[9px] font-bold uppercase tracking-wider">
          <Sparkles size={11} /> Expected Outcome
        </div>
        <p className="text-[11px] text-foreground-muted leading-relaxed font-sans">
          {currentScenario.outcome}
        </p>
      </div>
    </div>
  );
}
