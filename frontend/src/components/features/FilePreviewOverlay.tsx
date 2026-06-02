"use client";

import { useEffect, useState, useRef } from "react";
import {
  X,
  Download,
  File,
  Shield,
  Clock,
  FolderOpen,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { useFileStore } from "@/store/useFileStore";
import { filesApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function FilePreviewOverlay() {
  const previewFileId = useFileStore((state) => state.previewFileId);
  const setPreviewFileId = useFileStore((state) => state.setPreviewFileId);
  const files = useFileStore((state) => state.files);

  const file = files.find((f) => f.id === previewFileId) || null;

  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [content, setContent] = useState<{ data: ArrayBuffer; mimeType: string; blobUrl?: string } | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const prevBlobUrlRef = useRef<string | null>(null);

  // Fetch real content when preview opens (with abort on unmount/change)
  useEffect(() => {
    if (!file || file.type === "folder") return;
    let cancelled = false;
    // Clean up previous blob URL
    if (prevBlobUrlRef.current) {
      URL.revokeObjectURL(prevBlobUrlRef.current);
      prevBlobUrlRef.current = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContentLoading(true);
    setContentError(null);
    setContent(null);
    filesApi
      .getContent(file.id)
      .then((c) => {
        if (!cancelled) {
          // Create blob URL for media types so it's available on the same render
          const mt = c.mimeType || file.mimeType || "";
          const isMedia = mt.startsWith("image/") || mt.startsWith("video/") || mt.startsWith("audio/");
          const blobUrl = isMedia ? URL.createObjectURL(new Blob([c.data], { type: mt })) : undefined;
          if (blobUrl) prevBlobUrlRef.current = blobUrl;
          setContent({ ...c, blobUrl });
          setContentLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setContentError(err instanceof Error ? err.message : "Failed to load");
          setContentLoading(false);
        }
      });
    return () => {
      cancelled = true;
      if (prevBlobUrlRef.current) {
        URL.revokeObjectURL(prevBlobUrlRef.current);
        prevBlobUrlRef.current = null;
      }
    };
  }, [previewFileId, file]);

  // Esc keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewFileId(null);
    };
    if (previewFileId) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [previewFileId, setPreviewFileId]);

  if (!file) return null;

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mimeType = content?.mimeType || file.mimeType || "";
  const isImage = mimeType.startsWith("image/");
  const isText = mimeType.startsWith("text/") || ["json", "csv", "xml", "yaml", "yml", "log", "env", "md", "js", "ts", "jsx", "tsx", "css", "html"].includes(ext);
  const isPDF = mimeType === "application/pdf" || ext === "pdf";
  const isVideo = mimeType.startsWith("video/");
  const isAudio = mimeType.startsWith("audio/");
  const isOfficeDoc = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);

  // Content URL for iframe-based previews (no auth token in URL)
  const contentUrl = filesApi.contentUrl(file.id);

  const handleDownload = async () => {
    try {
      const { data, mimeType } = await filesApi.getContent(file.id);
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(filesApi.downloadUrl(file.id), "_blank");
    }
  };

  const textContent = content && isText ? new TextDecoder().decode(content.data) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0 cursor-default" onClick={() => setPreviewFileId(null)} />
      <div className="relative w-full max-w-5xl h-[85vh] rounded-sm border border-border bg-background-panel shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="h-12 border-b border-border/30 bg-background/40 backdrop-blur-sm px-4 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-6 w-6 rounded border border-border/20 bg-background/50 flex items-center justify-center text-foreground-subtle shrink-0">
              {isImage ? <ImageIcon size={12} /> : <File size={12} />}
            </div>
            <span className="text-xs font-semibold text-foreground truncate max-w-md font-sans">{file.name}</span>
            <span className="font-mono text-[8px] tracking-[0.2em] font-bold text-accent bg-accent-subtle px-1.5 py-0.5 rounded border border-accent/25 uppercase shrink-0 leading-none">{file.classification}</span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <button onClick={handleDownload} className="h-7 px-2.5 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-[9px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-foreground transition-all cursor-pointer">
              <Download size={11} className="text-success" /> Download
            </button>
            <button onClick={() => setPreviewFileId(null)} className="h-7 w-7 rounded-sm border border-border bg-background hover:bg-destructive/15 text-foreground-subtle hover:text-destructive flex items-center justify-center transition-colors cursor-pointer" title="Close (ESC)">
              <X size={14} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
          {/* Content viewport */}
          <div className="flex-grow bg-background/30 overflow-hidden relative flex flex-col">
            {/* Controls */}
            <div className="h-8 border-b border-border/10 bg-background-panel/40 px-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-foreground-subtle shrink-0 select-none z-10">
              <span className="flex items-center gap-1"><Shield size={10} className="text-success" /> Sandbox</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(Math.max(50, zoom - 25))} className="h-5 w-5 border border-border/20 rounded-sm hover:bg-background/40 flex items-center justify-center transition-colors cursor-pointer" title="Zoom Out"><ZoomOut size={9} /></button>
                <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="h-5 w-5 border border-border/20 rounded-sm hover:bg-background/40 flex items-center justify-center transition-colors cursor-pointer" title="Zoom In"><ZoomIn size={9} /></button>
                <button onClick={() => setRotation((r) => (r + 90) % 360)} className="h-5 w-5 border border-border/20 rounded-sm hover:bg-background/40 flex items-center justify-center transition-colors cursor-pointer" title="Rotate"><RotateCw size={9} /></button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-grow overflow-auto p-6 flex items-center justify-center bg-background/10">
              <div className="transition-all duration-200 origin-center bg-background-panel border border-border/50 max-w-3xl w-full rounded-sm overflow-hidden shadow-lg" style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}>
                {contentLoading ? (
                  <div className="p-16 text-center space-y-3">
                    <Loader2 size={24} className="mx-auto text-accent animate-spin" />
                    <p className="text-[10px] text-foreground-subtle font-mono uppercase">DECRYPTING SECURE PAYLOAD...</p>
                  </div>
                ) : contentError ? (
                  <div className="p-16 text-center space-y-3">
                    <Info size={20} className="mx-auto text-foreground-subtle/40" />
                    <p className="text-xs text-foreground-subtle">Preview unavailable</p>
                    <button onClick={handleDownload} className="text-[10px] font-bold text-accent font-mono uppercase tracking-wider hover:underline cursor-pointer">Download instead</button>
                  </div>
                ) : isImage && content?.blobUrl ? (
                  <div className="flex items-center justify-center p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={content.blobUrl}
                      alt={file.name}
                      className="max-w-full max-h-[55vh] object-contain"
                    />
                  </div>
                ) : isText && textContent ? (
                  <pre className="p-5 text-[11px] font-mono text-foreground whitespace-pre-wrap break-all leading-relaxed max-h-[55vh] overflow-auto select-text">{textContent}</pre>
                ) : isVideo && content?.blobUrl ? (
                  <div className="flex items-center justify-center p-4">
                    <video
                      controls
                      className="max-w-full max-h-[55vh] rounded-sm shadow-lg"
                      src={content.blobUrl}
                    >
                      Your browser does not support video playback.
                    </video>
                  </div>
                ) : isAudio && content?.blobUrl ? (
                  <div className="flex items-center justify-center p-8">
                    <audio
                      controls
                      className="w-full max-w-md"
                      src={content.blobUrl}
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : isPDF ? (
                  <div className="flex items-center justify-center p-0 w-full h-full min-h-[55vh]">
                    <iframe
                      src={contentUrl}
                      className="w-full h-[55vh] border-0"
                      title={file.name}
                    />
                  </div>
                ) : isOfficeDoc ? (
                  <div className="flex flex-col items-center justify-center p-8 gap-4">
                    <File size={36} className="text-foreground-subtle/40 mx-auto" />
                    <p className="text-xs text-foreground text-center max-w-xs">
                      Preview not available for Office documents. Please download to view.
                    </p>
                    <button onClick={handleDownload} className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
                      <Download size={12} /> Download to View
                    </button>
                  </div>
                ) : (
                  <div className="p-10 text-center space-y-4">
                    <File size={40} className="mx-auto text-foreground-subtle/40" />
                    <h3 className="text-sm font-bold text-foreground">{file.name}</h3>
                    <p className="text-[10px] text-foreground-subtle font-mono">{file.size} &bull; {mimeType || "Unknown type"}</p>
                    <button onClick={handleDownload} className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-2">
                      <Download size={12} /> Download File
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="h-6 border-t border-border/10 bg-background-panel/30 px-3 flex items-center justify-between font-mono text-[8px] text-foreground-subtle select-none">
              <span>SECURE RENDERING ENVIRONMENT</span>
              <span>{mimeType || file.mimeType || "binary"}</span>
            </div>
          </div>

          {/* Metadata sidebar */}
          <aside className="w-full md:w-64 border-t md:border-t-0 md:border-l border-border/30 bg-background-panel p-4 flex flex-col justify-between shrink-0 font-mono text-[10px] leading-tight select-none">
            <div className="space-y-4">
              <div className="border-b border-border/20 pb-2">
                <span className="text-[9px] font-bold text-foreground-subtle uppercase tracking-widest block">Security</span>
                <span className={cn("inline-block mt-2 px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider uppercase border", file.classification === "RAHSIA" && "bg-destructive/15 text-destructive border-destructive/25", file.classification === "SULIT" && "bg-warning/15 text-warning border-warning/25", file.classification === "TERBUKA" && "bg-background-muted/40 text-foreground-subtle border-border/40")}>{file.classification}</span>
              </div>
              <div className="space-y-2.5">
                <div><span className="text-[8px] font-bold text-foreground-subtle uppercase block">Size</span><span className="text-foreground font-semibold">{file.size}</span></div>
                <div><span className="text-[8px] font-bold text-foreground-subtle uppercase block">Modified</span><span className="text-foreground flex items-center gap-1"><Clock size={10} />{file.modifiedAt}</span></div>
                <div><span className="text-[8px] font-bold text-foreground-subtle uppercase block">Location</span><span className="text-foreground flex items-center gap-1 truncate"><FolderOpen size={10} className="text-accent" />{file.parentId ? `Folder: ${file.parentId.slice(0, 8)}` : "Root"}</span></div>
                <div><span className="text-[8px] font-bold text-foreground-subtle uppercase block">Type</span><span className="text-foreground">{mimeType || "Unknown"}</span></div>
              </div>
            </div>
            {/* Lock state */}
            <div className="p-3 border border-border/20 rounded-sm bg-background/30 space-y-1.5 mt-4">
              <div className="flex items-center justify-between text-[8px] uppercase tracking-wider">
                <span className="text-foreground-subtle">Lock Status</span>
                <span className={cn("h-1.5 w-1.5 rounded-full", file.lockedBy ? "bg-accent" : "bg-success")} />
              </div>
              {file.lockedBy ? (
                <>
                  <p className="text-[9px] text-accent font-extrabold uppercase">Restricted</p>
                  <p className="text-[8px] text-foreground-subtle leading-tight">{file.lockReason || "Governance lock"}</p>
                </>
              ) : (
                <p className="text-[9px] text-success font-bold uppercase">Unlocked</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
