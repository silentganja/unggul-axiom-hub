"use client";

import { useState } from "react";
import { BookOpen, Globe, Code, Shield, Terminal, ArrowRight, Clipboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  auth: string;
  description: string;
  params: { name: string; type: string; req: boolean; desc: string }[];
  requestBody?: string;
  responseBody: string;
}

export default function InfoApiReferencePage() {
  const [activeRouteIdx, setActiveRouteIdx] = useState(0);

  const endpoints: APIEndpoint[] = [
    {
      method: "GET",
      path: "/api/auth/webauthn/login/begin",
      auth: "Public",
      description: "Generates a cryptographically secure 32 byte challenge stored in Redis for passkey authentication.",
      params: [],
      responseBody: `{
  "challenge": "F8x7A29M_8b1...",
  "rpId": "localhost",
  "sessionId": "session_id_hex"
}`
    },
    {
      method: "POST",
      path: "/api/auth/webauthn/login/complete",
      auth: "Public",
      description: "Verifies the WebAuthn cryptographic signature assertion and issues a secure JWT cookie.",
      params: [],
      requestBody: `{
  "id": "credential_id_here",
  "sessionId": "session_id_hex",
  "response": {
    "clientDataJSON": "eyJjaGFsbGVuZ2UiOiJGOHg3QTI5..."
  }
}`,
      responseBody: `{
  "token": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}`
    },
    {
      method: "POST",
      path: "/api/files/upload",
      auth: "JWT Token (Bearer)",
      description: "Uploads a document. The backend handles AES-256-GCM file body encryption and database metadata storage.",
      params: [
        { name: "file", type: "Multipart File", req: true, desc: "The raw document binary stream to encrypt." },
        { name: "parent_id", type: "Multipart Field", req: true, desc: "The UUID identifier of the parent folder." },
        { name: "classification", type: "Multipart Field", req: true, desc: "Desired classification target: TERBUKA, TERHAD, SULIT, or RAHSIA." }
      ],
      requestBody: "/* Multipart Form Data payload */\n--boundary\nContent-Disposition: form-data; name=\"file\"; filename=\"Q3.xlsx\"\n...\n--boundary\nContent-Disposition: form-data; name=\"parent_id\"\n\nfold-101-uuid\n--boundary\nContent-Disposition: form-data; name=\"classification\"\n\nSULIT",
      responseBody: `{
  "id": "file-889-uuid",
  "name": "Q3_Budget.xlsx",
  "size_bytes": 409600,
  "classification": "SULIT",
  "parent_id": "fold-101-uuid",
  "owner_id": "usr-2f9c-7721"
}`
    },
    {
      method: "POST",
      path: "/api/governance/requests",
      auth: "JWT Token (Bearer)",
      description: "Submits a classification modification request. Restricts upgrades and downgrades to supervisor verification loops.",
      params: [],
      requestBody: `{
  "type": "CLASSIFICATION_UPGRADE",
  "title": "Restrict Q3 Budget Access",
  "target_file_id": "file-889-uuid",
  "metadata": {
    "target_clearance": "RAHSIA",
    "reason": "Board review target confirmed"
  }
}`,
      responseBody: `{
  "id": "req-552-uuid",
  "type": "CLASSIFICATION_UPGRADE",
  "status": "PENDING",
  "requested_by": "usr-2f9c-7721",
  "target_file_id": "file-889-uuid"
}`
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <BookOpen size={12} /> SECTION 11.0 : API SPECIFICATION
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          API Catalog &amp; REST Specifications
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          The backend exposes a highly structured REST interface. All requests require JSON payloads unless handling binary uploads, and utilize standard status codes to indicate operation results.
        </p>
      </div>

      {/* Interactive API Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-border/30 rounded-lg bg-background-panel/20 overflow-hidden shadow-lg min-h-[460px]">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-4 bg-background-panel/40 border-b lg:border-b-0 lg:border-r border-border/20 p-5 space-y-4 flex flex-col justify-between select-none">
          <div className="space-y-3">
            <span className="font-mono text-[9px] font-bold tracking-widest text-foreground-subtle uppercase block border-b border-border/10 pb-1">
              API Endpoints
            </span>
            <div className="space-y-1">
              {endpoints.map((ep, idx) => (
                <button
                  key={ep.path}
                  onClick={() => setActiveRouteIdx(idx)}
                  className={cn(
                    "w-full flex items-center gap-2.5 p-3 rounded text-left font-mono text-xs transition-all cursor-pointer border",
                    activeRouteIdx === idx
                      ? "bg-accent/15 border-accent/40 text-accent font-bold"
                      : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/40"
                  )}
                >
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-wider w-10 text-center shrink-0 border",
                      ep.method === "GET"
                        ? "bg-success/15 border-success/30 text-success"
                        : "bg-info/15 border-info/30 text-info"
                    )}
                  >
                    {ep.method}
                  </span>
                  <span className="truncate text-[10px]">{ep.path}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded border border-border/15 bg-background-panel/20 space-y-1 text-[10px] font-mono text-foreground-subtle">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <Globe size={11} className="text-accent" />
              <span>Base URL Settings</span>
            </div>
            <p className="leading-relaxed">
              Production Gateway: <code className="text-foreground">https://hub.unggulaxiom.com/api</code>
            </p>
          </div>
        </div>

        {/* Details and JSON panel */}
        <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between gap-6 min-w-0 bg-background/10">
          <div className="space-y-5 animate-in fade-in duration-200" key={activeRouteIdx}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/10 pb-3">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider border",
                    endpoints[activeRouteIdx].method === "GET"
                      ? "bg-success/15 border-success/30 text-success"
                      : "bg-info/15 border-info/30 text-info"
                  )}
                >
                  {endpoints[activeRouteIdx].method}
                </span>
                <span className="text-foreground font-bold tracking-tight">{endpoints[activeRouteIdx].path}</span>
              </div>
              <span className="font-mono text-[9px] font-bold text-foreground-subtle border border-border px-2.5 py-0.5 rounded uppercase self-start">
                Security : {endpoints[activeRouteIdx].auth}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-foreground-muted font-sans leading-relaxed">
              {endpoints[activeRouteIdx].description}
            </p>

            {/* Parameters Table */}
            {endpoints[activeRouteIdx].params.length > 0 && (
              <div className="space-y-2">
                <span className="font-mono text-[9px] font-bold text-accent uppercase tracking-wider block">
                  Parameters List
                </span>
                <div className="border border-border/20 rounded overflow-hidden">
                  <table className="w-full text-left font-mono text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-background-panel/60 border-b border-border/10 text-foreground-subtle select-none text-[8px] uppercase tracking-wider">
                        <th className="p-2">Name</th>
                        <th className="p-2">Type</th>
                        <th className="p-2 text-center">Required</th>
                        <th className="p-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/5 text-[11px] font-sans">
                      {endpoints[activeRouteIdx].params.map((p) => (
                        <tr key={p.name} className="hover:bg-background-panel/10">
                          <td className="p-2 font-mono text-foreground font-bold">{p.name}</td>
                          <td className="p-2 text-foreground-subtle font-mono text-[10px]">{p.type}</td>
                          <td className="p-2 text-center">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                              p.req ? "bg-destructive/15 text-destructive" : "bg-foreground-subtle/20 text-foreground-subtle"
                            )}>
                              {p.req ? "Yes" : "No"}
                            </span>
                          </td>
                          <td className="p-2 text-foreground-muted text-[11px] leading-relaxed">{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Code payloads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {endpoints[activeRouteIdx].requestBody && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-accent uppercase tracking-wider">
                    Request Payload Example
                  </span>
                  <pre className="p-3 rounded border border-border/25 bg-background/80 font-mono text-[10px] leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all shadow-inner h-[180px]">
                    {endpoints[activeRouteIdx].requestBody}
                  </pre>
                </div>
              )}
              
              <div className={cn(
                "space-y-1.5",
                !endpoints[activeRouteIdx].requestBody && "col-span-2"
              )}>
                <span className="flex items-center gap-1 font-mono text-[9px] font-bold text-accent uppercase tracking-wider">
                  Success Response (200 OK)
                </span>
                <pre className="p-3 rounded border border-border/25 bg-background/80 font-mono text-[10px] leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all shadow-inner h-[180px]">
                  {endpoints[activeRouteIdx].responseBody}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Design Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-sans">
        <div className="border border-border/20 rounded-lg bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-accent" />
            <h4 className="font-serif font-bold text-base text-foreground">Standardized Status Responses</h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            All API paths conform to strict status code specifications: 200 OK/201 Created for successes, 401 Unauthorized for invalid JWT/WebAuthn sessions, and 429 Too Many Requests in case rate limits are triggered.
          </p>
        </div>

        <div className="border border-border/20 rounded-lg bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-accent" />
            <h4 className="font-serif font-bold text-base text-foreground">Secure Token Authn</h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            Requests targeting file structures or governance actions pass through interceptor filters. Sessions verify signature authenticity against keys and session tables, preventing user token reuse loops.
          </p>
        </div>
      </div>
    </div>
  );
}
