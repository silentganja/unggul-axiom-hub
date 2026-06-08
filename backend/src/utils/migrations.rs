// ─────────────────────────────────────────────────────────────────────────────
// Auto-migration runner - applies idempotent schema migrations on every startup.
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
        // 9001 - Core extensions
        (
            "9001",
            "Auto: Core extensions",
            vec![
                "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"",
                "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\"",
            ],
        ),
        // 9002 - File shares table
        (
            "9002",
            "Auto: File sharing - file_shares table",
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
        // 9003 - Soft-delete column on files
        (
            "9003",
            "Auto: Soft-delete - deleted_at on files",
            vec![
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
                "CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files (deleted_at)",
            ],
        ),
        // 9004 - Governance + file locking columns
        (
            "9004",
            "Auto: Governance + file locking columns",
            vec![
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS locked_by UUID",
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ",
            ],
        ),
        // 9005 - Auth extras tables
        (
            "9005",
            "Auto: Auth extras - password_resets, magic_links, webauthn_credentials",
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
        // 9006 - Role hierarchy
        (
            "9006",
            "Auto: Role hierarchy - chief/director/officer/staff",
            vec![
                "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check",
                "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('chief', 'director', 'officer', 'staff'))",
            ],
        ),
        // 9007 - Active flag on users
        (
            "9007",
            "Auto: Active flag on users",
            vec![
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE",
            ],
        ),
        // 9008 - System config
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
                    ('default_storage_quota_bytes', '5368709120'),
                    ('jwt_expiry_hours', '8')
                ON CONFLICT (key) DO NOTHING",
            ],
        ),
        // 9009 - Server-side favorites
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
        // 9010 - File versioning
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
        // 9011 - Governance requests table
        (
            "9011",
            "Auto: Governance requests table",
            vec![
                "CREATE TABLE IF NOT EXISTS governance_requests (
                    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                    type            VARCHAR(32)  NOT NULL CHECK (type IN (
                                        'FILE_LOCK', 'FILE_UNLOCK',
                                        'CLASSIFICATION_UPGRADE', 'CLASSIFICATION_DOWNGRADE',
                                        'FILE_MOVE', 'FILE_DELETE'
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
        // 9013 - Per-user storage quota
        (
            "9013",
            "Auto: Per-user storage quota",
            vec![
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT",
            ],
        ),
        // 9014 - Soft-delete TTL cleanup (runtime enforcement in cleanup.rs)
        (
            "9014",
            "Auto: Soft-delete TTL - expired trash cleanup policy (30-day retention)",
            vec!["SELECT 1 AS migration_documentation"],
        ),
        // 9015 - Full-text search via tsvector on files.name
        (
            "9015",
            "Auto: Full-text search - tsvector column + GIN index on files",
            vec![
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS search_vector tsvector",
                "CREATE INDEX IF NOT EXISTS idx_files_search_vector ON files USING GIN (search_vector)",
                // Backfill existing rows
                "UPDATE files SET search_vector = to_tsvector('english', COALESCE(name, '')) WHERE search_vector IS NULL",
            ],
        ),
        // 9016 - Governance review_note column
        (
            "9016",
            "Auto: Governance - review_note column on governance_requests",
            vec![
                "ALTER TABLE governance_requests ADD COLUMN IF NOT EXISTS review_note TEXT",
            ],
        ),
        // 9017 - lock_reason column on files
        (
            "9017",
            "Auto: Files - lock_reason column",
            vec![
                "ALTER TABLE files ADD COLUMN IF NOT EXISTS lock_reason TEXT",
            ],
        ),
        // 9018 - Avatar data column
        (
            "9018",
            "Auto: Avatar - avatar_data TEXT on users",
            vec![
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT",
            ],
        ),
        // 9019 - Department and supervisor
        (
            "9019",
            "Auto: Department and supervisor columns on users",
            vec![
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(255)",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id)",
            ],
        ),
        // 9020 - Notification preferences
        (
            "9020",
            "Auto: Notification preferences - notification_prefs JSONB on users",
            vec![
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{}'",
            ],
        ),
        // 9021 - User sessions table
        (
            "9021",
            "Auto: User sessions table for active session tracking",
            vec![
                "CREATE TABLE IF NOT EXISTS user_sessions (
                    id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                    user_id         UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    token_prefix    VARCHAR(16)  NOT NULL,
                    device          VARCHAR(255) NOT NULL DEFAULT '',
                    ip              VARCHAR(45)  NOT NULL DEFAULT '',
                    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                    last_seen_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                )",
                "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id)",
            ],
        ),
        // 9022 - Role Builder tables (permissions, role_groups, junctions)
        (
            "9022",
            "Auto: Role Builder - permissions, role_groups, user_role_groups",
            vec![
                "CREATE TABLE IF NOT EXISTS permissions (
                    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                    key         VARCHAR(64)  NOT NULL UNIQUE,
                    description TEXT         NOT NULL
                )",
                "CREATE TABLE IF NOT EXISTS role_groups (
                    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name        VARCHAR(128) NOT NULL,
                    description TEXT         NOT NULL DEFAULT '',
                    created_by  VARCHAR(128) NOT NULL,
                    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
                )",
                "CREATE TABLE IF NOT EXISTS role_group_permissions (
                    role_group_id UUID NOT NULL REFERENCES role_groups (id) ON DELETE CASCADE,
                    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
                    PRIMARY KEY (role_group_id, permission_id)
                )",
                "CREATE TABLE IF NOT EXISTS user_role_groups (
                    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    role_group_id UUID NOT NULL REFERENCES role_groups (id) ON DELETE CASCADE,
                    PRIMARY KEY (user_id, role_group_id)
                )",
                // Seed the 14 base permissions (idempotent via ON CONFLICT DO NOTHING)
                "INSERT INTO permissions (key, description) VALUES
                    ('files:read',         'View and download files'),
                    ('files:write',        'Upload and edit files'),
                    ('files:delete',       'Delete files'),
                    ('files:classify',     'Change file classifications'),
                    ('users:read',         'View user directory'),
                    ('users:manage',       'Create and edit users'),
                    ('users:delete',       'Delete users'),
                    ('governance:approve', 'Approve governance requests'),
                    ('governance:reject',  'Reject governance requests'),
                    ('admin:access',       'Access admin panel features'),
                    ('shares:manage',      'Manage file shares'),
                    ('audit:read',         'View audit logs'),
                    ('storage:manage',     'Manage storage quotas'),
                    ('config:read',        'Read system configuration'),
                    ('config:write',       'Write system configuration')
                 ON CONFLICT (key) DO NOTHING",
            ],
        ),
        // 9023 - Direct user permissions + custom roles + role implicit perms
        (
            "9023",
            "Auto: User permissions, custom roles, role implicit permissions",
            vec![
                // Direct user-permission grants (bypasses groups)
                "CREATE TABLE IF NOT EXISTS user_permissions (
                    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
                    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
                    PRIMARY KEY (user_id, permission_id)
                )",
                // Custom base roles (extends the 4-tier hierarchy)
                "CREATE TABLE IF NOT EXISTS custom_roles (
                    role_key    VARCHAR(32)  PRIMARY KEY,
                    label       VARCHAR(64)  NOT NULL,
                    level       SMALLINT     NOT NULL DEFAULT 1
                )",
                // Which permissions each base role implicitly grants
                "CREATE TABLE IF NOT EXISTS role_implicit_permissions (
                    role_key      VARCHAR(32) NOT NULL REFERENCES custom_roles (role_key) ON DELETE CASCADE,
                    permission_id UUID        NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
                    PRIMARY KEY (role_key, permission_id)
                )",
                // Seed the 4 base roles
                "INSERT INTO custom_roles (role_key, label, level) VALUES
                    ('chief',    'Chief',    4),
                    ('director', 'Director', 3),
                    ('officer',  'Officer',  2),
                    ('staff',    'Staff',    1)
                 ON CONFLICT (role_key) DO NOTHING",
                // Seed implicit permissions for chief/director (all 14 permissions)
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'chief', id FROM permissions
                 ON CONFLICT DO NOTHING",
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'director', id FROM permissions
                 ON CONFLICT DO NOTHING",
                // Officer: governance + audit + read-only
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'officer', id FROM permissions
                 WHERE key IN (
                     'files:read', 'files:write', 'users:read',
                     'governance:approve', 'governance:reject', 'audit:read'
                 )
                 ON CONFLICT DO NOTHING",
                // Staff: no implicit permissions (rely on custom groups)
            ],
        ),
        // 9024 - Fix governance_requests CHECK constraint (add FILE_MOVE, FILE_DELETE)
        (
            "9024",
            "Auto: Fix governance type constraint - add FILE_MOVE and FILE_DELETE",
            vec![
                "DO $$
                DECLARE
                    constraint_name text;
                BEGIN
                    SELECT con.conname INTO constraint_name
                    FROM pg_constraint con
                    JOIN pg_class rel ON rel.oid = con.conrelid
                    WHERE rel.relname = 'governance_requests'
                      AND con.contype = 'c'
                      AND pg_get_constraintdef(con.oid) LIKE '%FILE_LOCK%';
                    IF constraint_name IS NOT NULL THEN
                        EXECUTE format('ALTER TABLE governance_requests DROP CONSTRAINT %I', constraint_name);
                    END IF;
                    EXECUTE 'ALTER TABLE governance_requests ADD CONSTRAINT governance_requests_type_check
                        CHECK (type IN (
                            ''FILE_LOCK'', ''FILE_UNLOCK'',
                            ''CLASSIFICATION_UPGRADE'', ''CLASSIFICATION_DOWNGRADE'',
                            ''FILE_MOVE'', ''FILE_DELETE''
                        ))';
                END $$;",
            ],
        ),
        // 9012 - Audit logs table
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
        // 9025 - UI/UX Template Settings seeds
        (
            "9025",
            "Auto: Seed UI/UX configurations",
            vec![
                "INSERT INTO system_config (key, value, updated_at) VALUES
                    ('ui_theme', 'midnight', NOW()),
                    ('ui_glass_blur', '20', NOW()),
                    ('ui_glow_intensity', '0.15', NOW()),
                    ('ui_scanlines_opacity', '0.015', NOW()),
                    ('ui_typography', 'sans', NOW()),
                    ('ui_org_name', 'Unggul Axiom', NOW()),
                    ('ui_logo_url', '', NOW()),
                    ('ui_greeting_header', 'Strategic Portal', NOW())
                 ON CONFLICT (key) DO NOTHING",
            ],
        ),
        // 9026 - Backfill config:write permission for existing deployments
        (
            "9026",
            "Auto: Seed config:write permission",
            vec![
                "INSERT INTO permissions (key, description) VALUES
                    ('config:write', 'Write system configuration')
                 ON CONFLICT (key) DO NOTHING",
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'chief', id FROM permissions WHERE key = 'config:write'
                 ON CONFLICT DO NOTHING",
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'director', id FROM permissions WHERE key = 'config:write'
                 ON CONFLICT DO NOTHING",
            ],
        ),
        // 9027 - Classifications system
        (
            "9027",
            "Auto: Classifications table, permissions, and default data",
            vec![
                // Core table
                "CREATE TABLE IF NOT EXISTS classifications (
                    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    key         VARCHAR(32) NOT NULL UNIQUE,
                    label       VARCHAR(64) NOT NULL,
                    level       SMALLINT NOT NULL DEFAULT 0,
                    description TEXT NOT NULL DEFAULT '',
                    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )",
                // Junction: permission × classification × access_type
                "CREATE TABLE IF NOT EXISTS classification_permissions (
                    classification_id UUID NOT NULL REFERENCES classifications(id) ON DELETE CASCADE,
                    permission_id     UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
                    access_type       VARCHAR(8) NOT NULL CHECK (access_type IN ('read', 'write')),
                    PRIMARY KEY (classification_id, permission_id, access_type)
                )",
                // Seed new permissions
                "INSERT INTO permissions (key, description) VALUES
                    ('classifications:manage','Create and edit classifications')
                 ON CONFLICT (key) DO NOTHING",
                // Grant classification management to chief/director implicitly
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'chief', id FROM permissions WHERE key = 'classifications:manage'
                 ON CONFLICT DO NOTHING",
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'director', id FROM permissions WHERE key = 'classifications:manage'
                 ON CONFLICT DO NOTHING",
                // Seed 4 default classifications
                "INSERT INTO classifications (key, label, level, description, is_default) VALUES
                    ('TERBUKA', 'Terbuka (Open)',         0, 'Unclassified / public information', TRUE),
                    ('TERHAD',  'Terhad (Restricted)',     1, 'Limited distribution within organization', FALSE),
                    ('SULIT',   'Sulit (Confidential)',    2, 'Sensitive — need-to-know basis', FALSE),
                    ('RAHSIA',  'Rahsia (Secret)',         3, 'Highest security tier', FALSE)
                 ON CONFLICT (key) DO NOTHING",
                // Seed default classification permissions:
                // files:read can read all classifications; files:write can write all
                "INSERT INTO classification_permissions (classification_id, permission_id, access_type)
                 SELECT c.id, p.id, 'read'
                 FROM classifications c, permissions p
                 WHERE p.key = 'files:read'
                 ON CONFLICT DO NOTHING",
                "INSERT INTO classification_permissions (classification_id, permission_id, access_type)
                 SELECT c.id, p.id, 'write'
                 FROM classifications c, permissions p
                 WHERE p.key = 'files:write'
                 ON CONFLICT DO NOTHING",
                // files:classify can assign all classifications
                "INSERT INTO classification_permissions (classification_id, permission_id, access_type)
                 SELECT c.id, p.id, 'write'
                 FROM classifications c, permissions p
                 WHERE p.key = 'files:classify'
                 ON CONFLICT DO NOTHING",
                // ── Performance indexes ───────────────────────────────────────
                // BUG-14: Index for classification-based file queries
                "CREATE INDEX IF NOT EXISTS idx_files_classification ON files (classification) WHERE deleted_at IS NULL",
                // BUG-15: Compound index for governance list filtering
                "CREATE INDEX IF NOT EXISTS idx_gov_requests_status_type ON governance_requests (status, type)",
                // BUG-16: Compound index for file share lookups
                "CREATE INDEX IF NOT EXISTS idx_file_shares_file_user ON file_shares (file_id, user_id)",
            ],
        ),
        // 9029 - Granular admin permissions (split users:manage)
        (
            "9029",
            "Auto: Granular admin permissions for role builder delegation",
            vec![
                // Seed new granular permissions
                "INSERT INTO permissions (key, description) VALUES
                    ('role_groups:manage',  'Create, edit, and delete role groups'),
                    ('role_groups:assign',  'Assign users to role groups and manage direct overrides'),
                    ('permissions:manage',  'Create, edit, and delete permission definitions')
                 ON CONFLICT (key) DO NOTHING",
                // Grant to chief/director implicitly
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'chief', id FROM permissions
                 WHERE key IN ('role_groups:manage','role_groups:assign','permissions:manage')
                 ON CONFLICT DO NOTHING",
                "INSERT INTO role_implicit_permissions (role_key, permission_id)
                 SELECT 'director', id FROM permissions
                 WHERE key IN ('role_groups:manage','role_groups:assign','permissions:manage')
                 ON CONFLICT DO NOTHING",
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

        // Run each SQL statement in the migration.
        // Critical DDL failures are fatal — running with a mismatched schema
        // is worse than crashing and alerting the operator.
        let mut all_ok = true;
        for stmt in statements {
            match sqlx::query(stmt).execute(pool).await {
                Ok(_) => {}
                Err(e) => {
                    let is_critical = !stmt
                        .to_lowercase()
                        .contains("select 1 as migration_documentation");
                    if is_critical {
                        panic!(
                            "FATAL: Migration {version} ({description}) failed.\n\
                             Statement: {stmt}\n\
                             Error: {e}\n\
                             The application cannot start with a mismatched schema. \
                             Fix the error and restart.",
                            version = version,
                            description = description,
                            stmt = stmt,
                            e = e,
                        );
                    }
                    tracing::error!(
                        version = %version,
                        statement = %stmt,
                        error = %e,
                        "Non-critical migration statement failed (continuing)"
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
