-- ============================================================
-- Unggul Axiom Hub — Migration 008
-- Admin Tier 2: system_config table
-- ============================================================

CREATE TABLE IF NOT EXISTS system_config (
    key         VARCHAR(128) PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Defaults
INSERT INTO system_config (key, value) VALUES
    ('default_storage_quota_bytes', '107374182400'),
    ('jwt_expiry_hours', '8')
ON CONFLICT (key) DO NOTHING;

INSERT INTO _migrations (version, description)
VALUES ('0008', 'Admin Tier 2 — system_config table')
ON CONFLICT (version) DO NOTHING;
