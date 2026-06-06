use serde::Serialize;

/// A lightweight event broadcast to SSE clients.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
// Variants emitted by handlers but never exhaustively matched by consumers.
#[allow(dead_code)]
pub enum NotificationEvent {
    #[serde(rename = "governance_update")]
    GovernanceUpdate {
        request_id: String,
        status: String,
        title: String,
    },
    #[serde(rename = "share_added")]
    ShareAdded {
        file_name: String,
        shared_by: String,
    },
    #[serde(rename = "file_locked")]
    FileLocked {
        file_id: String,
        file_name: String,
        locked_by: String,
    },
    #[serde(rename = "file_unlocked")]
    FileUnlocked { file_id: String, file_name: String },
    #[serde(rename = "file_uploaded")]
    FileUploaded { file_name: String, size_bytes: i64 },
    /// Emitted when a user submits a new governance request.
    /// The `supervisor_id` field lets supervisor clients filter for their own alerts.
    #[serde(rename = "governance_requested")]
    GovernanceRequested {
        request_id: String,
        title: String,
        requested_by: String,
        supervisor_id: Option<String>,
    },
}
