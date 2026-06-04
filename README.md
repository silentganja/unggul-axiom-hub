# Unggul Axiom — Hub

<p align="center">
  <strong>Sovereign Enterprise Cloud Storage & Collaboration Platform</strong>
  <br>
  <sub>Built for government-grade security. Engineered for production from day one.</sub>
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

Unggul Axiom — Hub is a full-stack, production-grade secure document collaboration platform. It handles **file storage, authentication, encryption, audit logging, and access control** — the kind of system an enterprise or government agency would use to manage classified documents.

This is a portfolio project demonstrating the caliber of software engineering I bring to the table: **systems-level thinking, security-first architecture, and the discipline to ship production-ready code.**

> **🔗 Live Technical Portal:** [hub.unggulaxiom.com/v/info](https://hub.unggulaxiom.com/v/info) — *Interactive ERD, system architecture diagrams, API reference, and live telemetry.*

---

## 🎯 Why this project matters

Most portfolio projects stop at "it works on my machine." This one goes further:

- **It's deployed.** Running on AWS Lightsail behind Nginx, with automated CI/CD via GitHub Actions and OIDC-based credentialing — no long-lived secrets.
- **It's secure by design.** AES-256-GCM at-rest encryption, Argon2id password hashing, JWT rotation, WebAuthn passkeys, Redis-backed rate limiting. Built for environments that require **RAHSIA / SULIT / TERHAD / TERBUKA** classification levels.
- **It's observable.** Immutable, append-only audit trails track every critical action. You can trace who did what and when.
- **It makes deliberate tradeoffs.** Rust for the backend (not Node.js) because memory safety and throughput matter. Raw SQL via SQLx (not an ORM) because auditability and query performance matter. Every choice has a reason.

---

## 🧱 Architecture at a glance

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
│   └── Dockerfile           #   Multi-stage: builder → runtime (alpine)
│
├── frontend/                # Next.js 16 (App Router)
│   ├── app/                 #   Route handlers & server components
│   ├── components/          #   Reusable UI primitives
│   ├── lib/                 #   API client, auth helpers, type defs
│   └── store/               #   Zustand stores
│
├── infra/                   # DB init scripts, Nginx config
├── .github/workflows/       # CI/CD: lint → build → push ECR → deploy Lightsail
├── docker-compose.yml       # Dev stack (Postgres, Redis, backend, frontend)
└── docker-compose.prod.yml  # Production stack (env-var driven, ECR images)
```

For a deeper dive, see the **[Technical Portal → Architecture](https://hub.unggulaxiom.com/v/info/architecture)** with interactive diagrams.

---

## 🔑 Engineering decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend language | **Rust** (Actix-Web) | Zero-cost abstractions, memory safety, sub-10ms p95 latency |
| Database access | **SQLx** (raw SQL) | No magic — every query is reviewable, optimized, and auditable |
| Auth | **Argon2id + JWT + WebAuthn** | Memory-hard hashing, stateless auth with rotation, phishing-resistant 2FA |
| Encryption | **AES-256-GCM** | Authenticated encryption — confidentiality + integrity in one pass |
| Frontend data | **React Query + Zustand** | Server state vs client state separated; cache invalidation is declarative |
| CI/CD auth | **AWS OIDC** (not IAM users) | Temporary credentials, no long-lived access keys stored anywhere |
| Containerization | **Multi-stage Docker** | Builder image has dev tools; runtime image is a minimal Alpine base |

---

## 🛡️ Security properties

- All file mutations are **auth-checked and audit-logged** at the database layer
- Passwords hashed with **Argon2id** (memory-hard, resistant to GPU/ASIC attacks)
- JWT tokens support **rotation and server-side revocation** via Redis
- File-level encryption uses **AES-256-GCM** (authenticated additional data prevents tampering)
- **Hierarchical RBAC** with dual-signature approval for sensitive operations
- **Distributed rate limiting** via Redis — protects against brute-force and DoS
- No hardcoded secrets in the codebase — all credentials injected via environment variables

---

## 🚀 Quick Start

### One command (Docker)

```bash
git clone https://github.com/YOUR_USERNAME/unggul-hub.git
cd unggul-hub
cp backend/.env.example backend/.env
docker compose up --build
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Health check:** http://localhost:8080/health

### Local development

**Prerequisites:** Rust 1.85+, Node.js 20+, PostgreSQL 16, Redis 7

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

## 🛠️ Tech stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Rust, Actix-Web 4, SQLx, Redis, Argon2id, AES-256-GCM, Lettre, Tokio |
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, React Query, Zustand, Lucide |
| **Database** | PostgreSQL 16 (with SQLx-managed migrations) |
| **Cache** | Redis 7 (sessions, rate limiting, revocation lists) |
| **DevOps** | GitHub Actions, AWS OIDC, ECR, Lightsail, Docker multi-stage builds |
| **Observability** | Tokio Tracing, immutable audit trail |

---

## 📄 License

Source-available. All rights reserved. View and learn from the code, but commercial use, distribution, or derivative works require explicit permission.

---

## 👋 About me

I'm a software engineer focused on building secure, performant, and maintainable systems. This project represents my approach to engineering: **understand the problem deeply, choose the right tools deliberately, and build with production discipline from the start.**

I'm currently looking for backend, full-stack, or platform engineering roles where I can work on systems that matter — infrastructure, security, data platforms, or developer tools.

**Let's talk:** [LinkedIn](#) · [Email](#) · [Portfolio](#)

---

*For detailed architecture diagrams, API documentation, and live telemetry, visit the **[Technical Portal](https://hub.unggulaxiom.com/v/info)**.*
