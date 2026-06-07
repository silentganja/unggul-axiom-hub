# Unggul Axiom - Hub

<p align="center">
  <strong>Sovereign Enterprise Cloud Storage & Collaboration Platform</strong>
  <br>
  <sub>Purpose-built for environments where data classification, audit integrity, and access control aren't optional. Deployed and running at scale.</sub>
</p>

<p align="center">
  <a href="https://hub.unggulaxiom.com"><img src="https://img.shields.io/badge/live-online-success?style=flat" alt="Live"></a>
  <img src="https://img.shields.io/badge/rust-1.85%2B-orange?logo=rust" alt="Rust">
  <img src="https://img.shields.io/badge/next.js-16-black?logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/react-19-087ea4?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/postgresql-16-336791?logo=postgresql" alt="PostgreSQL 16">
  <img src="https://img.shields.io/badge/tailwind-v4-06B6D4?logo=tailwindcss" alt="Tailwind v4">
  <img src="https://img.shields.io/badge/deploy-aws_lightsail-FF9900?logo=amazonaws" alt="AWS Lightsail">
</p>

---

> **Live app:** [hub.unggulaxiom.com](https://hub.unggulaxiom.com) &nbsp;|&nbsp; **Demo login:** `demo@unggulaxiom.com` / `demo` &nbsp;|&nbsp; **Documentation:** [hub.unggulaxiom.com/dev/admin/doc](https://hub.unggulaxiom.com/dev/admin/doc)

---

## What I built

A secure document collaboration platform that handles the full lifecycle of classified files: upload, encrypt, classify, share, approve, audit, and recover. At its core is a **dynamic RBAC engine** with granular permission resolution, a **classification access control system** that enforces tier-based read/write rules, and a **dual-signature governance workflow** for all sensitive operations.

The system goes beyond authentication and CRUD. It includes: AES-256-GCM file encryption, immutable audit trails with before/after diffs, WebAuthn passkeys, SSE-based real-time notifications, full-text search via PostgreSQL tsvector, file versioning with soft-delete recovery, and a database reset tool for production go-live. Built for the kind of environment where a single permission misconfiguration can have real consequences.

This isn't a tutorial project. It's a demonstration of what production engineering looks like when you treat security, observability, and deployment as first-class concerns.

---

## Why this matters to an engineering leader

**I ship working systems, not just code.** This platform runs on AWS Lightsail behind Nginx with automated CI/CD. Every push to main goes through linting, type-checking, Clippy, Docker builds, ECR push, and zero-downtime redeploy. No manual steps. No "works on my machine."

**I make deliberate architectural choices.** Rust on the backend was not the easy path. It meant slower initial development. I chose it anyway because memory safety and predictable latency matter for a storage platform. Raw SQL over an ORM means more boilerplate upfront, but every query is visible, reviewable, and optimized. These trade-offs show judgment, not just technical ability.

**I think about failure modes.** What happens when a JWT expires mid-session? (Silent refresh with retry.) What if someone brute-forces the login? (Redis-backed rate limiting.) What if a file gets deleted accidentally? (Soft delete with configurable retention and permanent purge.) What if an admin abuses their access? (Dual-signature approval, append-only audit logs with before/after diffs.) These aren't afterthoughts. They're baked into the architecture.

**I understand the operational side.** Multi-stage Docker builds separate build dependencies from runtime. Non-root container users. Health checks on every service. TLS termination at the reverse proxy. Environment variables for all configuration. No hardcoded secrets anywhere. These are the habits of someone who has run production systems, not just built them for a portfolio.

---

## System architecture

```
Client (Browser)
    │
    ▼
┌────────────────────────────────────────┐
│  Nginx Reverse Proxy  (TLS, HTTP/2)     │
│  Security headers, rate limit pass-thru │
└────────────────────────────────────────┘
    │                    │
    ▼                    ▼
┌──────────────┐  ┌──────────────────────────┐
│  Next.js 16  │  │  Rust API (Actix-Web 4)  │
│  React 19    │──│                          │
│  SSR + RSC   │  │  Auth: JWT + WebAuthn    │
│  Zustand     │  │  Dynamic RBAC engine      │
│  Tailwind v4 │  │  Classification access    │
└──────────────┘  │  Governance engine       │
                  │  AES-256-GCM encryption  │
                  │  SSE notifications        │
                  │  Redis rate limiter       │
                  └────────┬─────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌──────────┐            ┌──────────┐
        │PostgreSQL│            │  Redis 7 │
        │   16     │            │          │
        │19 migrat.│            │sessions  │
        │FTS, JSON │            │rate lim. │
        └──────────┘            │pub/sub   │
                                └──────────┘
```

```
unggul-axiom-hub/
├── backend/                  Rust API
│   ├── src/
│   │   ├── handlers/         13 modules, 75+ endpoints
│   │   ├── models/           8 domain models
│   │   ├── utils/            crypto, jwt, redis, email, storage, migrations
│   │   └── app_middleware/   auth extraction, admin guard, rate limiting
│   ├── migrations/           19 versioned SQLx auto-migrations
│   └── Dockerfile            rust:slim -> debian:bookworm-slim (non-root)
│
├── frontend/                 Next.js 16
│   ├── app/                  25+ routes including admin panel + documentation
│   ├── components/           UI primitives + feature components
│   ├── lib/                  API client with automatic token refresh
│   └── store/                Zustand stores
│
├── infra/
│   ├── nginx/                TLS, security headers, reverse proxy config
│   └── postgres/             Database initialization
│
├── .github/workflows/        CI/CD: lint -> verify -> build -> push -> deploy
├── docker-compose.yml        Full local dev stack
└── docker-compose.prod.yml   Production stack (ECR images, env-var driven)
```

---

## Feature depth

### Dynamic Role-Based Access Control

The system has a fully dynamic RBAC engine — not hardcoded role checks. 19 atomic permission keys (files:read, governance:approve, classifications:manage, etc.) flow through a single resolution function (`user_has_permission`) that evaluates three sources in a UNION query: direct user overrides, base role implicit grants, and role group memberships. Permissions are additive — users get the union of all their groups.

**Role Builder admin panel** with four sub-tabs:
- **Groups** — Named bundles of permissions with user assignment. Quick presets (Read-Only Auditor, Content Manager, User Manager, Governance Officer, Full Access). Duplicate functionality for templating.
- **Permissions** — Full CRUD for permission definitions. Before-delete warnings show exactly where each permission is used (groups, roles, classification rules, user overrides).
- **Roles** — Custom base roles with configurable hierarchy levels (1-10) and implicit permission grants. The 4 core roles (chief, director, officer, staff) are protected from deletion.
- **Audit** — Per-user effective permissions matrix with source attribution (base role, group inheritance, or direct override). Direct overrides for exceptions.

**Granular admin delegation** splits the legacy `users:manage` umbrella into `permissions:manage`, `role_groups:manage`, and `role_groups:assign` — with backward-compatible fallback.

### Classification Access Control

Dynamic classification tiers (TERBUKA, TERHAD, SULIT, RAHSIA + custom tiers) with per-tier read/write access rules. Each tier defines which permissions grant read access (who can view) and write access (who can assign/change). Chief and Director bypass all checks. All other roles are evaluated against the configured rules.

**Classification Builder admin panel** with two sub-tabs:
- **Tiers** — Create, edit, delete. Key changes cascade to all files in a single transaction. Deletion blocked if files use the tier.
- **Access Control** — Per-tier permission checkboxes for read and write access. Site-wide default rules auto-apply to newly created tiers.

Classification enforcement at every boundary: file listing, download, preview, upload, classification change, sharing, and governance approval.

### Governance & Approval Workflow

Dual-signature approval for sensitive operations: FILE_LOCK, FILE_UNLOCK, CLASSIFICATION_UPGRADE, CLASSIFICATION_DOWNGRADE, FILE_MOVE, FILE_DELETE. Users submit requests; authorized approvers review and approve/reject with written justification.

**Governance engine** features:
- Supervisor notification — requests notify the user's designated supervisor via SSE
- Classification direction validation — upgrades must go to higher levels, downgrades to lower
- Force Approve/Reject — admins can act on behalf of a selected reviewer
- Undo — revert approved/rejected requests to PENDING
- Batch operations — approve or reject multiple requests at once
- Self-approval prevention — you cannot approve your own requests

### File Management

Upload (with classification selection), download, preview, rename, move, delete. Folder hierarchy with breadcrumb navigation. Full-text search via PostgreSQL tsvector. Classification filter in the file browser. Dynamic classification badges color-coded by hierarchy level (gray → blue → yellow → red).

### Sharing & Collaboration

Share files with role-based permissions (viewer, editor). Classification-gated sharing — restricted files require recipient clearance. Locked files protected from unauthorized sharing. Shared files filtered by classification read access.

### Versioning & Recovery

Every file modification preserves the previous version. Soft delete moves files to trash. Restore within retention window. Permanent purge after expiry. All tracked in audit log.

### Authentication

Argon2id password hashing (memory-hard, GPU-resistant). WebAuthn/FIDO2 passkeys. Magic link login via email. JWT with access and refresh token rotation. Sessions viewable and revocable per device. Two admin auth paths: hardcoded super-admin and delegated admin via `admin:access` permission.

### Admin Panel

12-tab admin console with granular permission gating:
- **Dashboard** — System metrics (users, files, storage, governance)
- **Users** — Full lifecycle management, bulk import, role assignment
- **Governance** — Force approve/reject, undo, batch operations with reviewer selection
- **Files** — Browse all files, force delete, transfer ownership
- **Audit** — Chronological log viewer with 30+ action types, JSON diff rendering for permission/classification changes
- **Shares** — All sharing relationships with revoke capability
- **Storage** — Per-user analytics, classification breakdown
- **Roles** — Full RBAC management (4 sub-tabs)
- **Classifications** — Tier and access rule management (2 sub-tabs)
- **Config** — System-wide settings (theme, org name, logo, default classification rules)
- **System** — Database Reset tool with multi-factor consent
- **Documentation** — 10-page comprehensive guide covering all features

### Database Reset & Initialize

Multi-guard destructive operation for production go-live. Wipes 9 transactional tables (files, shares, audit logs, governance requests, memberships, overrides, auth tokens) while preserving 10 structural tables (users, permissions, groups, roles, classifications, system config). Safety model: super-admin only, one-time 8-char consent token with 5-minute expiry, single database transaction with full rollback on failure, audit logged.

### Real-Time Updates

SSE stream for live notifications on shares, approvals, governance updates, and system events. No polling. Notifications targeted to specific users and supervisors.

### Audit Trail

Append-only log of every critical action — 30+ action types covering file operations, governance, user management, role builder mutations, classification changes, and system events. Rich diffs for permission and classification rule changes: JSON before/after snapshots stored in the audit record, enabling full reconstruction of who changed what and when.

### Security Hardening

AES-256-GCM file encryption at rest. Redis-backed distributed rate limiting (login, governance actions). Security headers via Nginx (CSP, HSTS, X-Frame-Options, Referrer-Policy). Non-root container users. Argon2id password hashing. No hardcoded secrets. CI/CD authenticates to AWS via OIDC — no static IAM keys stored in GitHub. 15-minute idle timeout on admin panel. Step-up authentication for critical actions.

---

## Key architectural decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend runtime | Rust (Actix-Web 4) | Memory safety without garbage collection. Predictable p95 latency under 10ms. The learning curve and slower iteration speed are real costs, but justified for a storage platform where correctness and throughput matter. |
| Database access | SQLx with raw SQL | No ORM abstraction. Every query lives in source code where it can be reviewed, explained, and optimized. 19 versioned, idempotent auto-migrations checked into the repo. |
| RBAC architecture | Dynamic DB-driven | Permissions, roles, groups, and assignments all live in PostgreSQL — not hardcoded. Adding a new permission or role requires zero code changes. The `user_has_permission` function is the single resolution entry point. |
| Classification model | Tier-based with access rules | Each classification tier has configurable read/write rules mapping permissions to access types. New tiers auto-inherit site-wide defaults. Chief/Director fast-path bypasses checks. |
| Governance model | Dual-signature with force path | Sensitive operations require approval. Force Approve/Reject enables admin override with reviewer selection. Supervisor notification creates accountability without blocking workflow. |
| Password hashing | Argon2id | Winner of the Password Hashing Competition. Memory-hard makes GPU/ASIC attacks impractical. The standard choice for systems that take credential storage seriously. |
| File encryption | AES-256-GCM | Authenticated encryption. Confidentiality and integrity in a single pass. The GCM mode provides built-in authentication, so tampered ciphertext is detected before decryption. |
| Auth architecture | JWT + refresh tokens + WebAuthn | Stateless API auth keeps latency low. Refresh tokens allow revocation without hitting the database on every request. Passkeys eliminate phishing as an attack vector. |
| Frontend state | Zustand | Client state management with minimal boilerplate. Stores for files, auth, operations, notifications, and admin — each independently testable. |
| CI/CD authentication | AWS OIDC | GitHub Actions gets temporary AWS credentials per workflow run. No IAM user access keys exist to leak or rotate. This is the gold standard for cloud CI/CD auth. |
| Container strategy | Multi-stage Docker | Build stage has the full Rust toolchain and dev dependencies. Runtime image is bare Debian Slim running as non-root. Attack surface minimized. Image size kept small. |

---

## Running locally

### Docker

```bash
git clone https://github.com/silentganja/unggul-axiom-hub.git
cd unggul-axiom-hub
cp backend/.env.example backend/.env
docker compose up --build
```

Opens at http://localhost:3000. Backend API at http://localhost:8080.

### Without Docker

Prerequisites: Rust 1.85+, Node 20+, PostgreSQL 16, Redis 7.

```bash
# Backend
cd backend && cp .env.example .env && cargo run

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

---

## Tech stack summary

| Layer | Technologies |
|-------|-------------|
| Backend | Rust, Actix-Web 4, SQLx 0.8, Redis 0.25, Argon2id, AES-256-GCM, Lettre, Tokio, Anyhow |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Zustand, Lucide Icons |
| Data | PostgreSQL 16 (19 versioned auto-migrations, tsvector FTS, JSON), Redis 7 (sessions, rate limiting, pub/sub) |
| Infrastructure | Nginx (TLS 1.3, HTTP/2, security headers), Docker multi-stage, GitHub Actions, AWS OIDC |
| Cloud | AWS Lightsail (VPS), AWS ECR (container registry) |
| Observability | Tokio Tracing, append-only audit trail (30+ action types), SSE notifications, container health checks |
| Testing | Rust unit tests (80 tests: auth, crypto, files, RBAC, classifications), TypeScript store tests |

---

## Live system stats

| Metric | Value |
|--------|-------|
| Backend endpoints | 75+ |
| Auto-migrations | 19 |
| Permission keys | 19 |
| Audit action types | 30+ |
| Admin panel tabs | 12 |
| Documentation pages | 10 |
| Rust unit tests | 80 |
| Classification tiers | 4 default + dynamic custom |

---

## License

Source-available. All rights reserved. Read the code, learn from it, fork it. Commercial use, redistribution, or derivative works require permission.

---

## About me

I'm a software engineer who builds secure, well-architected systems. This project represents my best work: a platform designed with real security requirements, built with production discipline, and running live so you can see it working.

I'm looking for backend, full-stack, or platform engineering roles where I can work on infrastructure, security, or systems that need to be right the first time.

**Contact:** [LinkedIn](https://www.linkedin.com/in/ahmad-mirza-0b606b278/) &middot; [ahmadmrza0404@gmail.com](mailto:ahmadmrza0404@gmail.com)

---

*Full documentation, interactive architecture diagrams, API reference, and live telemetry: [hub.unggulaxiom.com/dev/admin/doc](https://hub.unggulaxiom.com/dev/admin/doc)*
