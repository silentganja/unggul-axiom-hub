-- ============================================================
-- Unggul Axiom Hub — Migration 002
-- Phase 10: File Sharing — file_shares table
-- ============================================================

-- ── File Shares ───────────────────────────────────────────────
-- Tracks which users have been granted access to files owned by
-- other users. Supports viewer/editor roles.
CREATE TABLE IF NOT EXISTS file_shares (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id     UUID         NOT NULL REFERENCES files (id) ON DELETE CASCADE,
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role        VARCHAR(16)  NOT NULL DEFAULT 'viewer'
                             CHECK (role IN ('owner', 'editor', 'viewer')),
    shared_by   UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Each user can only have one share entry per file
    UNIQUE (file_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares (file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_user_id ON file_shares (user_id);

-- ── Migration Record ─────────────────────────────────────────
INSERT INTO _migrations (version, description)
VALUES ('0002', 'Phase 10: File sharing — file_shares table')
ON CONFLICT (version) DO NOTHING;
