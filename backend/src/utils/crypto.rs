// ─────────────────────────────────────────────────────────────────────────────
// AES-256-GCM at-rest file encryption / decryption
//
// Encrypted file format on disk:
//   [12-byte random nonce][AES-256-GCM ciphertext + 16-byte auth tag]
//
// The key is a hex-encoded 32-byte value supplied via the FILE_ENCRYPTION_KEY
// environment variable (or AppConfig.encryption_key).
// ─────────────────────────────────────────────────────────────────────────────

use crate::errors::AppError;
use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use rand_core::RngCore;

/// Encrypt plaintext using AES-256-GCM with a random nonce.
///
/// Returns `nonce || ciphertext` (12 + len(plaintext) + 16 bytes).
pub fn encrypt(key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, AppError> {
    if key.len() != 32 {
        return Err(AppError::Internal(anyhow::anyhow!(
            "Encryption key must be exactly 32 bytes, got {}",
            key.len()
        )));
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to create cipher: {}", e)))?;

    // Generate a random 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Encryption failed: {}", e)))?;

    // Prepend nonce to ciphertext
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result)
}

/// Decrypt data previously encrypted with `encrypt()`.
///
/// Expects input format: `[12-byte nonce][rest]`.
pub fn decrypt(key: &[u8], data: &[u8]) -> Result<Vec<u8>, AppError> {
    if key.len() != 32 {
        return Err(AppError::Internal(anyhow::anyhow!(
            "Encryption key must be exactly 32 bytes, got {}",
            key.len()
        )));
    }

    if data.len() < 12 + 16 {
        return Err(AppError::Internal(anyhow::anyhow!(
            "Ciphertext too short: expected at least 28 bytes, got {}",
            data.len()
        )));
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Failed to create cipher: {}", e)))?;

    let (nonce_bytes, ciphertext) = data.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("Decryption failed: {}", e)))?;

    Ok(plaintext)
}
