"use client";

import { Code, Fingerprint, Layers, Sparkles } from "lucide-react";

export default function InfoFeaturesPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Code size={10} /> SECTION 3.0 — CORE FEATURES &amp; CODE
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          Technical Implementations &amp; Features
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          A deep dive into three engineering challenges implemented in the Strategic Hub: Passwordless Biometrics, Database Transaction Safety, and State Management.
        </p>
      </div>

      {/* Feature 1: WebAuthn */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Fingerprint size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            1. WebAuthn Biometrics (Passkeys)
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          The hub integrates native browser WebAuthn credentials to allow passwordless logging via Fingerprint Reader or Face ID. 
        </p>

        <div className="space-y-2 font-mono text-[9px] text-foreground-subtle">
          <span className="block font-bold text-foreground">Authentication Challenge Handshake:</span>
          <pre className="p-3 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all">
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
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            2. Transactional Database Safety in Rust
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          When an administrator approves a batch of file governance requests (like locking or classification changes), operations must be atomic. The Rust backend uses SQLx transaction rollbacks to prevent partial successes.
        </p>

        <div className="space-y-2 font-mono text-[9px] text-foreground-subtle">
          <span className="block font-bold text-foreground">Backend Transaction Flow:</span>
          <pre className="p-3 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all">
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

      {/* Feature 3: Zustand State Management */}
      <div className="border border-border/30 rounded bg-background-panel/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
            3. Optimized Client State (Zustand)
          </h3>
        </div>
        <p className="text-xs text-foreground-subtle leading-relaxed font-sans">
          Instead of heavy React Context layouts triggering global re-renders, the web client uses Zustand stores to coordinate dynamic file sorting, navigation pathways, search queries, and notification updates, keeping interface response times under **15ms**.
        </p>
      </div>
    </div>
  );
}
