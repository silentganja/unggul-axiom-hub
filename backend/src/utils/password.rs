use crate::errors::AppError;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

/// Hash a plaintext password using Argon2id with a random salt.
/// The returned string is the PHC-encoded hash (safe to store in DB).
pub fn hash_password(plain: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default(); // Argon2id variant by default

    argon2
        .hash_password(plain.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| {
            tracing::error!("Password hashing error: {:?}", e);
            AppError::Internal(anyhow::anyhow!("Password hashing failed"))
        })
}

/// Verify a plaintext password against a stored Argon2 PHC hash.
/// Returns `true` if it matches, `false` otherwise.
/// Bubbles up `AppError::Internal` only on structural hash parse errors.
pub fn verify_password(plain: &str, hash: &str) -> Result<bool, AppError> {
    let parsed = PasswordHash::new(hash).map_err(|e| {
        tracing::error!("Invalid password hash format: {:?}", e);
        AppError::Internal(anyhow::anyhow!("Invalid password hash"))
    })?;

    Ok(Argon2::default()
        .verify_password(plain.as_bytes(), &parsed)
        .is_ok())
}
