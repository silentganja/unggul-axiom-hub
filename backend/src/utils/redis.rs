// ─────────────────────────────────────────────────────────────────────────────
// Redis client — synchronous connection pool shared across the application.
// Async wrappers use `web::block` to avoid depending on unstable `redis::aio`.
// ─────────────────────────────────────────────────────────────────────────────

use std::env;
use std::sync::Mutex;

/// Thin wrapper around a synchronous Redis connection.
/// Protected by a Mutex for thread safety — actix handlers acquire the lock
/// briefly for each operation.
pub struct RedisClient {
    client: redis::Client,
    conn: Mutex<redis::Connection>,
}

impl RedisClient {
    /// Create a new Redis client and open a persistent connection.
    pub fn new() -> Self {
        let url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string());
        let client = redis::Client::open(url.as_str()).expect("Invalid REDIS_URL");
        let conn = client.get_connection().expect("Failed to connect to Redis");
        Self {
            client,
            conn: Mutex::new(conn),
        }
    }

    /// Execute a synchronous Redis command, returning a typed result.
    /// Locks the connection for the duration of the operation.
    pub fn execute<T: redis::FromRedisValue>(
        &self,
        f: impl FnOnce(&mut redis::Connection) -> redis::RedisResult<T>,
    ) -> redis::RedisResult<T> {
        let mut conn = self.conn.lock().unwrap();
        f(&mut conn)
    }

    /// Get the underlying client (for spawning new connections if needed).
    #[allow(dead_code)]
    pub fn client(&self) -> &redis::Client {
        &self.client
    }
}

// ── Async wrappers for actix handlers ────────────────────────────────────────

use actix_web::web;

/// Run a sync Redis operation via web::block (truly async, non-blocking).
async fn block_redis<T, F>(
    client: &web::Data<RedisClient>,
    f: F,
) -> Result<T, crate::errors::AppError>
where
    T: Send + redis::FromRedisValue + 'static,
    F: FnOnce(&mut redis::Connection) -> redis::RedisResult<T> + Send + 'static,
{
    let client = client.clone();
    web::block(move || client.execute(f))
        .await
        .map_err(|e| crate::errors::AppError::Redis(e.to_string()))
        .and_then(|r| r.map_err(|e| crate::errors::AppError::Redis(e.to_string())))
}

// ── High-level async helpers (used in handlers) ──────────────────────────────

pub async fn store_refresh_token_async(
    client: &web::Data<RedisClient>,
    token: &str,
    user_id: &str,
    role: &str,
) -> Result<(), crate::errors::AppError> {
    let t = token.to_string();
    let u = user_id.to_string();
    let r = role.to_string();
    block_redis(client, move |conn| {
        store_refresh_token_sync(conn, &t, &u, &r)
    })
    .await
}

pub async fn take_refresh_token_async(
    client: &web::Data<RedisClient>,
    token: &str,
) -> Result<Option<(String, String)>, crate::errors::AppError> {
    let t = token.to_string();
    block_redis(client, move |conn| take_refresh_token_sync(conn, &t)).await
}

pub async fn revoke_user_tokens_async(
    client: &web::Data<RedisClient>,
    user_id: &str,
) -> Result<(), crate::errors::AppError> {
    let u = user_id.to_string();
    block_redis(client, move |conn| revoke_user_tokens_sync(conn, &u)).await
}

pub async fn redis_setex_async(
    client: &web::Data<RedisClient>,
    key: &str,
    value: &str,
    ttl_secs: u64,
) -> Result<(), crate::errors::AppError> {
    let k = key.to_string();
    let v = value.to_string();
    block_redis(client, move |conn| {
        redis::cmd("SETEX")
            .arg(&k)
            .arg(ttl_secs)
            .arg(&v)
            .query(conn)
    })
    .await
}

pub async fn redis_get_async(
    client: &web::Data<RedisClient>,
    key: &str,
) -> Result<Option<String>, crate::errors::AppError> {
    let k = key.to_string();
    block_redis(client, move |conn| redis::cmd("GET").arg(&k).query(conn)).await
}

pub async fn redis_del_async(
    client: &web::Data<RedisClient>,
    key: &str,
) -> Result<(), crate::errors::AppError> {
    let k = key.to_string();
    block_redis(client, move |conn| {
        redis::cmd("DEL").arg(&k).query::<()>(conn)
    })
    .await
}

pub async fn check_rate_limit_async(
    client: &web::Data<RedisClient>,
    prefix: &str,
    identifier: &str,
    max_requests: u64,
    window_secs: u64,
) -> Result<bool, crate::errors::AppError> {
    let p = prefix.to_string();
    let i = identifier.to_string();
    block_redis(client, move |conn| {
        check_rate_limit_sync(conn, &p, &i, max_requests, window_secs)
    })
    .await
}

// ── Refresh token helpers ────────────────────────────────────────────────────

pub const REFRESH_TOKEN_TTL_SECS: u64 = 7 * 24 * 3600; // 7 days

/// Store a refresh token in Redis: `refresh:{token}` → JSON payload.
pub fn store_refresh_token_sync(
    conn: &mut redis::Connection,
    token: &str,
    user_id: &str,
    role: &str,
) -> redis::RedisResult<()> {
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
        .query(conn)
}

/// Retrieve and delete a refresh token (single-use rotation).
pub fn take_refresh_token_sync(
    conn: &mut redis::Connection,
    token: &str,
) -> redis::RedisResult<Option<(String, String)>> {
    let key = format!("refresh:{}", token);
    let raw: Option<String> = redis::cmd("GET").arg(&key).query(conn)?;

    let Some(raw) = raw else {
        return Ok(None);
    };

    // Delete so it cannot be reused
    redis::cmd("DEL").arg(&key).query::<()>(conn)?;

    let parsed: serde_json::Value = serde_json::from_str(&raw).unwrap_or(serde_json::Value::Null);
    let user_id = parsed["user_id"].as_str().unwrap_or("").to_string();
    let role = parsed["role"].as_str().unwrap_or("").to_string();

    if user_id.is_empty() {
        return Ok(None);
    }

    Ok(Some((user_id, role)))
}

/// Increment the token generation counter for a user (revokes all tokens).
pub fn revoke_user_tokens_sync(
    conn: &mut redis::Connection,
    user_id: &str,
) -> redis::RedisResult<()> {
    let key = format!("user_token_gen:{}", user_id);
    redis::cmd("INCR").arg(&key).query::<()>(conn)?;
    Ok(())
}

// ── Rate limiting helpers ────────────────────────────────────────────────────

/// Sliding-window rate limit check (synchronous, runs inside web::block).
pub fn check_rate_limit_sync(
    conn: &mut redis::Connection,
    prefix: &str,
    identifier: &str,
    max_requests: u64,
    window_secs: u64,
) -> redis::RedisResult<bool> {
    let key = format!("rl:{}:{}", prefix, identifier);
    let now_ms = current_time_ms();

    let script = redis::Script::new(
        r#"
        local key    = KEYS[1]
        local now    = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local max_req = tonumber(ARGV[3])

        redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)

        local count = redis.call('ZCARD', key)

        if count >= max_req then
            return 0
        end

        redis.call('ZADD', key, now, now .. ':' .. count)
        redis.call('EXPIRE', key, window)
        return 1
        "#,
    );

    script
        .key(&key)
        .arg(now_ms)
        .arg(window_secs)
        .arg(max_requests)
        .invoke(conn)
}

pub fn current_time_ms() -> u64 {
    use std::time::SystemTime;
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
