# ─────────────────────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────────────────────
FROM rust:slim AS builder

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependency layer — copy manifests first
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release --bin server 2>/dev/null || true
RUN rm src/main.rs

# Build actual source
COPY src ./src
RUN touch src/main.rs
RUN cargo build --release --bin server

# ─────────────────────────────────────────────────────────────
# Stage 2: Runtime (minimal distroless-like image)
# ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim AS runtime

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/server ./server

# Non-root user for security
RUN useradd -r -s /bin/false axiom
USER axiom

EXPOSE 8080

ENV RUST_LOG=info

CMD ["./server"]
