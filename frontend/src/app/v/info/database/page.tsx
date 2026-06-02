"use client";

import { Database } from "lucide-react";

export default function InfoDatabasePage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Database size={12} /> SECTION 5.0 : DATABASE SCHEMA
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          PostgreSQL Database Models
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          The persistence structure maps folders recursively, checks clearance levels natively via checks, and logs audit events securely. Review the core relational DDL schema below.
        </p>
      </div>

      {/* Database Schema Code Blocks */}
      <div className="space-y-6 font-mono text-xs sm:text-sm">
        {/* Users & Files */}
        <div className="border border-border/30 rounded-lg bg-background-panel/40 p-5 space-y-3 shadow-sm hover:border-border/60 transition-all duration-300">
          <span className="block font-bold text-foreground text-sm sm:text-base font-sans border-b border-border/20 pb-1.5">1. Users &amp; Files Tables DDL</span>
          <pre className="p-4 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all shadow-inner text-[10px] sm:text-xs">
{`CREATE TABLE users (
    id                  UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email               VARCHAR(320) NOT NULL UNIQUE,
    password_hash       VARCHAR(512) NOT NULL,
    full_name           VARCHAR(255) NOT NULL,
    role                VARCHAR(16)  NOT NULL DEFAULT 'staff'
                                     CHECK (role IN ('chief', 'director', 'officer', 'staff')),
    active              BOOLEAN      NOT NULL DEFAULT TRUE,
    storage_quota_bytes BIGINT,
    avatar_data         TEXT,
    department          VARCHAR(255),
    supervisor_id       UUID         REFERENCES users(id),
    notification_prefs  JSONB        DEFAULT '{}',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE files (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id      UUID         REFERENCES files (id) ON DELETE CASCADE,
    owner_id       UUID         NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    name           VARCHAR(512) NOT NULL,
    is_folder      BOOLEAN      NOT NULL DEFAULT FALSE,
    size_bytes     BIGINT       NOT NULL DEFAULT 0,
    mime_type      VARCHAR(255),
    classification VARCHAR(16)  NOT NULL DEFAULT 'TERBUKA'
                                CHECK (classification IN ('RAHSIA', 'SULIT', 'TERHAD', 'TERBUKA')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    locked_by      UUID,
    locked_at      TIMESTAMPTZ,
    lock_reason    TEXT,
    search_vector  tsvector
);`}
          </pre>
        </div>

        {/* Shares & Governance Requests */}
        <div className="border border-border/30 rounded-lg bg-background-panel/40 p-5 space-y-3 shadow-sm hover:border-border/60 transition-all duration-300">
          <span className="block font-bold text-foreground text-sm sm:text-base font-sans border-b border-border/20 pb-1.5">2. Shares &amp; Governance Queue DDL</span>
          <pre className="p-4 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all shadow-inner text-[10px] sm:text-xs">
{`CREATE TABLE file_shares (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id     UUID         NOT NULL REFERENCES files (id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role        VARCHAR(16)  NOT NULL DEFAULT 'viewer'
                             CHECK (role IN ('owner', 'editor', 'viewer')),
    shared_by   UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (file_id, user_id)
);

CREATE TABLE governance_requests (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            VARCHAR(32)  NOT NULL CHECK (type IN (
                                     'FILE_LOCK', 'FILE_UNLOCK',
                                     'CLASSIFICATION_UPGRADE', 'CLASSIFICATION_DOWNGRADE'
                                 )),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING'
                                 CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_by    UUID         NOT NULL REFERENCES users (id),
    reviewed_by     UUID         REFERENCES users (id),
    target_file_id  UUID         REFERENCES files (id) ON DELETE SET NULL,
    metadata        JSONB,
    review_note     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);`}
          </pre>
        </div>

        {/* Audit Logs */}
        <div className="border border-border/30 rounded-lg bg-background-panel/40 p-5 space-y-3 shadow-sm hover:border-border/60 transition-all duration-300">
          <span className="block font-bold text-foreground text-sm sm:text-base font-sans border-b border-border/20 pb-1.5">3. Compliance Audit Ledger DDL</span>
          <pre className="p-4 rounded border border-border/20 bg-background/80 leading-relaxed overflow-x-auto whitespace-pre select-all shadow-inner text-[10px] sm:text-xs">
{`CREATE TABLE audit_logs (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        REFERENCES users (id) ON DELETE SET NULL,
    action          VARCHAR(64) NOT NULL,
    target_resource VARCHAR(512),
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* Optimize audit search retrieval by indexing frequently filtered fields */
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);`}
          </pre>
        </div>
      </div>
    </div>
  );
}
