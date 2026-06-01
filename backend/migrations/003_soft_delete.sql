-- ============================================================
-- Unggul Axiom Hub — Migration 003
-- Soft-delete support for files (Trash Repository)
-- ============================================================

ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files (deleted_at);

-- Existing DELETE endpoint will now soft-delete (set deleted_at = NOW())
-- Files with deleted_at IS NULL are "active"
-- Files with deleted_at IS NOT NULL are "trashed"

-- Migration Record
INSERT INTO _migrations (version, description)
VALUES ('0003', 'Soft-delete support — deleted_at column on files')
ON CONFLICT (version) DO NOTHING;
