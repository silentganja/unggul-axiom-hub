use serde::Serialize;

/// A lightweight event broadcast to SSE clients.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type")]
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
}
