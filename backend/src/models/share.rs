use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Database Row ─────────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
// Full row struct — some fields populated only by admin queries.
#[allow(dead_code)]
pub struct FileShare {
    pub id: Uuid,
    pub file_id: Uuid,
    pub user_id: Uuid,
    pub role: String,
    pub shared_by: Uuid,
    pub created_at: DateTime<Utc>,
}

// ── Response shapes ──────────────────────────────────────────────────────────

/// Lightweight user reference returned alongside shared files.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareUserInfo {
    pub id: Uuid,
    pub full_name: String,
    pub email: String,
}

/// Flat DB row for file share entries (used in the access sheet).
#[derive(Debug, sqlx::FromRow)]
pub struct FileShareRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub user_full_name: String,
    pub user_email: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

/// A share entry returned for the access sheet (who has access to a file).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileShareEntry {
    pub id: Uuid,
    pub user: ShareUserInfo,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

impl From<FileShareRow> for FileShareEntry {
    fn from(r: FileShareRow) -> Self {
        FileShareEntry {
            id: r.id,
            user: ShareUserInfo {
                id: r.user_id,
                full_name: r.user_full_name,
                email: r.user_email,
            },
            role: r.role,
            created_at: r.created_at,
        }
    }
}

/// Flat DB row returned by the shared-files JOIN query.
/// sqlx maps this directly, then it's converted to SharedFileNode for the API response.
#[derive(Debug, sqlx::FromRow)]
pub struct SharedFileRow {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub owner_id: Uuid,
    pub name: String,
    pub is_folder: bool,
    pub size_bytes: i64,
    pub mime_type: Option<String>,
    pub classification: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub share_role: String,
    pub shared_by_id: Uuid,
    pub shared_by_full_name: String,
    pub shared_by_email: String,
}

/// A file that has been shared with the authenticated user (API response).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SharedFileNode {
    pub id: Uuid,
    pub parent_id: Option<Uuid>,
    pub owner_id: Uuid,
    pub name: String,
    pub is_folder: bool,
    pub size_bytes: i64,
    pub mime_type: Option<String>,
    pub classification: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// The role granted via the share (viewer / editor).
    pub share_role: String,
    /// Who shared this file with the user.
    pub shared_by: ShareUserInfo,
}

impl From<SharedFileRow> for SharedFileNode {
    fn from(r: SharedFileRow) -> Self {
        SharedFileNode {
            id: r.id,
            parent_id: r.parent_id,
            owner_id: r.owner_id,
            name: r.name,
            is_folder: r.is_folder,
            size_bytes: r.size_bytes,
            mime_type: r.mime_type,
            classification: r.classification,
            created_at: r.created_at,
            updated_at: r.updated_at,
            share_role: r.share_role,
            shared_by: ShareUserInfo {
                id: r.shared_by_id,
                full_name: r.shared_by_full_name,
                email: r.shared_by_email,
            },
        }
    }
}

// ── Request shapes ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareFileRequest {
    pub email: String,
    pub role: String,
}
