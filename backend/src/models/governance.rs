use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ── Database Row ─────────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
// Full row struct — some fields read only in admin audit views.
#[allow(dead_code)]
pub struct GovernanceRequest {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub requested_by: Uuid,
    pub reviewed_by: Option<Uuid>,
    pub target_file_id: Option<Uuid>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── Response shapes (with joined user info) ──────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct GovernanceRequestResponse {
    pub id: Uuid,
    pub r#type: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub requested_by: Uuid,
    pub requested_by_name: String,
    pub requested_by_email: String,
    pub reviewed_by: Option<Uuid>,
    pub reviewed_by_name: Option<String>,
    pub target_file_id: Option<Uuid>,
    pub target_file_name: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub review_note: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ── Paginated response ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GovernanceListResponse {
    pub requests: Vec<GovernanceRequestResponse>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

// ── Request shapes ───────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGovernanceRequest {
    pub r#type: String,
    pub title: String,
    pub description: Option<String>,
    pub target_file_id: Option<Uuid>,
    /// Optional metadata (e.g. { "newClassification": "SULIT", "lockReason": "..." })
    pub metadata: Option<serde_json::Value>,
}
