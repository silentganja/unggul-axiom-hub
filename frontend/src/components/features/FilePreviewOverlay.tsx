"use client";

import { useEffect, useState } from "react";
import {
  X,
  Download,
  FileText,
  File,
  Shield,
  Clock,
  User,
  Hash,
  FolderOpen,
  Info,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw
} from "lucide-react";
import { useFileStore, FileNode } from "@/store/useFileStore";
import { cn } from "@/lib/utils";

export default function FilePreviewOverlay() {
  const previewFileId = useFileStore((state) => state.previewFileId);
  const setPreviewFileId = useFileStore((state) => state.setPreviewFileId);
  const files = useFileStore((state) => state.files);

  const file = files.find((f) => f.id === previewFileId) || null;

  // Zoom level state inside preview sandbox
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Esc keyboard listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewFileId(null);
      }
    };
    if (previewFileId) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewFileId, setPreviewFileId]);

  if (!file) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isPDF = ext === "pdf";
  const isExcel = ext === "xlsx" || ext === "csv";
  const isDoc = ext === "docx" || ext === "txt";

  const getFileIcon = () => {
    if (isPDF || isDoc) return <FileText className="text-info" size={32} />;
    return <File className="text-foreground-subtle" size={32} />;
  };

  const handleDownload = () => {
    alert(`Securely downloading decrypted payload: ${file.name}`);
  };

  // Dynamic MD5 hash based on file ID to look realistic
  const computeMockMD5 = (id: string) => {
    let hash = "";
    const chars = "abcdef0123456789";
    for (let i = 0; i < 32; i++) {
      const code = id.charCodeAt(i % id.length) + i;
      hash += chars[code % chars.length];
    }
    return hash;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Backdrop closer */}
      <div 
        className="absolute inset-0 cursor-default" 
        onClick={() => setPreviewFileId(null)}
      />

      {/* Main Preview Container */}
      <div className="relative w-full max-w-5xl h-[85vh] rounded-sm border border-border bg-background-panel shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        
        {/* ── 1. Header Toolbar ── */}
        <header className="h-12 border-b border-border/30 bg-background/40 backdrop-blur-sm px-4 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-6 w-6 rounded border border-border/20 bg-background/50 flex items-center justify-center text-foreground-subtle shrink-0">
              <File size={12} />
            </div>
            <span className="text-xs font-semibold text-foreground truncate max-w-md font-sans">
              {file.name}
            </span>
            <span className="font-mono text-[8px] tracking-[0.2em] font-bold text-accent bg-accent-subtle px-1.5 py-0.5 rounded border border-accent/25 uppercase shrink-0 leading-none">
              Encrypted Telemetry
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            {/* Download Securely */}
            <button
              onClick={handleDownload}
              className="h-7 px-2.5 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-[9px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-foreground transition-all cursor-pointer"
            >
              <Download size={11} className="text-success" />
              <span>Download payload</span>
            </button>
            
            {/* Close button */}
            <button
              onClick={() => setPreviewFileId(null)}
              className="h-7 w-7 rounded-sm border border-border bg-background hover:bg-destructive/15 text-foreground-subtle hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
              title="Close Preview (ESC)"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        {/* ── 2. Split Workspace (Preview Body vs Metadata Sidebar) ── */}
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          
          {/* Left panel: Active decrypted viewport area */}
          <div className="flex-grow bg-background/30 overflow-hidden relative flex flex-col justify-between">
            {/* Sandbox Toolbar controls */}
            <div className="h-8 border-b border-border/10 bg-background-panel/40 px-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-foreground-subtle shrink-0 select-none z-10">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Shield size={10} className="text-success animate-pulse" /> Sandbox Mode
                </span>
                <span className="text-border/15">|</span>
                <span>Zoom: {zoom}%</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setZoom(Math.max(50, zoom - 25))} 
                  className="h-5 w-5 border border-border/20 rounded-sm hover:bg-background/40 flex items-center justify-center transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut size={9} />
                </button>
                <button 
                  onClick={() => setZoom(Math.min(200, zoom + 25))} 
                  className="h-5 w-5 border border-border/20 rounded-sm hover:bg-background/40 flex items-center justify-center transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn size={9} />
                </button>
                <button 
                  onClick={() => setRotation((rotation + 90) % 360)} 
                  className="h-5 w-5 border border-border/20 rounded-sm hover:bg-background/40 flex items-center justify-center transition-colors cursor-pointer"
                  title="Rotate Document"
                >
                  <RotateCw size={9} />
                </button>
              </div>
            </div>

            {/* Sandbox Viewport payload */}
            <div className="flex-grow overflow-auto p-8 flex items-center justify-center select-none bg-background/10">
              <div 
                className="transition-all duration-200 origin-center bg-background-panel border border-border/50 max-w-lg w-full rounded-sm overflow-hidden flex flex-col shadow-lg"
                style={{ 
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`
                }}
              >
                {/* Simulated Document Renderer Canvas */}
                <div className="border-b border-border/20 bg-background/60 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getFileIcon()}
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-foreground leading-tight">{file.name}</h4>
                      <p className="text-[8px] font-mono text-foreground-subtle leading-none mt-1">AES-256 DECRYPTED WORKSPACE VIEW</p>
                    </div>
                  </div>
                  <Shield size={16} className="text-accent" />
                </div>

                <div className="p-6 space-y-4">
                  {isPDF && (
                    <div className="space-y-3.5 text-left">
                      <div className="h-1 bg-accent/25 rounded-full w-2/5" />
                      <h3 className="text-sm font-bold text-foreground font-serif leading-snug">
                        Executive Memorandum: C-Suite Directives
                      </h3>
                      <div className="space-y-2 text-[10px] text-foreground-muted leading-relaxed font-sans border-t border-border/10 pt-3">
                        <p>This decrypted document sandbox allows strategic operators to audit and preview highly classified records inside active memory boundaries without local terminal payload downloads.</p>
                        <p>All read accesses are recorded and compiled inside the sovereign forensic audit register.</p>
                      </div>
                      
                      {/* Technical Blueprint lines */}
                      <div className="border border-border/15 p-3 rounded-sm bg-background/30 font-mono text-[8px] space-y-1 text-foreground-subtle">
                        <div>[DECRYPTION ENGINE]: STAGE-II COMPLETE</div>
                        <div>[INTEGRITY SUM]: SUCCESS (0x4a9d72)</div>
                        <div>[RESTRICTIONS]: C-SUITE ONLY</div>
                      </div>
                    </div>
                  )}

                  {isExcel && (
                    <div className="space-y-3 font-mono text-[9px] text-left">
                      <div className="grid grid-cols-4 gap-1.5 border-b border-border/30 pb-1.5 text-foreground font-extrabold uppercase">
                        <div>Row</div>
                        <div>Allocation</div>
                        <div>Dept</div>
                        <div>Status</div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-foreground-muted border-b border-border/10 pb-1">
                        <div className="font-bold text-foreground">01</div>
                        <div>$1,200,000</div>
                        <div>APAC_FIN</div>
                        <div className="text-success uppercase font-bold">APPROVED</div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-foreground-muted border-b border-border/10 pb-1">
                        <div className="font-bold text-foreground">02</div>
                        <div>$850,000</div>
                        <div>EMEA_OPS</div>
                        <div className="text-warning uppercase font-bold">PENDING</div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 text-foreground-muted">
                        <div className="font-bold text-foreground">03</div>
                        <div>$350,000</div>
                        <div>LATAM_HR</div>
                        <div className="text-success uppercase font-bold">APPROVED</div>
                      </div>
                    </div>
                  )}

                  {!isPDF && !isExcel && (
                    <div className="py-6 text-center space-y-3">
                      <div className="h-10 w-10 rounded-full border border-border/20 bg-background/50 flex items-center justify-center mx-auto text-accent">
                        <Info size={16} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Document Scanned Successfully</h4>
                        <p className="text-[10px] text-foreground-subtle max-w-xs mx-auto leading-relaxed">
                          Secure preview is optimized for PDF and Spreadsheet structures. Double-click the file to download and inspect text configurations locally.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-background-panel/60 p-2.5 border-t border-border/20 text-center font-mono text-[8px] text-foreground-subtle">
                  SYSTEM SECURITY CERTIFICATION V2 // CLUSTER ENDPOINT LOG ACTIVE
                </div>
              </div>
            </div>

            {/* Sandbox Bottom info ticker */}
            <div className="h-6 border-t border-border/10 bg-background-panel/30 px-3 flex items-center justify-between font-mono text-[8px] text-foreground-subtle select-none">
              <span>SECURE RENDERING ENVIRONMENT</span>
              <span>BUFFER ADDRESS: 0x8F44:A28B</span>
            </div>
          </div>

          {/* Right panel: High data density Metadata Sidebar */}
          <aside className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border/30 bg-background-panel p-4 flex flex-col justify-between shrink-0 font-mono text-[10px] leading-tight select-none">
            <div className="space-y-4">
              <div className="border-b border-border/20 pb-2">
                <span className="text-[9px] font-bold text-foreground-subtle uppercase tracking-widest block">
                  Security Parameters
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className={cn(
                      "inline-block px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider uppercase border",
                      file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25",
                      file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25",
                      file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40"
                    )}
                  >
                    {file.classification}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-background/50 border border-border/20 text-[8px] capitalize text-foreground-subtle">
                    {file.accessRole}
                  </span>
                </div>
              </div>

              {/* Physical Parameters Checklist */}
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-foreground-subtle uppercase tracking-wider block">Physical Size</span>
                  <span className="text-foreground font-semibold truncate block">{file.size}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-foreground-subtle uppercase tracking-wider block">Last Modification</span>
                  <span className="text-foreground block flex items-center gap-1">
                    <Clock size={10} className="text-foreground-subtle" />
                    {file.modifiedAt}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-foreground-subtle uppercase tracking-wider block">Container Directory</span>
                  <span className="text-foreground block flex items-center gap-1 truncate max-w-[200px]">
                    <FolderOpen size={10} className="text-accent" />
                    {file.parentId ? `Node: ${file.parentId}` : "System Root (My Files)"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-bold text-foreground-subtle uppercase tracking-wider block">Active Collaborators</span>
                  <span className="text-foreground block flex items-center gap-1">
                    <User size={10} className="text-foreground-subtle" />
                    {file.collaborators.length} Operator{file.collaborators.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1 pt-1.5 border-t border-border/10">
                  <span className="text-[8px] font-bold text-foreground-subtle uppercase tracking-wider block">MD5 Integrity Hash</span>
                  <span className="text-[9px] text-foreground-muted select-all leading-none font-bold break-all flex items-start gap-1">
                    <Hash size={10} className="text-foreground-subtle shrink-0 mt-0.5" />
                    {computeMockMD5(file.id)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sovereign lock state block */}
            <div className="p-3 border border-border/20 rounded-sm bg-background/30 space-y-1.5 mt-4 select-none">
              <div className="flex items-center justify-between text-[8px] uppercase tracking-wider">
                <span className="text-foreground-subtle">Governance Lock</span>
                <span className={cn("h-1.5 w-1.5 rounded-full", file.lockedBy ? "bg-accent" : "bg-success")} />
              </div>
              {file.lockedBy ? (
                <>
                  <p className="text-[9px] text-accent font-extrabold uppercase leading-none">Restricted Sign-off</p>
                  <p className="text-[8px] text-foreground-subtle leading-tight pt-1 border-t border-border/10">
                    LOCKED BY: {file.lockedBy}<br />
                    REASON: {file.lockReason || 'Pending Corporate Approval'}
                  </p>
                </>
              ) : (
                <p className="text-[9px] text-success font-bold uppercase leading-none">UNLOCKED (Open Access)</p>
              )}
            </div>
          </aside>

        </div>

      </div>

    </div>
  );
}
