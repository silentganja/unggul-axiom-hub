use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

/// Row returned when listing a user's favorited files.
#[derive(Debug, sqlx::FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteFile {
    // From files table
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
    // From favorites table
    pub favorited_at: DateTime<Utc>,
}
