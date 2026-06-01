-- ============================================================
-- Unggul Axiom Hub — Migration 004
-- Governance workflow — approval requests + file locking
-- ============================================================

-- ── Governance Requests ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS governance_requests (
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
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gov_requests_status ON governance_requests (status);
CREATE INDEX IF NOT EXISTS idx_gov_requests_file   ON governance_requests (target_file_id);

-- ── File Locking Columns ──────────────────────────────────────
ALTER TABLE files ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES users (id);
ALTER TABLE files ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- ── Migration Record ─────────────────────────────────────────
INSERT INTO _migrations (version, description)
VALUES ('0004', 'Governance workflow — approval requests + file locking')
ON CONFLICT (version) DO NOTHING;
