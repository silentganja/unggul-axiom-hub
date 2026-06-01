use chrono::{DateTime, Utc};
use serde::Serialize;
use uuid::Uuid;

/// A single version snapshot of a file.
#[derive(Debug, sqlx::FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileVersion {
    pub id: Uuid,
    pub file_id: Uuid,
    pub version_number: i32,
    pub size_bytes: i64,
    pub storage_path: String,
    pub uploaded_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}
