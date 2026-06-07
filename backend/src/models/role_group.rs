// ─────────────────────────────────────────────────────────────────────────────
// Role Builder models — custom role groups with granular permissions.
//
// These tables allow admins to create named groups, attach permissions to
// them, and assign users. The existing 4-tier hierarchy (chief/director/
// officer/staff) is unchanged — custom groups are additive.
// ─────────────────────────────────────────────────────────────────────────────

use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

// ── Permission ────────────────────────────────────────────────────────────────

/// A single granular permission from the seeded `permissions` table.
#[derive(Debug, Clone, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Permission {
    pub id: Uuid,
    pub key: String,
    pub description: String,
}

// ── RoleGroup (database row) ──────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
pub struct RoleGroup {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── RoleGroupSummary (list view with permission count) ────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct RoleGroupSummary {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub permission_count: i64,
    pub user_count: i64,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── RoleGroupDetail (single group with full permission list) ──────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoleGroupDetail {
    pub id: Uuid,
    pub name: String,
    pub description: String,
    pub permissions: Vec<Permission>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── UserRoleGroupEntry (a user that belongs to a group) ───────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct UserRoleGroupEntry {
    pub user_id: Uuid,
    pub full_name: String,
    pub email: String,
    pub role: String,
}
