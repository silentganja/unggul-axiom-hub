// ─────────────────────────────────────────────────────────────────────────────
// Auto-migration runner — applies idempotent schema migrations on every startup.
//
// Uses version numbers in the 9000+ range to avoid conflicts with any existing
// _migrations records that may have been created by an older init.sql.
// All statements use IF NOT EXISTS / IF EXISTS to be safely re-runnable.
// ─────────────────────────────────────────────────────────────────────────────

use sqlx::PgPool;
use tracing::info;

/// Run all pending migrations in order. Each statement is idempotent.
/// Records applied migrations in the `_migrations` table.
pub async fn run_migrations(pool: &PgPool) {
    // Ensure _migrations table exists first (can't track without it)
    let _ = sqlx::query(
        "CREATE TABLE IF NOT EXISTS _migrations (
            id          SERIAL PRIMARY KEY,
            version     VARCHAR(64)  NOT NULL UNIQUE,
            description TEXT         NOT NULL,
            applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )",
    )
    .execute(pool)
    .await;

    // ── Migration definitions ──────────────────────────────────────────────────
    // Using 9000+ versions to avoid conflicts with any pre-existing records.
    let migrations: Vec<(&str, &str, Vec<&str>)> = vec![
        // 9001 — Core extensions
        (
            "9001",
            "Auto: Core extensions",
            vec![
                "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"",
                "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"",
            ],
        ),
        // 9002 — File shares table
        (
            "9002",
            "Auto: File sharing — file_shares table",
            vec![
                "CREATE TABLE IF NOT EXISTS file_shares (
                    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                    file_id     UUID         NOT NULL REFERENCES files (id) ON DELETE CASCADE,
                    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    role        VARCHAR(16)  NOT NULL DEFAULT 'viewer'
                                             CHECK (role IN ('owner', 'editor', 'viewer')),
                    shared_by   UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                    UNIQUE (file_id, user_id)
                )",
                "CREATE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares (file_id)",
                "CREATE INDEX IF NOT EXISTS idx_file_shares_user_id ON file_shares (user_id)",
            ],
        ),
        // 9003 — Soft-delete column on files
        (
            "9003",
            "Auto: Soft-delete — deleted_at on files",
            vec![
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
                "CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files (deleted_at)",
            ],
        ),
        // 9004 — Governance + file locking columns
        (
            "9004",
            "Auto: Governance + file locking columns",
            vec![
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS locked_by UUID",
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ",
            ],
        ),
        // 9005 — Auth extras tables
        (
            "9005",
            "Auto: Auth extras — password_resets, magic_links, webauthn_credentials",
            vec![
                "CREATE TABLE IF NOT EXISTS password_resets (
                    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    token       VARCHAR(128) NOT NULL UNIQUE,
                    expires_at  TIMESTAMPTZ  NOT NULL,
                    used        BOOLEAN      NOT NULL DEFAULT FALSE,
                    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                )",
                "CREATE TABLE IF NOT EXISTS magic_links (
                    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    token       VARCHAR(128) NOT NULL UNIQUE,
                    expires_at  TIMESTAMPTZ  NOT NULL,
                    used        BOOLEAN      NOT NULL DEFAULT FALSE,
                    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                )",
                "CREATE TABLE IF NOT EXISTS webauthn_credentials (
                    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id         UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    credential_id   TEXT         NOT NULL UNIQUE,
                    public_key      TEXT         NOT NULL,
                    sign_count      BIGINT       NOT NULL DEFAULT 0,
                    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                )",
            ],
        ),
        // 9006 — Role hierarchy
        (
            "9006",
            "Auto: Role hierarchy — chief/director/officer/staff",
            vec![
                "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check",
                "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('chief', 'director', 'officer', 'staff'))",
            ],
        ),
        // 9007 — Active flag on users
        (
            "9007",
            "Auto: Active flag on users",
            vec![
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE",
            ],
        ),
        // 9008 — System config
        (
            "9008",
            "Auto: System configuration table",
            vec![
                "CREATE TABLE IF NOT EXISTS system_config (
                    key         VARCHAR(128) PRIMARY KEY,
                    value       TEXT NOT NULL,
                    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )",
                "INSERT INTO system_config (key, value) VALUES
                    ('default_storage_quota_bytes', '107374182400'),
                    ('jwt_expiry_hours', '8'),
                    ('allowed_classifications', 'RAHSIA,SULIT,TERHAD,TERBUKA')
                ON CONFLICT (key) DO NOTHING",
            ],
        ),
        // 9009 — Server-side favorites
        (
            "9009",
            "Auto: Favorites table",
            vec![
                "CREATE TABLE IF NOT EXISTS favorites (
                    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    file_id     UUID NOT NULL REFERENCES files (id) ON DELETE CASCADE,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (user_id, file_id)
                )",
                "CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id)",
            ],
        ),
        // 9010 — File versioning
        (
            "9010",
            "Auto: File versioning table",
            vec![
                "CREATE TABLE IF NOT EXISTS file_versions (
                    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    file_id         UUID NOT NULL REFERENCES files (id) ON DELETE CASCADE,
                    version_number  INTEGER NOT NULL,
                    size_bytes      BIGINT NOT NULL DEFAULT 0,
                    storage_path    VARCHAR(1024) NOT NULL,
                    uploaded_by     UUID REFERENCES users (id) ON DELETE SET NULL,
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (file_id, version_number)
                )",
                "CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions (file_id)",
                "CREATE INDEX IF NOT EXISTS idx_file_versions_created ON file_versions (created_at DESC)",
            ],
        ),
        // 9011 — Governance requests table
        (
            "9011",
            "Auto: Governance requests table",
            vec![
                "CREATE TABLE IF NOT EXISTS governance_requests (
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
                )",
                "CREATE INDEX IF NOT EXISTS idx_gov_requests_status ON governance_requests (status)",
                "CREATE INDEX IF NOT EXISTS idx_gov_requests_file ON governance_requests (target_file_id)",
            ],
        ),
        // 9013 — Per-user storage quota
        (
            "9013",
            "Auto: Per-user storage quota",
            vec![
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT",
            ],
        ),
        // 9014 — Soft-delete TTL cleanup (runtime enforcement in cleanup.rs)
        (
            "9014",
            "Auto: Soft-delete TTL — expired trash cleanup policy (30-day retention)",
            vec!["SELECT 1 AS migration_documentation"],
        ),
        // 9015 — Full-text search via tsvector on files.name
        (
            "9015",
            "Auto: Full-text search — tsvector column + GIN index on files",
            vec![
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS search_vector tsvector",
                "CREATE INDEX IF NOT EXISTS idx_files_search_vector ON files USING GIN (search_vector)",
                // Backfill existing rows
                "UPDATE files SET search_vector = to_tsvector('english', COALESCE(name, '')) WHERE search_vector IS NULL",
            ],
        ),
        // 9016 — Governance review_note column
        (
            "9016",
            "Auto: Governance — review_note column on governance_requests",
            vec![
                "ALTER TABLE governance_requests ADD COLUMN IF NOT EXISTS review_note TEXT",
            ],
        ),
        // 9017 — lock_reason column on files
        (
            "9017",
            "Auto: Files — lock_reason column",
            vec![
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS lock_reason TEXT",
            ],
        ),
        // 9012 — Audit logs table
        (
            "9012",
            "Auto: Audit logs table",
            vec![
                "CREATE TABLE IF NOT EXISTS audit_logs (
                    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id         UUID        REFERENCES users (id) ON DELETE SET NULL,
                    action          VARCHAR(64) NOT NULL,
                    target_resource VARCHAR(512),
                    ip_address      VARCHAR(45),
                    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )",
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id)",
                "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC)",
            ],
        ),
    ];

    for (version, description, statements) in &migrations {
        // Check if this migration was already applied
        let already_applied: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM _migrations WHERE version = $1)")
                .bind(version)
                .fetch_one(pool)
                .await
                .unwrap_or(false);

        if already_applied {
            continue;
        }

        // Run each SQL statement in the migration
        let mut all_ok = true;
        for stmt in statements {
            match sqlx::query(stmt).execute(pool).await {
                Ok(_) => {}
                Err(e) => {
                    tracing::error!(
                        version = %version,
                        statement = %stmt,
                        error = %e,
                        "Migration statement failed"
                    );
                    all_ok = false;
                }
            }
        }

        // Record the migration
        if all_ok {
            let _ = sqlx::query(
                "INSERT INTO _migrations (version, description) VALUES ($1, $2)
                 ON CONFLICT (version) DO NOTHING",
            )
            .bind(version)
            .bind(description)
            .execute(pool)
            .await;

            info!(
                version = %version,
                description = %description,
                "Auto-migration applied"
            );
        }
    }

    info!("Auto-migration check complete");
}
