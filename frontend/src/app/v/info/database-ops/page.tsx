"use client";

import { useState } from "react";
import { Settings, Database, Terminal, FileCode, ShieldCheck, CheckCircle2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeSnippet {
  title: string;
  language: string;
  description: string;
  code: string;
}

export default function InfoDatabaseOpsPage() {
  const [activeSnippetTab, setActiveSnippetTab] = useState(0);

  const snippets: CodeSnippet[] = [
    {
      title: "Rust Startup Migration Runner",
      language: "rust",
      description: "Rust server initialization code compiling SQLx migrations into the binary and running them at startup.",
      code: `/* src/db.rs */
use sqlx::{postgres::PgPoolOptions, Pool, Postgres};
use std::time::Duration;

pub async fn init_database(database_url: &str) -> Result<Pool<Postgres>, sqlx::Error> {
    /* Setup connection pool with optimized configurations */
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .acquire_timeout(Duration::from_secs(5))
        .idle_timeout(Duration::from_secs(600))
        .connect(database_url)
        .await?;

    /* Automatically trigger migrations built into the application binary */
    /* This guarantees DB schema version matching before routing traffic */
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await?;

    Ok(pool)
}`
    },
    {
      title: "SQL Schema Migration File",
      language: "sql",
      description: "An example of a versioned SQL migration script containing constraints, audit triggers, and classifications.",
      code: `/* migrations/20260601000000_create_governance_system.sql */

/* Enforce valid classification domains */
CREATE TYPE security_clearance AS ENUM (
    'TERBUKA', /* Public access */
    'TERHAD',  /* Restricted internal */
    'SULIT',   /* Confidential */
    'RAHSIA'   /* Secret Board only */
);

CREATE TABLE files (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    classification security_clearance DEFAULT 'TERBUKA' NOT NULL,
    parent_id VARCHAR(64) REFERENCES files(id),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

/* Create index to support quick classification hierarchy checks */
CREATE INDEX idx_files_parent_clearance ON files(parent_id, classification);`
    },
    {
      title: "Deterministic Seed Script",
      language: "sql",
      description: "Deterministic database seeding to initialize developer workspaces with matching mock environments.",
      code: `/* scripts/seed_development.sql */
TRUNCATE users, files, governance_requests RESTART IDENTITY CASCADE;

/* Seed base system users with WebAuthn identifiers */
INSERT INTO users (id, email, role, full_name) VALUES
('usr-8a2b-cf91', 'director@unggul.axiom', 'DIRECTOR', 'Ahmad Director'),
('usr-2f9c-7721', 'staff@unggul.axiom', 'STAFF', 'Fauzan Staff');

/* Seed file explorer tree nodes */
INSERT INTO files (id, name, classification, parent_id) VALUES
('fold-100', 'Corporate Root', 'TERHAD', NULL),
('fold-101', 'Financial Planning', 'SULIT', 'fold-100'),
('file-889', 'Q3_Budget.xlsx', 'SULIT', 'fold-101');

/* Insert governance approval request record */
INSERT INTO governance_requests (id, type, status, requested_by, target_file_id) VALUES
('req-552', 'CLASSIFICATION_UPGRADE', 'PENDING', 'usr-2f9c-7721', 'file-889');`
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Settings size={12} /> SECTION 9.0 : DATABASE OPERATIONS
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Schema Migrations &amp; Operations
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          Maintaining deterministic databases is critical for corporate software stability. The Strategic Hub couples SQLx compile-checked migrations with static seeding strategies, eliminating schema drifts between environments.
        </p>
      </div>

      {/* Migration Mechanics & Process Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-sans">
        <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-3">
          <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest block">
            Operational Protocol : Schema Migrations
          </span>
          <h4 className="font-bold text-foreground font-serif text-lg">
            Compile-Time SQL Validation
          </h4>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            By using Rust SQLx query macros, the API backend compiles queries directly against an active development database. Invalid tables, column typos, and mismatched query parameter types trigger build-time failures. This blocks broken SQL queries from ever being compiled or deployed.
          </p>
        </div>

        <div className="border border-border/30 rounded-lg bg-background-panel/40 p-6 space-y-3">
          <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-widest block">
            Operational Protocol : Database Seeding
          </span>
          <h4 className="font-bold text-foreground font-serif text-lg">
            Deterministic Environments
          </h4>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            Local testing is governed by deterministic seeds. Seeding scripts wipe existing records and reinsert fixed UUID keys. This ensures developers can execute integration scripts against pre-configured file hierarchies and security clearance tokens without requiring manual setup.
          </p>
        </div>
      </div>

      {/* Interactive Code Showcase */}
      <div className="border border-border/30 rounded-lg bg-background-panel/20 overflow-hidden shadow-lg">
        <div className="bg-background-panel/40 border-b border-border/20 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-2">
            <FileCode size={14} className="text-accent" />
            <h3 className="font-serif font-bold text-sm text-foreground">
              Database Script &amp; Code Repository
            </h3>
          </div>
          <div className="font-mono text-[9px] font-bold text-accent border border-accent/20 bg-accent-subtle/25 px-2 py-0.5 rounded uppercase">
            Environment : postgresql_15
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
          {/* Navigation tabs */}
          <div className="lg:col-span-4 bg-background-panel/30 border-b lg:border-b-0 lg:border-r border-border/20 p-4 space-y-2 select-none">
            <span className="font-mono text-[9px] font-bold tracking-widest text-foreground-subtle uppercase block pb-1 border-b border-border/10">
              Operations Scripts
            </span>
            <div className="space-y-1">
              {snippets.map((snip, idx) => (
                <button
                  key={snip.title}
                  onClick={() => setActiveSnippetTab(idx)}
                  className={cn(
                    "w-full flex flex-col p-2.5 rounded text-left font-mono transition-all cursor-pointer border",
                    activeSnippetTab === idx
                      ? "bg-accent/10 border-accent/40 text-accent font-bold"
                      : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/40"
                  )}
                >
                  <span className="text-xs">{snip.title}</span>
                  <span className="text-[9px] text-foreground-subtle/60 truncate font-sans mt-0.5">
                    {snip.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="lg:col-span-8 p-4 sm:p-6 bg-background/40 flex flex-col justify-between min-w-0">
            <div className="space-y-2 flex-1">
              <span className="font-mono text-[9px] font-bold tracking-wider text-accent uppercase block">
                File View: {snippets[activeSnippetTab].title}
              </span>
              <pre className="p-4 rounded border border-border/30 bg-background/80 font-mono text-xs leading-relaxed text-foreground-subtle overflow-x-auto whitespace-pre select-all shadow-inner h-[280px]">
                {snippets[activeSnippetTab].code}
              </pre>
            </div>
            <p className="font-sans text-[10px] text-foreground-subtle leading-relaxed mt-3 border-t border-border/10 pt-3">
              Code blocks are verified at build-time. All SQL statements use parameterized bindings to mitigate SQL injection threats.
            </p>
          </div>
        </div>
      </div>

      {/* Terminal / CLI Commands Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/20 pb-2">
          <Terminal size={14} className="text-accent" />
          <h3 className="font-mono text-[10px] font-semibold text-accent uppercase tracking-widest">
            Database CLI Commands Reference
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
          <div className="border border-border/25 rounded-lg bg-background/20 p-4 space-y-2">
            <span className="text-accent font-bold text-[10px] uppercase block">
              1. Initialize Migration Folder
            </span>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Setup a structured database directory containing schema files.
            </p>
            <pre className="p-2 rounded border border-border/15 bg-background-panel/40 text-[10px] text-foreground overflow-x-auto select-all shadow-inner">
              sqlx migrate add create_table
            </pre>
          </div>

          <div className="border border-border/25 rounded-lg bg-background/20 p-4 space-y-2">
            <span className="text-accent font-bold text-[10px] uppercase block">
              2. Run Database Migrations
            </span>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Execute pending migration files manually using the SQLx utility tool.
            </p>
            <pre className="p-2 rounded border border-border/15 bg-background-panel/40 text-[10px] text-foreground overflow-x-auto select-all shadow-inner">
              sqlx migrate run
            </pre>
          </div>

          <div className="border border-border/25 rounded-lg bg-background/20 p-4 space-y-2">
            <span className="text-accent font-bold text-[10px] uppercase block">
              3. Check Migration Status
            </span>
            <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
              Examine the applied status and schema version history table.
            </p>
            <pre className="p-2 rounded border border-border/15 bg-background-panel/40 text-[10px] text-foreground overflow-x-auto select-all shadow-inner">
              sqlx migrate info
            </pre>
          </div>
        </div>
      </div>

      {/* Verification Value Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm font-sans">
        <div className="border border-border/20 rounded-lg bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            <h4 className="font-serif font-bold text-base text-foreground">
              Schema Transaction Safety
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            SQLx migrations are wrapped inside transaction scopes. If a migration statement encounters an database error, the engine automatically rolls back the entire batch, preventing half-applied tables from corrupting production databases.
          </p>
        </div>

        <div className="border border-border/20 rounded-lg bg-background-panel/20 p-5 space-y-3 hover:border-accent/30 transition-all duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" />
            <h4 className="font-serif font-bold text-base text-foreground">
              Mock Seeding Safety
            </h4>
          </div>
          <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed">
            Seeding processes are locked behind conditional variables. The seeding routine checks target variables to prevent execution inside production environments, preventing accidental table truncation.
          </p>
        </div>
      </div>
    </div>
  );
}
