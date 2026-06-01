-- ============================================================
-- Unggul Axiom Hub — Migration 007
-- Admin Tier 1: user active flag
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

INSERT INTO _migrations (version, description)
VALUES ('0007', 'Admin Tier 1 — user active flag')
ON CONFLICT (version) DO NOTHING;
