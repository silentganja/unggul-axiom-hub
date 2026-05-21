# Unggul Axiom Hub

**Sovereign Enterprise Cloud Storage & Collaboration Platform**

> Phase 1 of 40 — Foundation, CI/CD & Login Screen

---

## Monorepo Structure

```
unggul-hub/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD → AWS ECR
├── backend/                    # Rust · Actix-Web · SQLx · PostgreSQL
│   ├── src/main.rs
│   ├── Cargo.toml
│   └── Dockerfile
├── frontend/                   # Next.js 16 · Tailwind CSS · next-themes
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css     # Unggul Axiom design system tokens
│   │   │   ├── layout.tsx      # Root layout + ThemeProvider
│   │   │   ├── page.tsx        # → redirects to /login
│   │   │   └── login/
│   │   │       └── page.tsx    # Enterprise login screen
│   │   ├── components/
│   │   │   ├── providers/
│   │   │   │   └── ThemeProvider.tsx
│   │   │   └── ui/
│   │   │       └── ThemeToggle.tsx
│   │   └── lib/
│   │       └── utils.ts
│   └── Dockerfile
├── infra/
│   └── postgres/
│       └── init.sql            # Extensions + migrations table
├── docker-compose.yml          # Full local dev stack
└── .gitignore
```

---

## Local Development

### Prerequisites
- Node.js 20+
- Docker Desktop

### Frontend only (fastest)

```bash
cd frontend
npm run dev
# → http://localhost:3000/login
```

**Demo credentials (Phase 1 placeholder):**
- Email: `admin@unggul.axiom`
- Password: `axiom2026`

### Full stack (Docker)

```bash
# Copy env
cp backend/.env.example backend/.env

# Boot all services
docker compose up --build
```

Services:
| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000       |
| Backend  | http://localhost:8080       |
| Health   | http://localhost:8080/health|
| Postgres | localhost:5432              |
| Redis    | localhost:6379              |

---

## CI/CD (GitHub Actions → AWS ECR)

Configured in `.github/workflows/deploy.yml`.

**Required GitHub Secrets:**

| Secret                  | Description                          |
|-------------------------|--------------------------------------|
| `AWS_ACCOUNT_ID`        | Your 12-digit AWS account ID         |
| `AWS_ROLE_ARN`          | IAM role ARN for OIDC push to ECR    |
| `NEXT_PUBLIC_API_URL`   | Backend API URL for production build |

**Required GitHub Variables:**

| Variable     | Default           |
|--------------|-------------------|
| `AWS_REGION` | `ap-southeast-1`  |

The pipeline uses **OIDC (no long-lived keys)** — configure the IAM trust policy to allow `token.actions.githubusercontent.com` as the federated identity.

---

## Phase Roadmap

| Phase | Objective |
|-------|-----------|
| **1** | ✅ Foundation, CI/CD, Login Screen |
| 2     | Database Schema & JWT Auth |
| 3     | User Registration & Role System |
| 4     | Dashboard Shell & Navigation |
| …     | … |
| 40    | Production hardening & sovereign compliance |

---

## Engineering Rules

- **NO SQLx macros** — raw `sqlx::query` / `sqlx::query_as` only
- **Cloudflare-level UI/UX** — high density, compact, sharp geometry
- **Dual mode** — Dark (`#09090b`) / Light (crisp white) via `next-themes`
- **Corporate Purple accent** — `#7c3aed` light / `#8b5cf6` dark
