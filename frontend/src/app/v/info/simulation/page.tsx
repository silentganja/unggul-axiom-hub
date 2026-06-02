"use client";

import { useState } from "react";
import { Play, ChevronRight, CheckCircle, FileCode, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimStep {
  title: string;
  badge: string;
  role: string;
  ceoValue: string;
  ctoValue: string;
  apiCall: string;
  sqlQuery: string;
  redisQuery: string;
}

export default function InfoSimulationPage() {
  const [activeStep, setActiveStep] = useState(0);

  const steps: SimStep[] = [
    {
      title: "WebAuthn challenge generation",
      badge: "Step 1: Auth Handshake",
      role: "User Browser Client",
      ceoValue: "Protects user accounts against phishing attacks. Standard password authentication is completely bypassed in favor of native biometric device signing.",
      ctoValue: "Generates a dynamic 32 byte cryptographic challenge. The challenge is stored in Redis under a short-lived key to prevent challenge replay attacks.",
      apiCall: "GET /api/auth/webauthn/login/begin?email=user@unggul.axiom HTTP/1.1\nHost: hub.unggulaxiom.com\n\n<- Response: 200 OK\n{\n  \"challenge\": \"F8x7A29M_8b1...\",\n  \"rpId\": \"localhost\",\n  \"sessionId\": \"session_id_hex\"\n}",
      sqlQuery: "/* No database write required for handshake start */\nSELECT EXISTS(SELECT 1 FROM users WHERE email = $1);",
      redisQuery: "SETEX webauthn:login:session_id_hex 300 \"F8x7A29M_8b1...\"",
    },
    {
      title: "Biometric validation and JWT generation",
      badge: "Step 2: Session Issuance",
      role: "Actix-Web API Server",
      ceoValue: "Verifies the cryptographic signature of the local user device. Upon success, a secure connection session is authorized.",
      ctoValue: "Decodes the WebAuthn signature using public keys stored in PostgreSQL. If valid, signs a JSON Web Token containing clearance metadata.",
      apiCall: "POST /api/auth/webauthn/login/complete HTTP/1.1\nPayload: { \"id\": \"credential_id\", \"sessionId\": \"session_id_hex\", \"response\": { \"clientDataJSON\": \"...\" } }\n\n<- Response: 200 OK\n{\n  \"token\": \"JWT_ACCESS_TOKEN\",\n  \"refreshToken\": \"REFRESH_TOKEN\"\n}",
      sqlQuery: "SELECT wc.user_id, u.role FROM webauthn_credentials wc JOIN users u ON u.id = wc.user_id WHERE wc.credential_id = $1;",
      redisQuery: "GET webauthn:login:session_id_hex\nDEL webauthn:login:session_id_hex",
    },
    {
      title: "Secure file upload and metadata insertion",
      badge: "Step 3: Document Upload",
      role: "Staff Account",
      ceoValue: "Saves a document under the 'SULIT' (Confidential) clearance rating, preventing general user directories from indexing the asset.",
      ctoValue: "Stores the file metadata in PostgreSQL. Slices parent path records to place the document in a virtual recursive tree container.",
      apiCall: "POST /api/files/upload HTTP/1.1\nContent-Type: multipart/form-data\nFields: { \"parent_id\": \"fold-102-uuid\", \"classification\": \"SULIT\" }\n\n<- Response: 201 Created\n{ \"id\": \"file-889-uuid\", \"name\": \"Q3_Budget.xlsx\", \"sizeBytes\": 409600 }",
      sqlQuery: "INSERT INTO files (parent_id, owner_id, name, is_folder, size_bytes, classification)\nVALUES ($1, $2, $3, FALSE, $4, 'SULIT')\nRETURNING id, name, classification;",
      redisQuery: "/* Increment active cached file counts */\nINCR user:folder_count:fold-102",
    },
    {
      title: "Submission of classification upgrade request",
      badge: "Step 4: Governance Request",
      role: "Staff Account",
      ceoValue: "Initiates a governance boundary change. Staff request permission to elevate security ratings to restrict document visibility to Directors.",
      ctoValue: "Inserts a pending request entry into `governance_requests` with a JSONB metadata payload specifying the desired rating target.",
      apiCall: "POST /api/governance/requests HTTP/1.1\nPayload: { \"target_file_id\": \"file-889-uuid\", \"type\": \"CLASSIFICATION_UPGRADE\", \"metadata\": { \"target_clearance\": \"RAHSIA\", \"reason\": \"Board review target confirmed\" } }\n\n<- Response: 201 Created\n{ \"id\": \"req-552-uuid\", \"status\": \"PENDING\" }",
      sqlQuery: "INSERT INTO governance_requests (type, title, status, requested_by, target_file_id, metadata)\nVALUES ('CLASSIFICATION_UPGRADE', 'Restrict Q3 Budget', 'PENDING', $1, $2, $3)\nRETURNING id, status;",
      redisQuery: "/* Publish notification trigger to active supervisor channels */\nPUBLISH supervisor_alerts \"New pending governance request req-552\"",
    },
    {
      title: "Supervisor approval and transaction commit",
      badge: "Step 5: Database Commit",
      role: "Director Account",
      ceoValue: "The Director approves the request in the governance inbox. The platform applies the classification shift and logs the action.",
      ctoValue: "Executes a database transaction. Locks the request row, validates the transition direction, updates the file security label, and commits.",
      apiCall: "POST /api/governance/requests/req-552-uuid/approve HTTP/1.1\n\n<- Response: 200 OK\n{ \"status\": \"approved\" }",
      sqlQuery: "BEGIN;\nSELECT * FROM governance_requests WHERE id = $1 FOR UPDATE;\nUPDATE files SET classification = 'RAHSIA' WHERE id = $2;\nUPDATE governance_requests SET status = 'APPROVED', reviewed_by = $3 WHERE id = $4;\nCOMMIT;",
      redisQuery: "/* Broadcast updated state to active client sessions */\nPUBLISH client_updates:file-889 \"RAHSIA\"",
    },
    {
      title: "Asynchronous compliance audit logging",
      badge: "Step 6: Compliance Audit",
      role: "System Logger",
      ceoValue: "Creates a permanent, non-repudiable audit ledger entry. Satisfies security audit controls and helps investigate data leak vectors.",
      ctoValue: "Triggers an asynchronous log task. Writes actor UUID, action type, client IP, target hash, and timestamp. Indexed for fast lookup.",
      apiCall: "/* Background task execution - no client HTTP roundtrip */",
      sqlQuery: "INSERT INTO audit_logs (user_id, action, target_resource, ip_address)\nVALUES ($1, 'GOVERNANCE_APPROVE', $2, $3);\n/* Index matches user_id and created_at DESC for fast audit lookups */",
      redisQuery: "/* Increment compliance metrics for tracking dashboards */\nINCR metrics:audit_logs_total",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Play size={12} /> SECTION 7.0 : SYSTEM SIMULATION
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Interactive Operational Simulator
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          Observe how the Strategic Hub executes transactions and manages security classifications. Step through the simulator below to track client APIs, database execution chains, and cache operations.
        </p>
      </div>

      {/* Simulator Interface Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-border/30 rounded-lg bg-background-panel/20 overflow-hidden min-h-[480px] shadow-lg">
        {/* Step Navigation Sidebar */}
        <div className="lg:col-span-4 bg-background-panel/40 border-b lg:border-b-0 lg:border-r border-border/20 p-5 space-y-4 flex flex-col justify-between select-none">
          <div className="space-y-3">
            <span className="font-mono text-[9px] font-bold tracking-widest text-foreground-subtle uppercase block border-b border-border/10 pb-1">
              Operational Sequence
            </span>
            <div className="space-y-1">
              {steps.map((step, idx) => (
                <button
                  key={step.badge}
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded text-left font-mono text-xs transition-all cursor-pointer border",
                    activeStep === idx
                      ? "bg-accent border-accent text-accent-foreground font-bold shadow-sm"
                      : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
                  )}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[9px] shrink-0 font-mono">
                    {idx + 1}
                  </span>
                  <span className="truncate">{step.badge}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-3 border-t border-border/10 font-mono text-[10px] text-foreground-subtle/60 flex items-center gap-1.5">
            <Clock size={12} />
            <span>Interactive specifications</span>
          </div>
        </div>

        {/* Step Details & Technical Console Panel */}
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between gap-8 min-w-0 bg-background/10">
          <div className="space-y-6 animate-in fade-in duration-200" key={activeStep}>
            {/* Metadata Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/10 pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1">
                <Sparkles size={12} /> {steps[activeStep].badge}
              </span>
              <span className="font-mono text-[9px] font-bold text-foreground-subtle border border-border px-2.5 py-0.5 rounded uppercase self-start">
                Context : {steps[activeStep].role}
              </span>
            </div>

            {/* Persona Target Explanations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm font-sans leading-relaxed">
              <div className="space-y-1 p-3 rounded border border-border/10 bg-background-panel/30">
                <span className="font-mono text-[9px] font-bold text-accent uppercase block">CEO Summary</span>
                <p className="text-foreground-muted">{steps[activeStep].ceoValue}</p>
              </div>
              <div className="space-y-1 p-3 rounded border border-border/10 bg-background-panel/30">
                <span className="font-mono text-[9px] font-bold text-accent uppercase block">CTO Summary</span>
                <p className="text-foreground-muted">{steps[activeStep].ctoValue}</p>
              </div>
            </div>

            {/* Code Console logs tabs */}
            <div className="space-y-4">
              {/* API Call log */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-accent uppercase tracking-wider">
                  <FileCode size={11} /> HTTP Client request and response headers
                </span>
                <pre className="p-4 rounded border border-border/30 bg-background/80 font-mono text-xs leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all shadow-inner">
                  {steps[activeStep].apiCall}
                </pre>
              </div>

              {/* SQL Transaction Log */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-accent uppercase tracking-wider">
                    PostgreSQL queries executed
                  </span>
                  <pre className="p-3 rounded border border-border/25 bg-background/80 font-mono text-[10px] leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all shadow-inner">
                    {steps[activeStep].sqlQuery}
                  </pre>
                </div>

                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-accent uppercase tracking-wider">
                    Redis Cache operations
                  </span>
                  <pre className="p-3 rounded border border-border/25 bg-background/80 font-mono text-[10px] leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all shadow-inner">
                    {steps[activeStep].redisQuery}
                  </pre>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-border/10">
            <button
              onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
              disabled={activeStep === 0}
              className="px-4 py-2 text-xs font-mono font-bold uppercase rounded border border-border text-foreground-subtle hover:text-foreground hover:bg-background-panel/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Back
            </button>
            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep((prev) => prev + 1)}
                className="btn-shimmer px-5 py-2 text-xs font-mono font-bold uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                Proceed <ChevronRight size={12} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-success font-mono text-xs border border-success/30 bg-success/5 px-4 py-2 rounded-lg select-none">
                <CheckCircle size={14} /> Workflow Sequence Checked
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
