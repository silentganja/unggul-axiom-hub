use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─── Database Row ────────────────────────────────────────────────────────────

/// Full file/folder row as returned from the `files` table.
/// Used with `sqlx::query_as::<_, FileNode>(...)` - no compile-time macros.
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
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
    pub locked_by: Option<Uuid>,
    pub locked_at: Option<DateTime<Utc>>,
    pub lock_reason: Option<String>,
}

// ─── Request Payloads ────────────────────────────────────────────────────────

/// Query parameters for `GET /api/files`.
/// `parent_id` is optional - omit it to list root-level entries.
/// Accepts both `parent_id` (snake_case) and `parentId` (camelCase) query params.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListFilesQuery {
    #[serde(alias = "parent_id")]
    pub parent_id: Option<Uuid>,
    /// Full-text search on file name.
    pub q: Option<String>,
    /// Page number (1-based, default 1).
    pub page: Option<u32>,
    /// Items per page (default 50, max 200).
    pub per_page: Option<u32>,
    /// Sort column: "name", "size", "classification", "updated".
    pub sort: Option<String>,
    /// Sort order: "asc" or "desc" (default "asc").
    pub order: Option<String>,
}

/// Paginated response wrapper.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileListResponse {
    pub files: Vec<FileNode>,
    pub total: i64,
    pub page: u32,
    pub per_page: u32,
    pub total_pages: u32,
}

/// Body for `POST /api/files/folder`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateFolderReq {
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub classification: Option<String>,
}

/// Body for `PUT /api/files/{id}/rename`.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameFileReq {
    pub new_name: String,
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/// Allowed classification values per Malaysian Government security tiers.
pub const VALID_CLASSIFICATIONS: &[&str] = &["RAHSIA", "SULIT", "TERHAD", "TERBUKA"];

impl CreateFolderReq {
    /// Validates name is non-empty and classification is a recognised tier.
    pub fn validate(&self) -> Result<&str, &'static str> {
        if self.name.trim().is_empty() {
            return Err("name must not be empty");
        }
        let classification = self.classification.as_deref().unwrap_or("TERBUKA");
        if !VALID_CLASSIFICATIONS.contains(&classification) {
            return Err("classification must be one of: RAHSIA, SULIT, TERHAD, TERBUKA");
        }
        Ok(classification)
    }
}

impl RenameFileReq {
    pub fn validate(&self) -> Result<(), &'static str> {
        if self.new_name.trim().is_empty() {
            return Err("new_name must not be empty");
        }
        Ok(())
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    mod create_folder_req {
        use super::*;

        #[test]
        fn valid_default_classification() {
            let req = CreateFolderReq {
                name: "Q3 Reports".into(),
                parent_id: None,
                classification: None,
            };
            let cls = req.validate().expect("should be valid");
            assert_eq!(cls, "TERBUKA", "default classification is TERBUKA");
        }

        #[test]
        fn valid_explicit_classification() {
            for &cls in VALID_CLASSIFICATIONS {
                let req = CreateFolderReq {
                    name: "Folder".into(),
                    parent_id: None,
                    classification: Some(cls.into()),
                };
                assert!(req.validate().is_ok(), "{} should be valid", cls);
            }
        }

        #[test]
        fn empty_name_rejected() {
            let req = CreateFolderReq {
                name: "   ".into(),
                parent_id: None,
                classification: None,
            };
            assert!(req.validate().is_err(), "whitespace-only name must be rejected");
        }

        #[test]
        fn invalid_classification_rejected() {
            let req = CreateFolderReq {
                name: "Valid Name".into(),
                parent_id: None,
                classification: Some("TOP_SECRET".into()),
            };
            assert!(req.validate().is_err(), "unknown classification must be rejected");
        }

        #[test]
        fn name_with_leading_trailing_spaces_trimmed() {
            let req = CreateFolderReq {
                name: "  trimmed  ".into(),
                parent_id: None,
                classification: None,
            };
            assert!(req.validate().is_ok(), "trimmed name should still be non-empty");
        }
    }

    mod rename_file_req {
        use super::*;

        #[test]
        fn valid_rename() {
            let req = RenameFileReq {
                new_name: "updated-report.pdf".into(),
            };
            assert!(req.validate().is_ok());
        }

        #[test]
        fn empty_name_rejected() {
            let req = RenameFileReq {
                new_name: "".into(),
            };
            assert!(req.validate().is_err());
        }

        #[test]
        fn unicode_name_accepted() {
            let req = RenameFileReq {
                new_name: "機密ファイル.txt".into(),
            };
            assert!(req.validate().is_ok());
        }
    }

    #[test]
    fn valid_classifications_contains_all_tiers() {
        assert_eq!(VALID_CLASSIFICATIONS.len(), 4);
        assert!(VALID_CLASSIFICATIONS.contains(&"RAHSIA"));
        assert!(VALID_CLASSIFICATIONS.contains(&"SULIT"));
        assert!(VALID_CLASSIFICATIONS.contains(&"TERHAD"));
        assert!(VALID_CLASSIFICATIONS.contains(&"TERBUKA"));
    }
}
