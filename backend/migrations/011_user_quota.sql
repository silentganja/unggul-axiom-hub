-- ============================================================
-- Unggul Axiom Hub — Migration 011
-- Per-user storage quota
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT;

INSERT INTO _migrations (version, description)
VALUES ('0011', 'Per-user storage quota')
ON CONFLICT (version) DO NOTHING;
