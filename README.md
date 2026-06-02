# Unggul Axiom - Hub

**Sovereign Enterprise Cloud Storage & Collaboration Platform**

Unggul Axiom - Hub is a high-performance, secure, and sovereign cloud storage and document collaboration platform designed to align with strict governmental data privacy and data classification tiers (RAHSIA, SULIT, TERHAD, TERBUKA). 

Built as an audited monorepo, the platform couples a robust, type-safe **Rust (Actix-Web)** backend with a modern, high-density **Next.js 16 (React 19)** frontend dashboard.

---

## 🚀 System Architecture & Stack

### Backend (Rust)
- **Engine**: [Actix-Web](https://actix.rs/) for high-throughput, low-latency concurrent routing.
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [SQLx](https://github.com/launchbadge/sqlx) (raw queries for execution transparency).
- **Session & Limits**: [Redis](https://redis.io/) handling API rate-limiting and active session verification.
- **Security & Crypto**:
  - `Argon2id` password hashing.
  - `AES-256-GCM` authenticated at-rest file encryption.
  - `JSON Web Tokens (JWT)` for session management with rotation/revocation.
  - `Lettre` for secure transactional email dispatch (SMTP).

### Frontend (Next.js)
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/).
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) using an HSL-tailored dark/light mode system with custom micro-animations.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) for low-overhead client state stores.
- **Data Fetching**: [React Query](https://tanstack.com/query) for declarative caching and queries.

### Infrastructure & DevOps
- **Containerization**: Docker & multi-stage `Dockerfiles`.
- **CI/CD**: GitHub Actions deploying to **AWS Elastic Container Registry (ECR)** via secure AWS OIDC.
- **Production Host**: Hosted on **AWS Lightsail VPS** in the `ap-southeast-1` (Singapore) region.

---

## 📁 Monorepo Layout

```
unggul-hub/
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD pipeline (OIDC authentication -> AWS ECR)
├── backend/                      # Rust Service
│   ├── src/
│   │   ├── app_middleware/       # Request interceptors
│   │   │   ├── admin.rs          # Admin authorization guard
│   │   │   ├── auth.rs           # JWT user authentication guard
│   │   │   └── rate_limit.rs     # Redis-backed client rate limiter
│   │   ├── handlers/             # Controller logic / HTTP endpoints
│   │   │   ├── admin.rs          # User management, config tweaks, full audit reports
│   │   │   ├── audit.rs          # Immutable system activity logging
│   │   │   ├── auth.rs           # Standard credential authentication & profiles
│   │   │   ├── auth_extras.rs    # WebAuthn, Magic Links, Passwords resets, JWT Refresh
│   │   │   ├── favorites.rs      # User file bookmarking
│   │   │   ├── file_versions.rs  # Storage version tracking & state restoration
│   │   │   ├── files.rs          # Core document storage CRUD, uploads, locking
│   │   │   ├── governance.rs     # Data classification upgrades/downgrades workflow
│   │   │   ├── notifications.rs  # Server-Sent Events (SSE) dispatch
│   │   │   └── shares.rs         # Permission scopes (viewer/editor) sharing
│   │   ├── models/               # Domain database entities (SQLx mapping structs)
│   │   ├── utils/                # Service helpers (Crypto, Email, Redis, Storage)
│   │   ├── errors.rs             # Custom backend error types
│   │   └── main.rs               # Entrypoint & HTTP server bootstrap
│   ├── Cargo.toml
│   └── Dockerfile
├── frontend/                     # Next.js Application
│   ├── src/
│   │   ├── app/                  # File-system routing
│   │   │   ├── dashboard/        # Main platform dashboard interface
│   │   │   │   ├── audit/        # Admin Audit Logs viewer
│   │   │   │   └── settings/     # Security and profile configurations
│   │   │   ├── login/            # Enterprise multi-factor portal
│   │   │   ├── usr/guide/        # User documentation & simulations
│   │   │   │   ├── explorer/     # Interactive UI guidance
│   │   │   │   ├── governance/   # Sovereign classification workflows documentation
│   │   │   │   ├── roles/        # System access levels specification
│   │   │   │   └── scenarios/    # Access permission simulators
│   │   │   ├── v/info/           # Architecture overview, ERD and technical portal
│   │   │   │   ├── api-reference/ # Complete endpoint reference
│   │   │   │   ├── architecture/  # System architecture & Data Flow Diagram
│   │   │   │   ├── erd/          # Interactive SVG-based DB entity relationship diagram
│   │   │   │   ├── tech-stack/   # Technical tradeoffs and version documentation
│   │   │   │   └── telemetry/    # Simulated live system activity
│   │   │   └── globals.css       # HSL theme declarations & design tokens
│   │   ├── components/           # Modular visual components
│   │   ├── lib/                  # Fetch client (api.ts) & UI utilities
│   │   └── store/                # Zustand stores (Auth, Files, Admin, Notifications)
│   ├── package.json
│   └── Dockerfile
├── infra/
│   └── postgres/
│       └── init.sql              # Idempotent DB tables, indexes & migration register
├── docker-compose.yml            # Local development orchestration
├── docker-compose.prod.yml       # Production environment orchestration
└── .gitignore
```

---

## 🛡️ Core Platform Capabilities

1. **Sovereign File Storage**: Nested directory creation, direct secure multipart uploading, AES-256-GCM encryption at-rest, file locking, and version recovery.
2. **National Security Classification**: Documents can be categorized as `RAHSIA` (Secret), `SULIT` (Confidential), `TERHAD` (Restricted), or `TERBUKA` (Open) matching governmental policies.
3. **Dual-Signature Governance**: Security classification changes or file unlocks require a formal approval workflow requested by staff and verified by administrators.
4. **Immutable Audit Trails**: Absolute, append-only logs tracking file reading, updates, shared links, lock changes, and administrative actions.
5. **Secure Cryptographic Auth**: Passwordless login with **WebAuthn (FIDO2)** passkeys, token-based **Magic Links**, and standard credentials hashed with Argon2id.
6. **Detailed Admin Panel**: Storage quota definitions, active user management, session termination, global configurations, and direct share revocations.
7. **Interactive Technical Portal**: Live system telemetry simulator, interactive vector ERD, and comprehensive endpoint documentation.

---

## 🛠️ Environment Configuration

Both components require environmental setups. Configure `backend/.env` using the keys below:

```ini
# Database Connection
DATABASE_URL=postgres://unggul:unggul_dev_secret@localhost:5432/unggul_axiom

# Redis Connection
REDIS_URL=redis://localhost:6379

# Server Binding
HOST=0.0.0.0
PORT=8080

# JWT Cryptographic Signing (Generate a strong secret in production)
JWT_SECRET=change_me_in_production_use_min_32_random_chars

# System Administrator Account
ADMIN_USERNAME=mirza
ADMIN_PASSWORD=396500Ja!

# Maximum File Upload Size (bytes)
MAX_UPLOAD_SIZE_BYTES=104857600
```

---

## 💻 Local Development

### 1. The Docker Stack (Recommended)
Builds and starts PostgreSQL, Redis, the Rust API, and the Next.js frontend in one command:

```bash
# Clone the configuration template
cp backend/.env.example backend/.env

# Spin up all containers
docker compose up --build
```
Once initialized, resources are available at:
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8080`
- **Health Verification**: `http://localhost:8080/health`

### 2. Manual Startup (Without Docker Containers)
To run the processes locally with hot-reloads:

#### Run Database and Cache (Dependencies)
Make sure you have PostgreSQL running on port `5432` with the `infra/postgres/init.sql` schema applied, and Redis running on port `6379`.

#### Run Backend Server
```bash
cd backend
cargo run
```

#### Run Frontend Client
```bash
cd frontend
npm run dev
```

---

## 🤖 CI/CD & Deployments

The workspace includes a automated workflow located in `.github/workflows/deploy.yml`.

### Deployment Pipeline
- Triggered on direct merges/pushes to the `master` branch.
- Performs parallel builds of the Frontend and Backend Docker containers.
- Authenticates securely with AWS via **OIDC (OpenID Connect)** without persistent IAM credentials.
- Pushes compiled production images to **AWS ECR** in the `ap-southeast-1` region.
- Signals deployment updates to the live AWS Lightsail instance running `docker-compose.prod.yml`.

---

## 📐 Engineering Guidelines

- **No SQLx Macros**: Always write explicit, readable raw SQL queries using `sqlx::query` or `sqlx::query_as`. Avoid `sqlx::query!` macros to prevent compile-time database dependency requirements.
- **System-Wide Clean Code**: Run `cargo clippy` and `npm run lint` regularly. A zero-warning/zero-error tolerance is maintained.
- **Cloudflare-Style UI Density**: UI structures should maintain crisp borders, small margins, high readability, and strict HSL layouts (dark theme `#09090b` and light theme `#ffffff`).
- **Accent Palette**: Corporate Purple accent (`#7c3aed` light / `#8b5cf6` dark).
