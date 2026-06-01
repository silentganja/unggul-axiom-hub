// ─────────────────────────────────────────────────────────────────────────────
// Redis client — async connection manager shared across the application.
// Provides helpers for refresh tokens, rate limiting, and cache operations.
// ─────────────────────────────────────────────────────────────────────────────

use redis::aio::ConnectionManager;
use redis::RedisResult;
use std::env;

/// Create a Redis connection manager from the REDIS_URL environment variable.
pub async fn connect() -> ConnectionManager {
    let url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());

    let client = redis::Client::open(url.as_str()).expect("Invalid REDIS_URL");
    redis::aio::ConnectionManager::new(client)
        .await
        .expect("Failed to connect to Redis")
}

// ── Refresh token helpers ────────────────────────────────────────────────────

pub const REFRESH_TOKEN_TTL_SECS: u64 = 7 * 24 * 3600; // 7 days

/// Store a refresh token in Redis: `refresh:{token}` → JSON payload.
pub async fn store_refresh_token(
    conn: &mut ConnectionManager,
    token: &str,
    user_id: &str,
    role: &str,
) -> RedisResult<()> {
    let key = format!("refresh:{}", token);
    let value = serde_json::json!({
        "user_id": user_id,
        "role": role,
    })
    .to_string();
    redis::cmd("SETEX")
        .arg(&key)
        .arg(REFRESH_TOKEN_TTL_SECS)
        .arg(&value)
        .query_async(conn)
        .await
}

/// Retrieve and optionally delete a refresh token.
/// Returns `Some((user_id, role))` if valid, `None` if expired or missing.
pub async fn take_refresh_token(
    conn: &mut ConnectionManager,
    token: &str,
) -> RedisResult<Option<(String, String)>> {
    let key = format!("refresh:{}", token);

    // GET the token payload
    let raw: Option<String> = redis::cmd("GET").arg(&key).query_async(conn).await?;

    let Some(raw) = raw else {
        return Ok(None);
    };

    // DELETE it so it cannot be reused (token rotation)
    redis::cmd("DEL").arg(&key).query_async::<_, ()>(conn).await?;

    let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);
    let user_id = parsed["user_id"].as_str().unwrap_or("").to_string();
    let role = parsed["role"].as_str().unwrap_or("").to_string();

    if user_id.is_empty() {
        return Ok(None);
    }

    Ok(Some((user_id, role)))
}

/// Revoke all refresh tokens for a user (used on password change / admin deactivation).
pub async fn revoke_user_tokens(conn: &mut ConnectionManager, user_id: &str) -> RedisResult<()> {
    // We can't efficiently find all tokens for a user without scanning.
    // Instead, store a "token generation" counter per user and invalidate
    // all tokens older than the current generation.
    let key = format!("user_token_gen:{}", user_id);
    redis::cmd("INCR").arg(&key).query_async::<_, ()>(conn).await?;
    Ok(())
}

/// Get the current token generation for a user.
pub async fn get_token_generation(conn: &mut ConnectionManager, user_id: &str) -> RedisResult<u64> {
    let key = format!("user_token_gen:{}", user_id);
    let gen: Option<u64> = redis::cmd("GET").arg(&key).query_async(conn).await?;
    Ok(gen.unwrap_or(0))
}

// ── Rate limiting helpers ────────────────────────────────────────────────────

/// Sliding-window rate limit check.
///
/// - `prefix`: namespace key (e.g. "login").
/// - `identifier`: typically the client IP.
/// - `max_requests`: maximum allowed requests in the window.
/// - `window_secs`: size of the sliding window in seconds.
///
/// Returns `true` if the request is allowed (under the limit), `false` if
/// rate-limited.
pub async fn check_rate_limit(
    conn: &mut ConnectionManager,
    prefix: &str,
    identifier: &str,
    max_requests: u64,
    window_secs: u64,
) -> RedisResult<bool> {
    let key = format!("rl:{}:{}", prefix, identifier);
    let now_ms = current_time_ms();

    // Lua script atomically cleans old entries, counts, and adds the new one
    let script = redis::Script::new(
        r#"
        local key    = KEYS[1]
        local now    = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local max_req = tonumber(ARGV[3])

        -- Remove entries outside the sliding window
        redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)

        -- Count remaining (within-window) entries
        local count = redis.call('ZCARD', key)

        if count >= max_req then
            return 0
        end

        -- Add current request timestamp with a unique sub-millisecond member
        redis.call('ZADD', key, now, now .. ':' .. count)
        redis.call('EXPIRE', key, window)
        return 1
        "#,
    );

    let result: i32 = script
        .key(&key)
        .arg(now_ms)
        .arg(window_secs)
        .arg(max_requests)
        .invoke_async(conn)
        .await?;

    Ok(result == 1)
}

/// Return current epoch in milliseconds.
pub fn current_time_ms() -> u64 {
    use std::time::SystemTime;
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
