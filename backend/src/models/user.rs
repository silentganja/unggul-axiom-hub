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
    pub supervisor_name: Option<String>,
    pub notification_prefs: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

// ── Role hierarchy ──────────────────────────────────────────────────────────

/// Returns the numeric authority level for a role (higher = more authority).
pub fn role_level(role: &str) -> u8 {
    match role {
        "chief" => 4,
        "director" => 3,
        "officer" => 2,
        "staff" => 1,
        _ => 0,
    }
}

/// Whether this role can approve governance requests.
pub fn can_govern(role: &str) -> bool {
    role_level(role) >= 2 // officer+
}

/// Whether this role can approve classification changes and lock overrides.
pub fn can_govern_classified(role: &str) -> bool {
    role_level(role) >= 3 // director+
}

/// Whether this role can manage users (director+).
/// Part of the role model API — called from admin CRUD handlers.
#[allow(dead_code)]
pub fn can_manage_users(role: &str) -> bool {
    role_level(role) >= 3 // director+
}

/// All valid roles (4-tier hierarchy).
pub const VALID_ROLES: &[&str] = &["chief", "director", "officer", "staff"];

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
            supervisor_name: None,
            notification_prefs: u.notification_prefs,
            created_at: u.created_at,
        }
    }
}
