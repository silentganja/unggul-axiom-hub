use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

/// Database row returned by `SELECT ... FROM users WHERE ...`.
/// Used with `sqlx::query_as::<_, User>(...)` - no compile-time macros.
#[derive(Debug, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub full_name: String,
    pub role: String,
    pub active: bool,
    #[sqlx(default)]
    pub storage_quota_bytes: Option<i64>,
    #[sqlx(default)]
    pub avatar_data: Option<String>,
    #[sqlx(default)]
    pub department: Option<String>,
    #[sqlx(default)]
    // Populated in org chart queries, not read on every profile load.
    #[allow(dead_code)]
    pub supervisor_id: Option<Uuid>,
    #[sqlx(default)]
    pub notification_prefs: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

/// Safe public projection of a user - never includes `password_hash`.
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub active: bool,
    pub storage_quota_bytes: Option<i64>,
    pub avatar_data: Option<String>,
    pub department: Option<String>,
    #[sqlx(default)]
    pub supervisor_id: Option<Uuid>,
    pub supervisor_name: Option<String>,
    pub notification_prefs: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

// ── Role hierarchy ──────────────────────────────────────────────────────────

/// Returns the numeric authority level for a known base role (fast, synchronous).
/// For custom roles, use `get_role_level()` which checks the database.
pub fn role_level(role: &str) -> u8 {
    match role {
        "chief" => 4,
        "director" => 3,
        "officer" => 2,
        "staff" => 1,
        _ => 0,
    }
}

/// Returns the role level, checking the `custom_roles` table first,
/// falling back to the hardcoded `role_level()` function.
pub async fn get_role_level(
    pool: &sqlx::PgPool,
    role: &str,
) -> Result<u8, crate::errors::AppError> {
    // Check custom_roles table first
    let db_level: Option<i16> =
        sqlx::query_scalar("SELECT level FROM custom_roles WHERE role_key = $1")
            .bind(role)
            .fetch_optional(pool)
            .await
            .map_err(crate::errors::AppError::Database)?
            .flatten();

    if let Some(lvl) = db_level {
        return Ok(lvl as u8);
    }

    // Fall back to hardcoded
    Ok(role_level(role))
}

/// Whether this role can approve governance requests.
pub fn can_govern(role: &str) -> bool {
    role_level(role) >= 2 // officer+
}

/// Whether this role can approve classification changes and lock overrides.
pub fn can_govern_classified(role: &str) -> bool {
    role_level(role) >= 3 // director+
}

/// All valid roles — fetched from DB when available, falls back to hardcoded.
pub async fn fetch_valid_roles(
    pool: &sqlx::PgPool,
) -> Result<Vec<String>, crate::errors::AppError> {
    let roles: Vec<String> =
        sqlx::query_scalar("SELECT role_key FROM custom_roles ORDER BY level DESC")
            .fetch_all(pool)
            .await
            .map_err(crate::errors::AppError::Database)?;

    if roles.is_empty() {
        Ok(vec![
            "chief".into(),
            "director".into(),
            "officer".into(),
            "staff".into(),
        ])
    } else {
        Ok(roles)
    }
}

/// Check if a role string is valid (exists in custom_roles or is a known base role).
pub async fn is_valid_role(
    pool: &sqlx::PgPool,
    role: &str,
) -> Result<bool, crate::errors::AppError> {
    let valid = fetch_valid_roles(pool).await?;
    Ok(valid.contains(&role.to_string()))
}

// ── Permission checks (dynamic: DB-driven roles + groups + direct) ───────────

/// Returns the set of permission keys that a given base role implicitly grants.
/// Checks the `role_implicit_permissions` table first, falls back to hardcoded.
pub async fn implicit_permissions(
    pool: &sqlx::PgPool,
    role: &str,
) -> Result<Vec<String>, crate::errors::AppError> {
    let perms: Vec<String> = sqlx::query_scalar(
        "SELECT p.key
         FROM permissions p
         JOIN role_implicit_permissions rip ON rip.permission_id = p.id
         WHERE rip.role_key = $1
         ORDER BY p.key",
    )
    .bind(role)
    .fetch_all(pool)
    .await
    .map_err(crate::errors::AppError::Database)?;

    if !perms.is_empty() {
        return Ok(perms);
    }

    // Fall back to hardcoded for known base roles
    Ok(match role {
        "chief" | "director" => vec![
            "files:read".into(),
            "files:write".into(),
            "files:delete".into(),
            "files:classify".into(),
            "users:read".into(),
            "users:manage".into(),
            "users:delete".into(),
            "governance:approve".into(),
            "governance:reject".into(),
            "admin:access".into(),
            "shares:manage".into(),
            "audit:read".into(),
            "storage:manage".into(),
            "config:read".into(),
        ],
        "officer" => vec![
            "files:read".into(),
            "files:write".into(),
            "users:read".into(),
            "governance:approve".into(),
            "governance:reject".into(),
            "audit:read".into(),
        ],
        _ => vec![],
    })
}

/// Check whether a user has a specific permission — the single entry point.
/// Fast path: hardcoded implicit grants for chief/director/officer.
/// Slow path: single DB query covering direct grants + DB-stored implicit + groups.
pub async fn user_has_permission(
    pool: &sqlx::PgPool,
    user_id: uuid::Uuid,
    base_role: &str,
    permission_key: &str,
) -> Result<bool, crate::errors::AppError> {
    // Fast path: hardcoded implicit grants for known base roles
    match base_role {
        "chief" | "director" => return Ok(true),
        "officer"
            if [
                "files:read",
                "files:write",
                "users:read",
                "governance:approve",
                "governance:reject",
                "audit:read",
            ]
            .contains(&permission_key) =>
        {
            return Ok(true);
        }
        _ => {}
    }

    // Single DB query: direct grants UNION DB implicit perms UNION group perms
    let has_perm: bool = sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1 FROM user_permissions up
            JOIN permissions p ON p.id = up.permission_id
            WHERE up.user_id = $1 AND p.key = $3
            UNION ALL
            SELECT 1 FROM role_implicit_permissions rip
            JOIN permissions p ON p.id = rip.permission_id
            WHERE rip.role_key = $2 AND p.key = $3
            UNION ALL
            SELECT 1 FROM user_role_groups urg
            JOIN role_group_permissions rgp ON rgp.role_group_id = urg.role_group_id
            JOIN permissions p ON p.id = rgp.permission_id
            WHERE urg.user_id = $1 AND p.key = $3
            LIMIT 1
        )",
    )
    .bind(user_id)
    .bind(base_role)
    .bind(permission_key)
    .fetch_one(pool)
    .await
    .map_err(crate::errors::AppError::Database)?;

    Ok(has_perm)
}

impl From<User> for UserProfile {
    fn from(u: User) -> Self {
        UserProfile {
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            active: u.active,
            storage_quota_bytes: u.storage_quota_bytes,
            avatar_data: u.avatar_data,
            department: u.department,
            supervisor_id: u.supervisor_id,
            supervisor_name: None,
            notification_prefs: u.notification_prefs,
            created_at: u.created_at,
        }
    }
}
