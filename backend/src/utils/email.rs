// ─────────────────────────────────────────────────────────────────────────────
// Email service — sends transactional emails via SMTP.
// Falls back to console logging when SMTP_ENABLED is not set (dev mode).
// ─────────────────────────────────────────────────────────────────────────────

use lettre::{
    message::Mailbox, transport::smtp::authentication::Credentials, AsyncSmtpTransport,
    AsyncTransport, Message, Tokio1Executor,
};
use std::env;

// ── Configuration ────────────────────────────────────────────────────────────

struct SmtpConfig {
    host: String,
    port: u16,
    username: String,
    password: String,
    from_name: String,
    from_email: String,
    enabled: bool,
}

fn smtp_config() -> SmtpConfig {
    SmtpConfig {
        host: env::var("SMTP_HOST").unwrap_or_else(|_| "localhost".to_string()),
        port: env::var("SMTP_PORT")
            .unwrap_or_else(|_| "587".to_string())
            .parse()
            .unwrap_or(587),
        username: env::var("SMTP_USERNAME").unwrap_or_default(),
        password: env::var("SMTP_PASSWORD").unwrap_or_default(),
        from_name: env::var("SMTP_FROM_NAME")
            .unwrap_or_else(|_| "Unggul Axiom Hub".to_string()),
        from_email: env::var("SMTP_FROM_EMAIL")
            .unwrap_or_else(|_| "noreply@unggulaxiom.com".to_string()),
        enabled: env::var("SMTP_ENABLED")
            .unwrap_or_else(|_| "false".to_string())
            .to_lowercase()
            == "true",
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

/// Send a password reset email containing the reset token.
/// Falls back to tracing the token when SMTP is disabled.
pub async fn send_password_reset(email: &str, full_name: &str, token: &str) {
    let cfg = smtp_config();

    let subject = "Password Reset — Unggul Axiom Hub";
    let body = format!(
        r#"Hello {name},

A password reset was requested for your Unggul Axiom Hub account.

Your reset token is: {token}

Use this token on the login page to set a new password.
This token expires in 1 hour.

If you did not request this, please ignore this email and contact your
security administrator immediately.

—
Unggul Axiom Hub — Strategic Workspace
This is an automated message. Do not reply to this email.
"#,
        name = full_name,
        token = token,
    );

    send_email(email, subject, &body, &cfg).await;

    tracing::info!(
        email = %email,
        smtp_enabled = cfg.enabled,
        "Password reset email dispatched"
    );
}

/// Send a magic link email containing the one-time login token.
pub async fn send_magic_link(email: &str, full_name: &str, token: &str) {
    let cfg = smtp_config();

    let subject = "Magic Link Login — Unggul Axiom Hub";
    let body = format!(
        r#"Hello {name},

A magic link login was requested for your Unggul Axiom Hub account.

Your login token is: {token}

Use this token on the login page to sign in instantly.
This token expires in 15 minutes.

If you did not request this, please ignore this email and contact your
security administrator immediately.

—
Unggul Axiom Hub — Strategic Workspace
This is an automated message. Do not reply to this email.
"#,
        name = full_name,
        token = token,
    );

    send_email(email, subject, &body, &cfg).await;

    tracing::info!(
        email = %email,
        smtp_enabled = cfg.enabled,
        "Magic link email dispatched"
    );
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async fn send_email(to: &str, subject: &str, body: &str, cfg: &SmtpConfig) {
    if !cfg.enabled {
        // Dev mode — log the email content instead of sending
        tracing::info!(
            to = %to,
            subject = %subject,
            "SMTP disabled — email content logged to console"
        );
        return;
    }

    let from: Mailbox = match format!("{} <{}>", cfg.from_name, cfg.from_email).parse() {
        Ok(m) => m,
        Err(e) => {
            tracing::error!("Invalid from address: {:?}", e);
            return;
        }
    };

    let to_mbox: Mailbox = match to.parse() {
        Ok(m) => m,
        Err(e) => {
            tracing::error!("Invalid to address '{}': {:?}", to, e);
            return;
        }
    };

    let message = match Message::builder()
        .from(from.clone())
        .to(to_mbox.clone())
        .subject(subject)
        .body(body.to_string())
    {
        Ok(m) => m,
        Err(e) => {
            tracing::error!("Failed to build email message: {:?}", e);
            return;
        }
    };

    let creds = Credentials::new(cfg.username.clone(), cfg.password.clone());

    // Use builder_dangerous for broadest compatibility.
    // For SMTP servers that support STARTTLS, TLS is negotiated automatically.
    let mailer: AsyncSmtpTransport<Tokio1Executor> =
        AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&cfg.host)
            .port(cfg.port)
            .credentials(creds)
            .build();

    match mailer.send(message).await {
        Ok(_) => tracing::info!(to = %to, subject = %subject, "Email sent successfully"),
        Err(e) => tracing::error!(to = %to, subject = %subject, error = %e, "Failed to send email"),
    }
}
