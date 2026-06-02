"use client";

import { Database } from "lucide-react";

export default function InfoDatabasePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <Database size={10} /> SECTION 5.0 : DATABASE SCHEMA
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-serif">
          PostgreSQL Database Models
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The persistence structure maps folders recursively, checks clearance levels natively via checks, and logs audit events securely. Review the core relational DDL schema below.
        </p>
      </div>

      {/* Database Schema Code Blocks */}
      <div className="space-y-4 font-mono text-[9px]">
        {/* Users & Files */}
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <span className="block font-bold text-foreground">1. Users &amp; Files Tables DDL</span>
          <pre className="p-3 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all">
{`CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('staff', 'officer', 'director', 'chief')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('file', 'folder')),
    parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    classification VARCHAR(20) NOT NULL CHECK (classification IN ('TERBUKA', 'TERHAD', 'SULIT', 'RAHSIA')),
    locked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    locked_at TIMESTAMP WITH TIME ZONE,
    lock_reason VARCHAR(255),
    size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);`}
          </pre>
        </div>

        {/* Shares & Governance Requests */}
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <span className="block font-bold text-foreground">2. Shares &amp; Governance Queue DDL</span>
          <pre className="p-3 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all">
{`CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    shared_with UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('viewer', 'editor', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(file_id, shared_with)
);

CREATE TABLE governance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(30) NOT NULL CHECK (type IN (
        'FILE_LOCK', 'FILE_UNLOCK', 
        'CLASSIFICATION_UPGRADE', 'CLASSIFICATION_DOWNGRADE', 
        'FILE_MOVE', 'FILE_DELETE'
    )),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    target_file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    metadata JSONB,
    review_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
          </pre>
        </div>

        {/* Audit Logs */}
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <span className="block font-bold text-foreground">3. Compliance Audit Ledger DDL</span>
          <pre className="p-3 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all">
{`CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_id VARCHAR(255),
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

/* Optimize audit search retrieval by indexing frequently filtered fields */
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);`}
          </pre>
        </div>
      </div>
    </div>
  );
}
