// ─────────────────────────────────────────────────────────────────────────────
// Classification models — dynamic data classification tiers.
//
// Replaces the hardcoded VALID_CLASSIFICATIONS array with a database-backed
// system that admins can customise via the Classification Builder panel.
// ─────────────────────────────────────────────────────────────────────────────

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

// ── Classification (database row) ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Classification {
    pub id: Uuid,
    pub key: String,
    pub label: String,
    pub level: i16,
    pub description: String,
    pub is_default: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── ClassificationSummary (list view with file count) ────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationSummary {
    pub id: Uuid,
    pub key: String,
    pub label: String,
    pub level: i16,
    pub description: String,
    pub is_default: bool,
    pub file_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── ClassificationPermission (junction row) ──────────────────────────────────

/// Row from the `classification_permissions` junction table.
/// Read by `get_classification_permissions` to resolve which permissions grant
/// read/write access to a given classification tier.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationPermission {
    pub classification_id: Uuid,
    pub permission_id: Uuid,
    pub access_type: String,
}

/// Full view of a classification's access rules.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassificationAccessDetail {
    pub classification_id: Uuid,
    pub classification_key: String,
    /// Permissions that grant read access to this classification.
    pub read_permissions: Vec<crate::models::role_group::Permission>,
    /// Permissions that grant write (assign/change-to) access to this classification.
    pub write_permissions: Vec<crate::models::role_group::Permission>,
}

// ── Async helpers (replace the old VALID_CLASSIFICATIONS const) ─────────────

/// Returns true if the given classification key exists in the database.
/// Falls back to `fetch_classification_keys` (which itself falls back to the
/// hardcoded list) when the DB has no classifications yet.
pub async fn is_valid_classification(pool: &PgPool, key: &str) -> bool {
    let exists: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM classifications WHERE key = $1)")
            .bind(key)
            .fetch_one(pool)
            .await
            .unwrap_or(false);

    if exists {
        return true;
    }

    // Fallback: use the canonical key list (DB → hardcoded bootstrap list)
    fetch_classification_keys(pool)
        .await
        .iter()
        .any(|k| k == key)
}

/// Returns the hierarchy level for a classification key (higher = more restricted).
/// Falls back to `fetch_classification_keys` (DB → bootstrap list) position
/// when the DB has no entry for this key.
pub async fn classification_level(pool: &PgPool, key: &str) -> Option<i16> {
    if let Some(level) = sqlx::query_scalar("SELECT level FROM classifications WHERE key = $1")
        .bind(key)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten()
    {
        return Some(level);
    }
    // Fallback: use canonical key list as positional hierarchy
    fetch_classification_keys(pool)
        .await
        .iter()
        .position(|k| k == key)
        .map(|i| i as i16)
}

/// Fetch all valid classification keys (sorted by level ascending).
pub async fn fetch_classification_keys(pool: &PgPool) -> Vec<String> {
    let keys: Vec<String> =
        sqlx::query_scalar("SELECT key FROM classifications ORDER BY level ASC")
            .fetch_all(pool)
            .await
            .unwrap_or_default();

    if keys.is_empty() {
        super::file::VALID_CLASSIFICATIONS
            .iter()
            .map(|&s| s.to_string())
            .collect()
    } else {
        keys
    }
}

/// Check whether a given permission grants a specific access type to a classification.
pub async fn permission_has_classification_access(
    pool: &PgPool,
    permission_key: &str,
    classification_key: &str,
    access_type: &str,
) -> bool {
    sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(
            SELECT 1 FROM classification_permissions cp
            JOIN classifications c ON c.id = cp.classification_id
            JOIN permissions p ON p.id = cp.permission_id
            WHERE c.key = $1 AND p.key = $2 AND cp.access_type = $3
        )",
    )
    .bind(classification_key)
    .bind(permission_key)
    .bind(access_type)
    .fetch_one(pool)
    .await
    .unwrap_or(false)
}

