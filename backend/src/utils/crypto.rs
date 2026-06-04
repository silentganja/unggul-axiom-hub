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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> Vec<u8> {
        vec![0xABu8; 32] // 32-byte key for AES-256
    }

    fn different_key() -> Vec<u8> {
        vec![0xCDu8; 32]
    }

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let key = test_key();
        let plaintext = b"classified document content";

        let ciphertext = encrypt(&key, plaintext).expect("encryption should succeed");
        assert!(
            ciphertext.len() > plaintext.len(),
            "ciphertext includes nonce + tag"
        );
        assert_ne!(
            ciphertext, plaintext,
            "ciphertext must differ from plaintext"
        );

        let decrypted = decrypt(&key, &ciphertext).expect("decryption should succeed");
        assert_eq!(decrypted, plaintext, "roundtrip must preserve data");
    }

    #[test]
    fn encrypt_empty_payload() {
        let key = test_key();
        let ciphertext = encrypt(&key, b"").expect("empty encrypt should succeed");
        assert_eq!(
            ciphertext.len(),
            12 + 16,
            "empty plaintext = nonce + tag only"
        );
        let decrypted = decrypt(&key, &ciphertext).expect("empty decrypt should succeed");
        assert!(decrypted.is_empty());
    }

    #[test]
    fn encrypt_large_payload() {
        let key = test_key();
        let plaintext = vec![0x42u8; 1_048_576]; // 1 MB
        let ciphertext = encrypt(&key, &plaintext).expect("large encrypt should succeed");
        let decrypted = decrypt(&key, &ciphertext).expect("large decrypt should succeed");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn encrypt_with_wrong_key_length() {
        let short_key = vec![0x00u8; 16]; // 128-bit, not 256
        let result = encrypt(&short_key, b"test");
        assert!(result.is_err(), "encrypt with 16-byte key must fail");
    }

    #[test]
    fn decrypt_with_wrong_key_length() {
        let key = test_key();
        let ciphertext = encrypt(&key, b"test").unwrap();
        let short_key = vec![0x00u8; 16];
        let result = decrypt(&short_key, &ciphertext);
        assert!(result.is_err(), "decrypt with wrong key length must fail");
    }

    #[test]
    fn decrypt_with_wrong_key() {
        let ciphertext = encrypt(&test_key(), b"sensitive data").unwrap();
        let result = decrypt(&different_key(), &ciphertext);
        assert!(result.is_err(), "decrypt with wrong key must fail");
    }

    #[test]
    fn decrypt_too_short_data() {
        let key = test_key();
        let result = decrypt(&key, b"too-short");
        assert!(
            result.is_err(),
            "data shorter than 28 bytes must be rejected"
        );
    }

    #[test]
    fn decrypt_tampered_ciphertext() {
        let key = test_key();
        let mut ciphertext = encrypt(&key, b"tamper me").unwrap();
        // Flip a byte in the ciphertext (after the nonce)
        ciphertext[15] ^= 0xFF;
        let result = decrypt(&key, &ciphertext);
        assert!(result.is_err(), "tampered ciphertext must fail auth check");
    }

    #[test]
    fn nonces_are_random() {
        let key = test_key();
        let c1 = encrypt(&key, b"same plaintext").unwrap();
        let c2 = encrypt(&key, b"same plaintext").unwrap();
        // First 12 bytes are the nonce - they must differ
        assert_ne!(
            &c1[..12],
            &c2[..12],
            "each encryption must use a unique nonce"
        );
    }

    #[test]
    fn unicode_plaintext_roundtrip() {
        let key = test_key();
        let plaintext = "🔐 機密文書 - RAHSIA classification".as_bytes();
        let ciphertext = encrypt(&key, plaintext).unwrap();
        let decrypted = decrypt(&key, &ciphertext).unwrap();
        assert_eq!(decrypted, plaintext);
    }
}
