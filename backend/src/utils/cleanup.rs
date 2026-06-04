// ─────────────────────────────────────────────────────────────────────────────
// Background cleanup tasks.
// - Soft-deleted files that have been in the trash for more than 30 days are
//   permanently deleted from the database and their physical file on disk.
// - Governance requests that have been PENDING for more than 30 days are
//   auto-rejected.
// ─────────────────────────────────────────────────────────────────────────────

use sqlx::PgPool;
use std::path::Path;

/// Auto-reject governance requests that have been PENDING for more than 30 days.
pub async fn cleanup_expired_governance(pool: &PgPool) {
    tracing::info!("Running expired governance request cleanup...");

    let result = sqlx::query(
        "UPDATE governance_requests
         SET status = 'REJECTED',
             review_note = 'Auto-rejected: expired after 30 days without action',
             updated_at = NOW()
         WHERE status = 'PENDING'
           AND created_at < NOW() - INTERVAL '30 days'",
    )
    .execute(pool)
    .await;

    match result {
        Ok(r) => {
            let count = r.rows_affected();
            if count > 0 {
                tracing::info!("Auto-rejected {} expired governance requests", count);
            } else {
                tracing::info!("No expired governance requests found.");
            }
        }
        Err(e) => {
            tracing::error!("Expired governance cleanup failed: {}", e);
        }
    }
}

/// Permanently delete all files whose `deleted_at` is older than 30 days.
///
/// This function:
/// 1. Queries for expired soft-deleted file records.
/// 2. Deletes the physical storage files from disk.
/// 3. Removes the database rows.
///
/// It is safe to call repeatedly - deletes are idempotent.
pub async fn cleanup_expired_trash(pool: &PgPool, storage_path: &str) {
    tracing::info!("Running expired trash cleanup...");

    // Gather expired files with their storage paths (file ID = filename on disk)
    let expired: Vec<(uuid::Uuid, String)> = match sqlx::query_as(
        "SELECT f.id, f.name FROM files f
         WHERE f.deleted_at IS NOT NULL
           AND f.deleted_at < NOW() - INTERVAL '30 days'
         LIMIT 1000",
    )
    .fetch_all(pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("Trash cleanup query failed: {}", e);
            return;
        }
    };

    if expired.is_empty() {
        tracing::info!("No expired trash files found.");
        return;
    }

    let count = expired.len();
    for (file_id, _name) in &expired {
        // Remove the physical file from disk (ignore errors - file may already be gone)
        let filepath = Path::new(storage_path).join(file_id.to_string());
        if filepath.exists() {
            if let Err(e) = tokio::fs::remove_file(&filepath).await {
                tracing::warn!("Failed to remove physical file {} on disk: {}", file_id, e);
            }
        }

        // Remove version files too
        let version_path = Path::new(storage_path).join(format!("{}_v", file_id));
        if version_path.exists() {
            let _ = tokio::fs::remove_dir_all(&version_path).await;
        }
    }

    // Permanently delete the database rows (cascades to shares, versions, etc.)
    match sqlx::query("DELETE FROM files WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'")
        .execute(pool)
        .await
    {
        Ok(result) => {
            tracing::info!(
                "Trash cleanup complete: {} files permanently deleted ({} rows affected)",
                count,
                result.rows_affected()
            );
        }
        Err(e) => {
            tracing::error!("Trash cleanup DELETE failed: {}", e);
        }
    }
}
