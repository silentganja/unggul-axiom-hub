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

> **Live app:** [hub.unggulaxiom.com](https://hub.unggulaxiom.com) &nbsp;|&nbsp; **Demo login:** `demo@unggulaxiom.com` / `demo` &nbsp;|&nbsp; **Project specs:** [hub.unggulaxiom.com/v/info](https://hub.unggulaxiom.com/v/info)

---

## What I built

A secure document collaboration platform that handles the full lifecycle of classified files: upload, encrypt, classify, share, approve, audit, and recover.

Most projects stop at authentication and CRUD. I went further: dual-signature governance workflows, AES-256-GCM file encryption, immutable audit trails, WebAuthn passkeys, SSE-based notifications, full-text search, versioning with soft-delete recovery. The kind of system a government agency or regulated enterprise actually needs.

This isn't a tutorial project. It's a demonstration of what production engineering looks like when you treat security, observability, and deployment as first-class concerns.

---

## Why this matters to an engineering leader

**I ship working systems, not just code.** This platform runs on AWS Lightsail behind Nginx with automated CI/CD. Every push to main goes through linting, type-checking, Clippy, Docker builds, ECR push, and zero-downtime redeploy. No manual steps. No "works on my machine."

**I make deliberate architectural choices.** Rust on the backend was not the easy path. It meant slower initial development. I chose it anyway because memory safety and predictable latency matter for a storage platform. Raw SQL over an ORM means more boilerplate upfront, but every query is visible, reviewable, and optimized. These trade-offs show judgment, not just technical ability.

**I think about failure modes.** What happens when a JWT expires mid-session? (Silent refresh with retry.) What if someone brute-forces the login? (Redis-backed rate limiting.) What if a file gets deleted accidentally? (Soft delete with configurable retention and permanent purge.) What if an admin abuses their access? (Dual-signature approval, append-only audit logs.) These aren't afterthoughts. They're baked into the architecture.

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
│  Zustand     │  │  RBAC middleware          │
│  React Query │  │  AES-256-GCM encryption  │
└──────────────┘  │  Governance engine       │
                  │  SSE notifications        │
                  │  Redis rate limiter       │
                  └────────┬─────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
        ┌──────────┐            ┌──────────┐
        │PostgreSQL│            │  Redis 7 │
        │   16     │            │          │
        │15 migrat.│            │sessions  │
        │FTS, JSON │            │rate lim. │
        └──────────┘            │pub/sub   │
                                └──────────┘
```

```
unggul-axiom-hub/
├── backend/                  Rust API
│   ├── src/
│   │   ├── handlers/         10 modules, 60+ endpoints
│   │   ├── models/           8 domain models
│   │   ├── utils/            crypto, jwt, redis, email, storage
│   │   └── app_middleware/   auth extraction, admin guard
│   ├── migrations/           15 versioned SQLx migrations
│   └── Dockerfile            rust:slim -> debian:bookworm-slim (non-root)
│
├── frontend/                 Next.js 16
│   ├── app/                  20+ routes including interactive spec portal
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

More detail with interactive diagrams: [hub.unggulaxiom.com/v/info/architecture](https://hub.unggulaxiom.com/v/info/architecture)

---

## Feature depth

**File management.** Upload (multipart for large files), download, preview, rename, move, delete. Folder hierarchy. Full-text search powered by PostgreSQL tsvector.

**Versioning and recovery.** Every file modification preserves the previous version. Soft delete moves files to trash. Restore within the retention window. Permanent purge after expiry. All tracked.

**Classification and governance.** Files carry classification labels (RAHSIA, SULIT, TERHAD, TERBUKA). Sensitive operations trigger dual-signature approval workflows. One person initiates. A second authorized person approves or rejects. Every action logged.

**Authentication.** Argon2id password hashing (memory-hard, GPU-resistant). WebAuthn/FIDO2 passkeys. Magic link login via email. JWT with access and refresh token rotation. Sessions viewable and revocable per device.

**Sharing and access control.** Share files and folders with role-based permissions (viewer, editor, admin). Revoke anytime. Hierarchical RBAC across the platform. All share activity tracked.

**Admin panel.** Full user lifecycle management. Bulk operations. Storage analytics with per-user breakdown. Governance queue for forced approval or rejection. Complete audit log viewer. System configuration management.

**Real-time updates.** SSE stream for live notifications on shares, approvals, and system events. No polling.

**Audit trail.** Append-only log of every critical action. Actor, action, resource, timestamp, IP address. Filterable by user, action type, resource, and date range. Immutable by design.

**Security hardening.** AES-256-GCM file encryption at rest. Redis-backed distributed rate limiting. Security headers via Nginx (CSP, HSTS, X-Frame-Options, Referrer-Policy). Non-root container users. No hardcoded secrets. CI/CD authenticates to AWS via OIDC — no static IAM keys stored in GitHub.

---

## Key architectural decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend runtime | Rust (Actix-Web 4) | Memory safety without garbage collection. Predictable p95 latency under 10ms. The learning curve and slower iteration speed are real costs, but justified for a storage platform where correctness and throughput matter. |
| Database access | SQLx with raw SQL | No ORM abstraction. Every query lives in source code where it can be reviewed, explained, and optimized. Migrations are versioned and checked into the repo. |
| Password hashing | Argon2id | Winner of the Password Hashing Competition. Memory-hard makes GPU/ASIC attacks impractical. The standard choice for systems that take credential storage seriously. |
| File encryption | AES-256-GCM | Authenticated encryption. Confidentiality and integrity in a single pass. The GCM mode provides built-in authentication, so tampered ciphertext is detected before decryption. |
| Auth architecture | JWT + refresh tokens + WebAuthn | Stateless API auth keeps latency low. Refresh tokens allow revocation without hitting the database on every request. Passkeys eliminate phishing as an attack vector. |
| Frontend state | React Query + Zustand | Server cache and client state are fundamentally different problems. React Query handles caching, invalidation, and refetching. Zustand manages local UI state with minimal boilerplate. |
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
cd backend && cp .env.example .env && sqlx migrate run && cargo run

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

---

## Tech stack summary

| Layer | Technologies |
|-------|-------------|
| Backend | Rust, Actix-Web 4, SQLx 0.8, Redis 0.25, Argon2id, AES-256-GCM, Lettre, Tokio |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, TanStack React Query, Zustand, Lucide |
| Data | PostgreSQL 16 (15 versioned migrations, tsvector FTS), Redis 7 (sessions, rate limiting, pub/sub) |
| Infrastructure | Nginx (TLS 1.3, HTTP/2, security headers), Docker multi-stage, GitHub Actions, AWS OIDC |
| Cloud | AWS Lightsail (VPS), AWS ECR (container registry) |
| Observability | Tokio Tracing, append-only audit trail, SSE notifications, container health checks |

---

## License

Source-available. All rights reserved. Read the code, learn from it, fork it. Commercial use, redistribution, or derivative works require permission.

---

## About me

I'm a software engineer who builds secure, well-architected systems. This project represents my best work: a platform designed with real security requirements, built with production discipline, and running live so you can see it working.

I'm looking for backend, full-stack, or platform engineering roles where I can work on infrastructure, security, or systems that need to be right the first time.

**Contact:** [LinkedIn](https://www.linkedin.com/in/ahmad-mirza-0b606b278/) &middot; [ahmadmrza0404@gmail.com](mailto:ahmadmrza0404@gmail.com)

---

*Interactive architecture diagrams, full API reference, performance benchmarks, and live telemetry: [hub.unggulaxiom.com/v/info](https://hub.unggulaxiom.com/v/info)*
