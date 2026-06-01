// ─────────────────────────────────────────────────────────────────────────────
// Object storage abstraction layer.
//
// Default implementation uses the local filesystem. Set STORAGE_BACKEND=s3
// and configure AWS_* env vars to switch to S3-compatible storage (MinIO, R2, etc.).
// ─────────────────────────────────────────────────────────────────────────────

use std::path::{Path, PathBuf};

/// Supported storage backends.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum StorageBackend {
    Local,
    S3,
}

impl StorageBackend {
    pub fn from_env() -> Self {
        match std::env::var("STORAGE_BACKEND")
            .unwrap_or_default()
            .to_lowercase()
            .as_str()
        {
            "s3" | "minio" => StorageBackend::S3,
            _ => StorageBackend::Local,
        }
    }
}

// ── Storage trait ────────────────────────────────────────────────────────────

/// Abstract file storage operations.
/// Implemented by `LocalStorage` and (optionally) `S3Storage`.
#[async_trait::async_trait]
pub trait FileStorage: Send + Sync {
    /// Store a file from a local temporary path, returning the final storage path/URL.
    async fn store(&self, temp_path: &Path, file_id: &str) -> Result<String, StorageError>;

    /// Read the full contents of a stored file.
    async fn read(&self, storage_path: &str) -> Result<Vec<u8>, StorageError>;

    /// Delete a stored file.
    async fn delete(&self, storage_path: &str) -> Result<(), StorageError>;

    /// Check if a file exists at the given storage path.
    async fn exists(&self, storage_path: &str) -> Result<bool, StorageError>;
}

// ── Error type ───────────────────────────────────────────────────────────────

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Object not found")]
    NotFound,
    #[error("S3 error: {0}")]
    S3(String),
}

// ── Local filesystem implementation ──────────────────────────────────────────

pub struct LocalStorage {
    base_path: PathBuf,
}

impl LocalStorage {
    pub fn new(base_path: &Path) -> Self {
        Self {
            base_path: base_path.to_path_buf(),
        }
    }

    fn full_path(&self, storage_path: &str) -> PathBuf {
        if Path::new(storage_path).is_absolute() {
            PathBuf::from(storage_path)
        } else {
            self.base_path.join(storage_path)
        }
    }
}

#[async_trait::async_trait]
impl FileStorage for LocalStorage {
    async fn store(&self, temp_path: &Path, file_id: &str) -> Result<String, StorageError> {
        let dest = self.base_path.join(file_id);
        tokio::fs::copy(temp_path, &dest).await?;
        Ok(dest.to_string_lossy().to_string())
    }

    async fn read(&self, storage_path: &str) -> Result<Vec<u8>, StorageError> {
        let path = self.full_path(storage_path);
        if !path.exists() {
            return Err(StorageError::NotFound);
        }
        Ok(tokio::fs::read(&path).await?)
    }

    async fn delete(&self, storage_path: &str) -> Result<(), StorageError> {
        let path = self.full_path(storage_path);
        if path.exists() {
            tokio::fs::remove_file(&path).await?;
        }
        Ok(())
    }

    async fn exists(&self, storage_path: &str) -> Result<bool, StorageError> {
        Ok(self.full_path(storage_path).exists())
    }
}

// ── Factory ──────────────────────────────────────────────────────────────────

use std::sync::Arc;

/// Create the configured storage backend.
pub fn create_storage(base_path: &Path) -> Arc<dyn FileStorage> {
    let backend = StorageBackend::from_env();

    match backend {
        StorageBackend::Local => {
            tracing::info!("Using local filesystem storage at {:?}", base_path);
            Arc::new(LocalStorage::new(base_path))
        }
        StorageBackend::S3 => {
            // Future: return Arc::new(S3Storage::new(...))
            // For now, fall back to local storage with a warning
            tracing::warn!(
                "S3 storage backend requested but not yet implemented. \
                 Falling back to local filesystem. \
                 Set STORAGE_BACKEND=local to suppress this warning."
            );
            Arc::new(LocalStorage::new(base_path))
        }
    }
}
