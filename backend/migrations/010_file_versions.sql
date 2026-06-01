-- ============================================================
-- Unggul Axiom Hub — Migration 010
-- File versioning system
-- ============================================================

CREATE TABLE IF NOT EXISTS file_versions (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id         UUID         NOT NULL REFERENCES files (id) ON DELETE CASCADE,
    version_number  INTEGER      NOT NULL,
    size_bytes      BIGINT       NOT NULL DEFAULT 0,
    storage_path    VARCHAR(1024) NOT NULL,
    uploaded_by     UUID         REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (file_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions (file_id);
CREATE INDEX IF NOT EXISTS idx_file_versions_created ON file_versions (created_at DESC);

INSERT INTO _migrations (version, description)
VALUES ('0010', 'File versioning system')
ON CONFLICT (version) DO NOTHING;
