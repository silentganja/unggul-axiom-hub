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
    role                  VARCHAR(16)  NOT NULL DEFAULT 'staff'
                                       CHECK (role IN ('chief', 'director', 'officer', 'staff')),
    active                BOOLEAN      NOT NULL DEFAULT TRUE,
    storage_quota_bytes   BIGINT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
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
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    locked_by      UUID         REFERENCES users (id),
    locked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_files_parent_id  ON files (parent_id);
CREATE INDEX IF NOT EXISTS idx_files_owner_id   ON files (owner_id);
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files (deleted_at);

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
    UNIQUE (file_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares (file_id);
CREATE INDEX IF NOT EXISTS idx_file_shares_user_id ON file_shares (user_id);

-- ── Password Resets ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token       VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Magic Links ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS magic_links (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token       VARCHAR(128) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── WebAuthn Credentials ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    credential_id   TEXT         NOT NULL UNIQUE,
    public_key      TEXT         NOT NULL,
    sign_count      BIGINT       NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── System Configuration ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
    key         VARCHAR(128) PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_config (key, value) VALUES
    ('default_storage_quota_bytes', '107374182400'),
    ('jwt_expiry_hours', '8')
ON CONFLICT (key) DO NOTHING;

-- ── Favorites ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    file_id     UUID         NOT NULL REFERENCES files (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, file_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);

-- ── File Versions ──────────────────────────────────────────────
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

-- ── Migration records ─────────────────────────────────────────
INSERT INTO _migrations (version, description)
VALUES
    ('0001', 'Core extensions — uuid-ossp + pgcrypto'),
    ('0002', 'File sharing — file_shares table'),
    ('0003', 'Soft-delete support — deleted_at column on files'),
    ('0004', 'Governance workflow — approval requests + file locking'),
    ('0005', 'Auth extras — password_resets, magic_links, webauthn_credentials'),
    ('0006', 'Role hierarchy — chief/director/officer/staff'),
    ('0007', 'Admin Tier 1 — user active flag'),
    ('0008', 'Admin Tier 2 — system configuration'),
    ('0009', 'Server-side favorites table'),
    ('0010', 'File versioning system'),
    ('0011', 'Governance requests table'),
    ('0012', 'Per-user storage quota')
ON CONFLICT (version) DO NOTHING;
