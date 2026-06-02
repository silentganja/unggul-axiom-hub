"use client";

import { Code, Fingerprint, Layers, Sparkles } from "lucide-react";

export default function InfoFeaturesPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Code size={12} /> SECTION 3.0 : CORE FEATURES AND CODE
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Technical Implementations &amp; Features
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          A deep dive into three engineering challenges implemented in the Strategic Hub: Passwordless Biometrics, Database Transaction Safety, and State Management.
        </p>
      </div>

      {/* Feature 1: WebAuthn */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm hover:border-border/60 transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center">
            <Fingerprint className="text-accent" size={16} />
          </div>
          <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest">
            1. WebAuthn Biometrics (Passkeys)
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed font-sans">
          The hub integrates native browser WebAuthn credentials to allow passwordless logging via Fingerprint Reader or Face ID. 
        </p>

        <div className="space-y-3 font-mono text-[10px] sm:text-[11px] text-foreground-subtle">
          <span className="block font-bold text-foreground">Authentication Challenge Handshake:</span>
          <pre className="p-4 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all shadow-inner">
{`// 1. Client requests a WebAuthn login challenge
POST /api/webauthn/login/start
Response: 200 OK
{
  "publicKey": {
    "challenge": "8F_3x7A9...",
    "timeout": 60000,
    "rpId": "hub.unggulaxiom.com",
    "allowCredentials": [{ "type": "public-key", "id": "cre-901..." }],
    "userVerification": "required"
  }
}

// 2. Client triggers navigator.credentials.get() and sends assertion back
POST /api/webauthn/login/finish
Request payload: { "id": "cre-901", "rawId": "...", "response": { "authenticatorData": "...", "clientDataJSON": "...", "signature": "..." } }
Response: 200 OK (returns Session JWT token)`}
          </pre>
        </div>
      </div>

      {/* Feature 2: Transaction Safety */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm hover:border-border/60 transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center">
            <Layers className="text-accent" size={16} />
          </div>
          <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest">
            2. Transactional Database Safety in Rust
          </h3>
        </div>
        <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed font-sans">
          When an administrator approves a batch of file governance requests (like locking or classification changes), operations must be atomic. The Rust backend uses SQLx transaction rollbacks to prevent partial successes.
        </p>

        <div className="space-y-3 font-mono text-[10px] sm:text-[11px] text-foreground-subtle">
          <span className="block font-bold text-foreground">Backend Transaction Flow:</span>
          <pre className="p-4 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all shadow-inner">
{`// Rust implementation using sqlx transaction block
let mut tx = pool.begin().await?;

for request_id in &body.ids {
    // 1. Lock the request row
    let req: Request = sqlx::query_as("SELECT * FROM governance_requests WHERE id = $1 FOR UPDATE")
        .bind(request_id)
        .fetch_one(&mut *tx).await?;

    // 2. Apply target changes (e.g. update files table)
    sqlx::query("UPDATE files SET classification = $1 WHERE id = $2")
        .bind(req.metadata.new_classification)
        .bind(req.target_file_id)
        .execute(&mut *tx).await?;

    // 3. Mark request as APPROVED
    sqlx::query("UPDATE governance_requests SET status = 'APPROVED' WHERE id = $1")
        .bind(request_id)
        .execute(&mut *tx).await?;
}

// 4. Commit all updates atomically
tx.commit().await?;`}
          </pre>
        </div>
      </div>

      {/* Feature 3: File Explorer Architecture */}
      <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-4 shadow-sm hover:border-border/60 transition-all duration-300">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center">
            <Sparkles className="text-accent" size={16} />
          </div>
          <h3 className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest">
            3. File Explorer &amp; Directory Tree Navigation
          </h3>
        </div>
        <div className="space-y-4 text-xs sm:text-sm font-sans text-foreground-subtle leading-relaxed">
          <p className="text-foreground-muted">
            To prevent performance degradation on accounts with thousands of assets, the File Explorer utilizes single-level queries instead of recursive tree traversals:
          </p>
          <ul className="list-disc pl-5 space-y-2.5">
            <li>
              <strong>Virtual Folder Queries:</strong> When a user navigates to a folder, the client dispatches a request specifying the parent folder ID. The backend queries PostgreSQL matching the `parent_id` column, returning child folders and files in a flat array list.
            </li>
            <li>
              <strong>Reactive Tree State:</strong> Zustand stores handle sorting (by name, date, size) and filtering dynamically in the client-side cache. This eliminates latency caused by triggering repeated database queries during sorting.
            </li>
            <li>
              <strong>Governance Side-Effects:</strong> Once a supervisor approves a request, the backend updates the matching metadata fields. Moving a file updates its `parent_id` reference, locking a file sets the `locked_by` user UUID constraint, and soft-deletes mark `deleted_at` to send the document to the Trash view.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