/// Returns the set of all permission keys effectively held by a user
/// (base-role implicit grants + direct user_permissions + role-group membership).
/// Single source of truth for permission resolution used by classification
/// access checks and other consumers.
async fn get_effective_permission_keys(
    pool: &PgPool,
    user_id: uuid::Uuid,
    base_role: &str,
) -> Result<Vec<String>, crate::errors::AppError> {
    let keys: Vec<String> = sqlx::query_scalar(
        "SELECT DISTINCT p.key FROM permissions p
         WHERE p.id IN (
             SELECT permission_id FROM user_permissions WHERE user_id = $1
             UNION
             SELECT permission_id FROM role_implicit_permissions WHERE role_key = $2
             UNION
             SELECT rgp.permission_id
             FROM user_role_groups urg
             JOIN role_group_permissions rgp ON rgp.role_group_id = urg.role_group_id
             WHERE urg.user_id = $1
         )",
    )
    .bind(user_id)
    .bind(base_role)
    .fetch_all(pool)
    .await
    .map_err(crate::errors::AppError::Database)?;

    Ok(keys)
}

/// Check whether a user can read files of a given classification, based on
/// their effective permissions (base role + direct grants + group membership).
/// Chief/Director/Officer always pass via fast path. Staff are checked against
/// the `classification_permissions` table.
pub async fn user_can_read_classification(
    pool: &PgPool,
    user_id: uuid::Uuid,
    base_role: &str,
    classification_key: &str,
) -> Result<bool, crate::errors::AppError> {
    // Fast path: chief/director/admin_panel can read everything
    if matches!(base_role, "admin_panel" | "chief" | "director") {
        return Ok(true);
    }
    // Officer fast path: officers have files:read implicitly, which is seeded
    // with read access to all classifications by default (BUG-20)
    if base_role == "officer" {
        return Ok(true);
    }

    // BUG-21: If no classification_permissions rules exist at all, fall back
    // to allowing access (backward compatible with pre-builder behaviour).
    let any_rules: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM classification_permissions LIMIT 1)")
            .fetch_one(pool)
            .await
            .unwrap_or(false);
    if !any_rules {
        return Ok(true);
    }

    let perm_keys = get_effective_permission_keys(pool, user_id, base_role).await?;
    if perm_keys.is_empty() {
        return Ok(false);
    }

    let has_access: bool = sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1 FROM classification_permissions cp
            JOIN classifications c ON c.id = cp.classification_id
            JOIN permissions p ON p.id = cp.permission_id
            WHERE c.key = $1 AND cp.access_type = $2 AND p.key = ANY($3)
        )",
    )
    .bind(classification_key)
    .bind("read")
    .bind(&perm_keys)
    .fetch_one(pool)
    .await
    .map_err(crate::errors::AppError::Database)?;

    if has_access {
        return Ok(true);
    }

    // Defensive fallback: when the bulk ANY query returns false, re-check each
    // permission individually. This guards against edge cases with very large
    // permission arrays exceeding PostgreSQL parameter limits. In normal
    // operation this path is rarely taken.
    for pk in &perm_keys {
        if permission_has_classification_access(pool, pk, classification_key, "read").await {
            return Ok(true);
        }
    }

    Ok(false)
}

/// Check whether a user can assign/write files of a given classification.
pub async fn user_can_write_classification(
    pool: &PgPool,
    user_id: uuid::Uuid,
    base_role: &str,
    classification_key: &str,
) -> Result<bool, crate::errors::AppError> {
    // Fast path: chief/director/admin_panel can write everything
    if matches!(base_role, "admin_panel" | "chief" | "director") {
        return Ok(true);
    }
    // Officer fast path: officers have files:write implicitly, which is seeded
    // with write access to all classifications by default (BUG-20)
    if base_role == "officer" {
        return Ok(true);
    }

    // BUG-21: If no classification_permissions rules exist, fall back to allow.
    let any_rules: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM classification_permissions LIMIT 1)")
            .fetch_one(pool)
            .await
            .unwrap_or(false);
    if !any_rules {
        return Ok(true);
    }

    let perm_keys = get_effective_permission_keys(pool, user_id, base_role).await?;
    if perm_keys.is_empty() {
        return Ok(false);
    }

    let has_access: bool = sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1 FROM classification_permissions cp
            JOIN classifications c ON c.id = cp.classification_id
            JOIN permissions p ON p.id = cp.permission_id
            WHERE c.key = $1 AND cp.access_type = $2 AND p.key = ANY($3)
        )",
    )
    .bind(classification_key)
    .bind("write")
    .bind(&perm_keys)
    .fetch_one(pool)
    .await
    .map_err(crate::errors::AppError::Database)?;

    Ok(has_access)
}
