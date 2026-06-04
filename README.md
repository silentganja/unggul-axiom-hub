# Unggul Axiom - Hub

<p align="center">
  <strong>Sovereign Enterprise Cloud Storage & Collaboration Platform</strong>
  <br>
  <sub>Built for government-grade security. Deployed and running in production.</sub>
</p>

<p align="center">
  <a href="https://hub.unggulaxiom.com/v/info"><img src="https://img.shields.io/badge/live_demo-online-success?style=flat" alt="Live Demo"></a>
  <img src="https://img.shields.io/badge/rust-1.85%2B-orange?logo=rust" alt="Rust">
  <img src="https://img.shields.io/badge/next.js-16-black?logo=next.js" alt="Next.js 16">
  <img src="https://img.shields.io/badge/react-19-087ea4?logo=react" alt="React 19">
  <img src="https://img.shields.io/badge/postgresql-16-336791?logo=postgresql" alt="PostgreSQL 16">
  <img src="https://img.shields.io/badge/tailwind-v4-06B6D4?logo=tailwindcss" alt="Tailwind v4">
  <img src="https://img.shields.io/badge/deploy-aws_lightsail-FF9900?logo=amazonaws" alt="AWS Lightsail">
</p>

---

## What is this?

A full-stack document collaboration platform built for handling classified files. It does file storage, authentication, encryption, audit logging, and access control - the kind of thing you'd find in an enterprise or government agency. Built with Rust on the backend and Next.js on the frontend.

I built this as a portfolio piece to show how I think about systems, security, and shipping code that actually runs in production.

> **Live portal:** [hub.unggulaxiom.com/v/info](https://hub.unggulaxiom.com/v/info) - interactive ERD, architecture diagrams, API docs, and live telemetry.

---

## Why I built this

Most side projects stop at "it works on my machine." I wanted to take this all the way:

- **It's live.** Running on AWS Lightsail behind Nginx. Deployments happen automatically through GitHub Actions using OIDC - no long-lived AWS keys sitting around.
- **It takes security seriously.** AES-256-GCM encryption at rest, Argon2id for passwords, JWT rotation, WebAuthn passkeys, rate limiting via Redis. Designed for environments that classify data as **RAHSIA**, **SULIT**, **TERHAD**, or **TERBUKA**.
- **Everything is tracked.** Immutable audit logs for every important action. You can trace exactly who did what and when.
- **The tech choices have reasons.** Rust instead of Node for the backend because memory safety and throughput actually matter here. Raw SQL via SQLx instead of an ORM because I want every query to be visible and reviewable. No magic.

---

## Architecture

```
Client (Browser)
    │
    ▼
┌──────────────────────────────────────────────┐
│  Nginx Reverse Proxy  (TLS termination)       │
└──────────────────────────────────────────────┘
    │
    ├──▶ Next.js 16 Frontend   (React 19, SSR)
    │    ├── App Router (Server Components)
    │    ├── Zustand (client state)
    │    └── TanStack React Query (server state)
    │
    └──▶ Rust API Service      (Actix-Web 4)
         ├── JWT + WebAuthn Auth Layer
         ├── RBAC + Dual-Signature Workflows
         ├── AES-256-GCM File Encryption
         ├── Audit Trail Service
         └── Rate Limiter (Redis-backed)
              │
              ├──▶ PostgreSQL 16
              └──▶ Redis 7
```

```
unggul-hub/
├── backend/                 # Rust (Actix-Web, SQLx, Redis)
│   ├── src/                 #   Handlers, middleware, services, models
│   ├── migrations/          #   SQLx migrations (versioned, reviewable)
│   └── Dockerfile           #   Multi-stage: builder -> runtime (alpine)
│
├── frontend/                # Next.js 16 (App Router)
│   ├── app/                 #   Route handlers & server components
│   ├── components/          #   Reusable UI primitives
│   ├── lib/                 #   API client, auth helpers, type defs
│   └── store/               #   Zustand stores
│
├── infra/                   # DB init scripts, Nginx config
├── .github/workflows/       # CI/CD: lint -> build -> push ECR -> deploy
├── docker-compose.yml       # Dev stack (Postgres, Redis, backend, frontend)
└── docker-compose.prod.yml  # Production stack (env-var driven, ECR images)
```

More detail in the **[architecture diagrams](https://hub.unggulaxiom.com/v/info/architecture)** on the portal.

---

## Key decisions

| What | I went with | Why |
|------|-------------|-----|
| Backend | **Rust** (Actix-Web) | Memory safety without a garbage collector. p95 latency under 10ms. |
| Database access | **SQLx** (raw SQL) | Every query is explicit. No ORM generating surprises behind your back. |
| Auth | **Argon2id + JWT + WebAuthn** | Memory-hard hashing, stateless sessions with rotation, phishing-resistant 2FA. |
| Encryption | **AES-256-GCM** | Authenticated encryption. Both confidentiality and integrity in one go. |
| Frontend state | **React Query + Zustand** | Server state and client state are different problems. Each gets the right tool. |
| CI/CD auth | **AWS OIDC** (not IAM users) | Temporary credentials only. No access keys to leak or rotate. |
| Containers | **Multi-stage Docker** | Build image has the toolchain. Runtime image is bare Alpine. |

---

## Security

- Every file mutation goes through auth checks and gets audit logged at the database level
- Passwords hashed with Argon2id (memory-hard, designed to resist GPU attacks)
- JWT tokens can be rotated and revoked server-side through Redis
- Files encrypted with AES-256-GCM. The authenticated data prevents tampering.
- Hierarchical RBAC with dual-signature approval for sensitive operations
- Rate limiting via Redis to handle brute force and DoS attempts
- No hardcoded secrets anywhere. Everything flows through environment variables.

---

## Running it

### Docker (quickest)

```bash
git clone https://github.com/YOUR_USERNAME/unggul-hub.git
cd unggul-hub
cp backend/.env.example backend/.env
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Health check: http://localhost:8080/health

### Local dev

You'll need Rust 1.85+, Node 20+, PostgreSQL 16, and Redis 7.

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

| Layer | What I use |
|-------|-----------|
| Backend | Rust, Actix-Web 4, SQLx, Redis, Argon2id, AES-256-GCM, Lettre, Tokio |
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, React Query, Zustand, Lucide |
| Database | PostgreSQL 16 with SQLx-managed migrations |
| Cache | Redis 7 for sessions, rate limiting, and token revocation |
| DevOps | GitHub Actions, AWS OIDC, ECR, Lightsail, multi-stage Docker |
| Monitoring | Tokio Tracing, append-only audit trail |

---

## License

Source-available. All rights reserved. You're welcome to read the code and learn from it. Commercial use, redistribution, or derivative works need my permission first.

---

## About me

I'm a software engineer who cares about building things properly. Secure systems, clean architecture, code that holds up under real traffic. This project reflects how I approach engineering work.

I'm open to backend, full-stack, and platform roles. Especially interested in teams working on infrastructure, security, or developer tools.

**Get in touch:** [LinkedIn](#) · [Email](#) · [Portfolio](#)

---

*Detailed architecture diagrams, API docs, and live telemetry are on the **[technical portal](https://hub.unggulaxiom.com/v/info)**.*
