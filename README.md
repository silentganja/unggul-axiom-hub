# Unggul Axiom - Hub

<p align="center">
  <strong>Sovereign Enterprise Cloud Storage & Collaboration Platform</strong>
  <br>
  <sub>Secure file management with government-grade classification, audit trails, and granular access control. Live in production.</sub>
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

## What is this?

A full-stack document collaboration platform for environments that handle classified files. It covers the full lifecycle: upload, encrypt, classify, share, approve, audit, and recover. Built with Rust on the backend and Next.js on the frontend.

I built this to demonstrate how I approach production systems: security from the start, deliberate tech choices, and the discipline to ship something that runs in the real world, not just locally.

> **Project specs:** [hub.unggulaxiom.com/v/info](https://hub.unggulaxiom.com/v/info) - interactive ERD, system architecture, API reference, benchmarks, and telemetry.
> 
> **Live app:** [hub.unggulaxiom.com](https://hub.unggulaxiom.com)

---

## What it actually does

**File management.** Upload, download, preview, rename, move, delete. Folders with hierarchy. Multipart uploads for large files. Full-text search across all your documents.

**Versioning and recovery.** Every file keeps a version history. Soft delete with trash. Restore accidentally deleted files within a configurable window. Permanent purge after that.

**Classification and governance.** Files are tagged with classification levels (RAHSIA, SULIT, TERHAD, TERBUKA). Sensitive operations go through dual-signature approval workflows. Someone requests a classification change or file access. A second authorized person must approve. Everything is logged.

**Authentication.** Standard login with Argon2id-hashed passwords. WebAuthn/FIDO2 passkeys for phishing-resistant auth. Magic link login via email. JWT with access and refresh token rotation. Sessions can be viewed and revoked individually.

**Sharing.** Share files and folders with specific users. Assign roles: viewer, editor, or admin. Revoke access anytime. All shares are tracked.

**Admin panel.** User management (create, update, deactivate, reset passwords). Bulk operations. Storage analytics and breakdown per user. Governance queue with force approve/reject. Full audit log viewer. System configuration management.

**Real-time notifications.** Server-Sent Events stream for live updates on shares, approvals, and system events.

**Audit trail.** Every critical action is recorded in an append-only audit log. Who did what, when, from which IP. You can filter by user, action type, resource, and date range.

**Security hardening.** AES-256-GCM file encryption at rest. Rate limiting backed by Redis. Security headers via Nginx (CSP, HSTS, X-Frame-Options). Non-root container users. No hardcoded secrets.

---

## Architecture

```
Client (Browser)
    │
    ▼
┌────────────────────────────────────────┐
│  Nginx Reverse Proxy  (TLS, HTTP/2)     │
└────────────────────────────────────────┘
    │
    ├──▶ Next.js 16 Frontend   (React 19, SSR)
    │    ├── App Router (Server Components)
    │    ├── Zustand (client state)
    │    └── TanStack React Query (server state)
    │
    └──▶ Rust API Service      (Actix-Web 4)
         ├── Auth layer (JWT + WebAuthn + Magic Link)
         ├── RBAC authorization middleware
         ├── AES-256-GCM file encryption
         ├── Governance approval engine
         ├── SSE notification stream
         └── Redis rate limiter
              │
              ├──▶ PostgreSQL 16
              └──▶ Redis 7
```

```
unggul-hub/
├── backend/                 # Rust API
│   ├── src/
│   │   ├── handlers/        #   auth, files, shares, governance, admin, audit
│   │   ├── models/          #   user, file, share, governance, notification
│   │   ├── utils/           #   crypto, jwt, redis, email, storage, cleanup
│   │   └── app_middleware/  #   auth extraction, admin guard
│   ├── migrations/          #   15 versioned SQLx migrations
│   └── Dockerfile           #   Multi-stage: rust:slim builder -> debian:bookworm-slim runtime
│
├── frontend/                # Next.js 16
│   ├── app/                 #   App Router pages and API routes
│   ├── components/          #   UI primitives + feature components
│   ├── lib/                 #   API client, auth, type definitions
│   └── store/               #   Zustand stores
│
├── infra/
│   ├── nginx/               #   Nginx config with TLS, security headers, reverse proxy
│   └── postgres/            #   DB init script
│
├── .github/workflows/       # CI/CD pipeline
├── docker-compose.yml       # Local dev (Postgres, Redis, backend, frontend)
└── docker-compose.prod.yml  # Production (ECR images, env-var driven)
```

The **[technical portal](https://hub.unggulaxiom.com/v/info/architecture)** has interactive architecture diagrams with data flow animations.

---

## Tech decisions that matter

| What | Choice | Why |
|------|--------|-----|
| Backend language | Rust (Actix-Web 4) | Memory safety without GC overhead. Async runtime keeps p95 latency under 10ms. |
| Database access | SQLx with raw SQL | Every query is visible in source. No ORM generating unexpected joins or N+1s. |
| Password hashing | Argon2id | Memory-hard algorithm. Resistant to GPU and ASIC attacks. |
| File encryption | AES-256-GCM | Authenticated encryption. Confidentiality and integrity in a single pass. No MAC needed. |
| Auth | JWT + refresh tokens + WebAuthn | Stateless API auth with rotation. Passkeys for phishing resistance. |
| Frontend data | React Query + Zustand | Server cache and client state are different problems. Each gets the right tool. |
| CI/CD auth | AWS OIDC | No long-lived IAM keys. GitHub gets temporary credentials per workflow run. |
| Containers | Multi-stage Docker | Build stage has the full toolchain. Runtime is bare Debian Slim, non-root user. |

---

## Running it

### Docker (one command)

```bash
git clone https://github.com/YOUR_USERNAME/unggul-hub.git
cd unggul-hub
cp backend/.env.example backend/.env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Health: http://localhost:8080/health

### Local development

Prerequisites: Rust 1.85+, Node 20+, PostgreSQL 16, Redis 7.

```bash
# Backend
cd backend
cp .env.example .env
sqlx migrate run
cargo run

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Tech stack

| Layer | Technologies |
|-------|-------------|
| Backend | Rust, Actix-Web 4, SQLx 0.8, Redis 0.25, Argon2id, AES-256-GCM, Lettre, Tokio |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, TanStack React Query, Zustand, Lucide |
| Database | PostgreSQL 16, 15 versioned SQLx migrations |
| Cache | Redis 7 (sessions, rate limiting, token blacklist) |
| Infra | Nginx (TLS, HTTP/2, security headers), Docker multi-stage, GitHub Actions |
| Cloud | AWS Lightsail, ECR, OIDC-based CI/CD auth |
| Monitoring | Tokio Tracing, append-only audit trail, SSE notifications |

---

## License

Source-available. All rights reserved. Read the code, learn from it, fork it for reference. Commercial use, redistribution, or derivative works need my permission.

---

## About me

I'm a software engineer who builds systems with real security and performance requirements. This project is a working demonstration of how I think about architecture, write code, and ship to production.

I'm currently looking for backend, full-stack, or platform engineering roles. Particularly interested in teams working on infrastructure, security, data platforms, or developer tools.

**Contact:** [LinkedIn](https://www.linkedin.com/in/ahmad-mirza-0b606b278/) · [Email](mailto:ahmadmrza0404@gmail.com)

---

*Interactive architecture diagrams, full API reference, benchmarks, and live system telemetry: [hub.unggulaxiom.com/v/info](https://hub.unggulaxiom.com/v/info)*
