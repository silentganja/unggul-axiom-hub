use crate::errors::AppError;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

/// Validate password strength.
///
/// Enforces:
/// - Minimum 8 characters
/// - At least one uppercase letter
/// - At least one lowercase letter
/// - At least one digit
///
/// Returns `Ok(())` if the password passes all checks, or `Err(msg)` with a
/// human-readable explanation of which rule failed.
pub fn validate_password_strength(password: &str) -> Result<(), &'static str> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters");
    }
    if !password.chars().any(|c| c.is_ascii_uppercase()) {
        return Err("Password must contain at least one uppercase letter (A-Z)");
    }
    if !password.chars().any(|c| c.is_ascii_lowercase()) {
        return Err("Password must contain at least one lowercase letter (a-z)");
    }
    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Err("Password must contain at least one digit (0-9)");
    }
    Ok(())
}

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

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    mod password_strength {
        use super::*;

        #[test]
        fn valid_password() {
            assert!(validate_password_strength("SecurePass1").is_ok());
            assert!(validate_password_strength("A1bcdefgh").is_ok());
            assert!(validate_password_strength("P@ssw0rd!").is_ok());
        }

        #[test]
        fn too_short() {
            assert!(validate_password_strength("Ab1").is_err());
            assert!(validate_password_strength("Abcde1").is_err());
        }

        #[test]
        fn no_uppercase() {
            assert!(validate_password_strength("alllowercase1").is_err());
        }

        #[test]
        fn no_lowercase() {
            assert!(validate_password_strength("ALLUPPERCASE1").is_err());
        }

        #[test]
        fn no_digit() {
            assert!(validate_password_strength("NoDigitsHere").is_err());
        }

        #[test]
        fn exactly_eight_chars() {
            assert!(validate_password_strength("Abcdefg1").is_ok());
        }
    }

    #[test]
    fn hash_and_verify_roundtrip() {
        let plain = "correct-horse-battery-staple";
        let hash = hash_password(plain).expect("hashing should succeed");
        assert!(hash.starts_with("$argon2id$"), "must use Argon2id variant");

        let valid = verify_password(plain, &hash).expect("verification should succeed");
        assert!(valid, "correct password must verify as true");
    }

    #[test]
    fn wrong_password_returns_false() {
        let hash = hash_password("the-real-password").unwrap();
        let valid = verify_password("wrong-password", &hash).expect("verification should succeed");
        assert!(!valid, "wrong password must return false, not error");
    }

    #[test]
    fn empty_password() {
        let hash = hash_password("").expect("empty password should hash fine");
        assert!(!hash.is_empty());

        let valid = verify_password("", &hash).unwrap();
        assert!(valid, "empty password must roundtrip");
    }

    #[test]
    fn unicode_password() {
        let plain = "パスワード管理システム🔒";
        let hash = hash_password(plain).unwrap();
        let valid = verify_password(plain, &hash).unwrap();
        assert!(valid);
    }

    #[test]
    fn long_password() {
        let plain = "a".repeat(1024);
        let hash = hash_password(&plain).expect("long password should hash fine");
        let valid = verify_password(&plain, &hash).unwrap();
        assert!(valid);
    }

    #[test]
    fn invalid_hash_format_returns_error() {
        let result = verify_password("anything", "not-a-valid-phc-hash");
        assert!(result.is_err(), "garbage hash must return AppError::Internal");
    }

    #[test]
    fn each_hash_has_unique_salt() {
        let plain = "same-password-twice";
        let h1 = hash_password(plain).unwrap();
        let h2 = hash_password(plain).unwrap();
        assert_ne!(h1, h2, "different salts must produce different hashes");
    }

    #[test]
    fn case_sensitive() {
        let hash = hash_password("CaseSensitive").unwrap();
        assert!(verify_password("CaseSensitive", &hash).unwrap());
        assert!(!verify_password("casesensitive", &hash).unwrap());
        assert!(!verify_password("CASESENSITIVE", &hash).unwrap());
    }
}
