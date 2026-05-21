-- ============================================================
-- Unggul Axiom Hub — PostgreSQL Initialisation
-- Phase 7: Core schema — users, files, audit_logs
-- This file is auto-executed by Docker on first container boot.
-- All statements are idempotent (IF NOT EXISTS / ON CONFLICT).
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Migration tracking table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS _migrations (
    id          SERIAL PRIMARY KEY,
    version     VARCHAR(64)  NOT NULL UNIQUE,
    description TEXT         NOT NULL,
    applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Users ────────────────────────────────────────────────────
-- Stores authenticated principals.
-- Roles: 'admin' | 'staff'
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(512) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(16)  NOT NULL DEFAULT 'staff'
                               CHECK (role IN ('admin', 'staff')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── Files (Tree Structure) ───────────────────────────────────
-- Supports both files and folders via is_folder.
-- parent_id IS NULL for root-level entries.
-- classification aligns with Malaysian Government security tiers.
CREATE TABLE IF NOT EXISTS files (
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
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_parent_id ON files (parent_id);
CREATE INDEX IF NOT EXISTS idx_files_owner_id  ON files (owner_id);

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_files_updated_at ON files;
CREATE TRIGGER trg_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── Audit Logs ───────────────────────────────────────────────
-- Immutable append-only event log. No UPDATE/DELETE by convention.
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        REFERENCES users (id) ON DELETE SET NULL,
    action          VARCHAR(64) NOT NULL,
    target_resource VARCHAR(512),
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ── Migration records ─────────────────────────────────────────
INSERT INTO _migrations (version, description)
VALUES
    ('0001', 'Phase 1: Initial schema — extensions and migration table'),
    ('0002', 'Phase 7: Core schema — users, files, audit_logs')
ON CONFLICT (version) DO NOTHING;
