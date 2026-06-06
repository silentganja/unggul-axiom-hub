"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Network,
  Database,
  ArrowRightLeft,
  Search,
  Info,
  Lock,
  User,
  Clock,
  Settings,
  FolderOpen,
  Star,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface TableField {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
  nullable?: boolean;
  defaultValue?: string;
  description: string;
}

interface TableDefinition {
  name: string;
  icon: React.ReactNode;
  category: "Identity" | "Assets" | "Governance" | "System";
  description: string;
  fields: TableField[];
}

const tables: TableDefinition[] = [
    {
      name: "users",
      icon: <User size={16} />,
      category: "Identity",
      description: "Primary user credentials and identity metadata. Manages user access clearances (Terbuka, Terhad, Sulit, Rahsia) and organization hierarchies.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "email", type: "VARCHAR(320)", nullable: false, description: "Unique email username." },
        { name: "password_hash", type: "VARCHAR(512)", nullable: false, description: "Argon2id password hash." },
        { name: "full_name", type: "VARCHAR(255)", nullable: false, description: "User's full display name." },
        { name: "role", type: "VARCHAR(16)", nullable: false, defaultValue: "'staff'", description: "Access tier clearance level: chief, director, officer, staff." },
        { name: "active", type: "BOOLEAN", nullable: false, defaultValue: "TRUE", description: "Boolean deactivation toggle for employee lifecycle management." },
        { name: "storage_quota_bytes", type: "BIGINT", defaultValue: "107374182400 (100GB)", description: "Allocated user filesystem quota limit in bytes." },
        { name: "avatar_data", type: "TEXT", description: "Base64 avatar image string." },
        { name: "department", type: "VARCHAR(255)", description: "Assigned corporate division." },
        { name: "supervisor_id", type: "UUID", isFk: true, fkTarget: "users.id", description: "Self-referencing foreign key mapping supervisors." },
        { name: "notification_prefs", type: "JSONB", defaultValue: "'{}'", description: "Client notifications JSON payload preferences." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Timestamp of user account creation." }
      ]
    },
    {
      name: "webauthn_credentials",
      icon: <Lock size={16} />,
      category: "Identity",
      description: "Cryptographic credentials stored for WebAuthn/Passkey authentication. Prevents reliance on static password hashes.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "user_id", type: "UUID", isFk: true, fkTarget: "users.id", nullable: false, description: "Foreign key linking credential to user owner." },
        { name: "credential_id", type: "TEXT", nullable: false, description: "Public key credential lookup ID." },
        { name: "public_key", type: "TEXT", nullable: false, description: "COSE public key encoding format." },
        { name: "sign_count", type: "BIGINT", nullable: false, defaultValue: "0", description: "Credential validation tracking counter to prevent reuse attacks." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Timestamp credential was registered." }
      ]
    },
    {
      name: "files",
      icon: <FolderOpen size={16} />,
      category: "Assets",
      description: "Hierarchical filesystem storage nodes, mapping directory tree layers recursively. Integrates document locks and security classification rules.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "parent_id", type: "UUID", isFk: true, fkTarget: "files.id", description: "Recursive parent directory foreign key. NULL if root." },
        { name: "owner_id", type: "UUID", isFk: true, fkTarget: "users.id", nullable: false, description: "Asset creator/owner. Restricts transfer permissions." },
        { name: "name", type: "VARCHAR(512)", nullable: false, description: "Name of folder or file asset." },
        { name: "is_folder", type: "BOOLEAN", nullable: false, defaultValue: "FALSE", description: "Flag declaring folder or binary block asset." },
        { name: "size_bytes", type: "BIGINT", nullable: false, defaultValue: "0", description: "Size of file in bytes. Set to 0 if directory." },
        { name: "mime_type", type: "VARCHAR(255)", description: "Standard Internet Media Type." },
        { name: "classification", type: "VARCHAR(16)", nullable: false, defaultValue: "'TERBUKA'", description: "Clearance requirement tier: RAHSIA, SULIT, TERHAD, TERBUKA." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Created date timestamp." },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Last modified date timestamp." },
        { name: "deleted_at", type: "TIMESTAMPTZ", description: "Soft-delete timestamp. Enables file trashing restore options." },
        { name: "locked_by", type: "UUID", isFk: true, fkTarget: "users.id", description: "Foreign key of user holding lock." },
        { name: "locked_at", type: "TIMESTAMPTZ", description: "Timestamp when file lock was initiated." },
        { name: "lock_reason", type: "TEXT", description: "Governance explanation string justifying locked asset status." },
        { name: "search_vector", type: "tsvector", description: "Full-text indexing search vector for low-latency lookups." }
      ]
    },
    {
      name: "file_versions",
      icon: <Clock size={16} />,
      category: "Assets",
      description: "Tracks history version instances of files. Permits rolling back modification changes securely.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "file_id", type: "UUID", isFk: true, fkTarget: "files.id", nullable: false, description: "Foreign key linking version to base files." },
        { name: "version_number", type: "INTEGER", nullable: false, description: "Monotonically increasing version counter." },
        { name: "size_bytes", type: "BIGINT", nullable: false, defaultValue: "0", description: "Version payload storage size in bytes." },
        { name: "storage_path", type: "VARCHAR(1024)", nullable: false, description: "Absolute disk path to the encrypted file block." },
        { name: "uploaded_by", type: "UUID", isFk: true, fkTarget: "users.id", description: "User uploading version instance." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Date version uploaded." }
      ]
    },
    {
      name: "file_shares",
      icon: <ArrowRightLeft size={16} />,
      category: "Assets",
      description: "Many-to-many lookup relationship defining targeted document sharing records with editor/viewer permission tiers.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "file_id", type: "UUID", isFk: true, fkTarget: "files.id", nullable: false, description: "Shared file foreign key." },
        { name: "user_id", type: "UUID", isFk: true, fkTarget: "users.id", nullable: false, description: "Recipient user foreign key." },
        { name: "role", type: "VARCHAR(16)", nullable: false, defaultValue: "'viewer'", description: "Granted permission level: owner, editor, viewer." },
        { name: "shared_by", type: "UUID", isFk: true, fkTarget: "users.id", nullable: false, description: "Granter user foreign key." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Timestamp share was established." }
      ]
    },
    {
      name: "favorites",
      icon: <Star size={16} />,
      category: "Assets",
      description: "Join table mapping starred files for users. Optimizes navigation speed lists for frequently visited assets.",
      fields: [
        { name: "user_id", type: "UUID", isPk: true, isFk: true, fkTarget: "users.id", nullable: false, description: "User identifier." },
        { name: "file_id", type: "UUID", isPk: true, isFk: true, fkTarget: "files.id", nullable: false, description: "Starred file identifier." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Date/time starred." }
      ]
    },
    {
      name: "governance_requests",
      icon: <ShieldCheck size={16} />,
      category: "Governance",
      description: "Workflow approval requests queue. Restricts dangerous actions (classification downgrades, manual lock releases) without senior authorization.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "type", type: "VARCHAR(32)", nullable: false, description: "Request actions: FILE_LOCK, FILE_UNLOCK, CLASSIFICATION_UPGRADE, CLASSIFICATION_DOWNGRADE." },
        { name: "title", type: "VARCHAR(255)", nullable: false, description: "Brief title/summary of action." },
        { name: "description", type: "TEXT", description: "Context justifying action." },
        { name: "status", type: "VARCHAR(16)", nullable: false, defaultValue: "'PENDING'", description: "State: PENDING, APPROVED, REJECTED." },
        { name: "requested_by", type: "UUID", isFk: true, fkTarget: "users.id", nullable: false, description: "Initiator employee id." },
        { name: "reviewed_by", type: "UUID", isFk: true, fkTarget: "users.id", description: "Authorizing supervisor/director id." },
        { name: "target_file_id", type: "UUID", isFk: true, fkTarget: "files.id", description: "Target asset identifier." },
        { name: "metadata", type: "JSONB", description: "Extra payload data (e.g. target classification string)." },
        { name: "review_note", type: "TEXT", description: "Explanation notes submitted during review approval/rejection." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Request date timestamp." },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Last state modified timestamp." }
      ]
    },
    {
      name: "audit_logs",
      icon: <FileText size={16} />,
      category: "Governance",
      description: "Append-only database journal tracking security actions, compliance upgrades, and endpoint usage patterns. Modifying entries is programmatically blocked.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "user_id", type: "UUID", isFk: true, fkTarget: "users.id", description: "Responsible user id. NULL if system process." },
        { name: "action", type: "VARCHAR(64)", nullable: false, description: "Action identifier keyword (e.g. AUTH_LOGIN, FILE_UPLOAD)." },
        { name: "target_resource", type: "VARCHAR(512)", description: "Details of affected asset/resource path." },
        { name: "ip_address", type: "VARCHAR(45)", description: "Client network address." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Log timestamp." }
      ]
    },
    {
      name: "system_config",
      icon: <Settings size={16} />,
      category: "System",
      description: "Global system configuration keys and overrides. Admin changes values to control global limits without restarts.",
      fields: [
        { name: "key", type: "VARCHAR(128)", isPk: true, description: "Setting lookup key." },
        { name: "value", type: "TEXT", nullable: false, description: "Configuration value settings string." },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Last configuration updated timestamp." }
      ]
    },
    {
      name: "permissions",
      icon: <ShieldCheck size={16} />,
      category: "System",
      description: "System-wide granular permission keys. Used to enforce access controls on specific actions and assets.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "key", type: "VARCHAR(64)", nullable: false, description: "Unique permission key string (e.g. 'files:read', 'users:manage')." },
        { name: "description", type: "TEXT", nullable: false, description: "Human-readable explanation of the action this permission authorizes." }
      ]
    },
    {
      name: "role_groups",
      icon: <ShieldCheck size={16} />,
      category: "System",
      description: "Group mappings (custom roles) configured by administrators. Serves as container collections of permission rules.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "name", type: "VARCHAR(128)", nullable: false, description: "Name of the custom role group." },
        { name: "description", type: "TEXT", nullable: false, defaultValue: "''", description: "Description detailing group role scope." },
        { name: "created_by", type: "VARCHAR(128)", nullable: false, description: "Account identifying the creator." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Timestamp when the role group was created." },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Timestamp of last update." }
      ]
    },
    {
      name: "role_group_permissions",
      icon: <ShieldCheck size={16} />,
      category: "System",
      description: "Junction table mapping permission grants to role groups.",
      fields: [
        { name: "role_group_id", type: "UUID", isPk: true, isFk: true, fkTarget: "role_groups.id", nullable: false, description: "Reference to role group." },
        { name: "permission_id", type: "UUID", isPk: true, isFk: true, fkTarget: "permissions.id", nullable: false, description: "Reference to permission." }
      ]
    },
    {
      name: "user_role_groups",
      icon: <ShieldCheck size={16} />,
      category: "System",
      description: "Junction table mapping users to role groups.",
      fields: [
        { name: "user_id", type: "UUID", isPk: true, isFk: true, fkTarget: "users.id", nullable: false, description: "Reference to user." },
        { name: "role_group_id", type: "UUID", isPk: true, isFk: true, fkTarget: "role_groups.id", nullable: false, description: "Reference to role group." }
      ]
    },
    {
      name: "user_permissions",
      icon: <ShieldCheck size={16} />,
      category: "System",
      description: "Junction table for direct user permission grants, bypassing group configuration.",
      fields: [
        { name: "user_id", type: "UUID", isPk: true, isFk: true, fkTarget: "users.id", nullable: false, description: "Reference to user." },
        { name: "permission_id", type: "UUID", isPk: true, isFk: true, fkTarget: "permissions.id", nullable: false, description: "Reference to permission." }
      ]
    },
    {
      name: "custom_roles",
      icon: <ShieldCheck size={16} />,
      category: "System",
      description: "Supported system clearance roles mapping to numeric clearance levels (e.g. staff, officer, director, chief).",
      fields: [
        { name: "role_key", type: "VARCHAR(32)", isPk: true, description: "Clearance key identifier (e.g. 'chief', 'director', 'officer', 'staff')." },
        { name: "label", type: "VARCHAR(64)", nullable: false, description: "Human-readable name of the role." },
        { name: "level", type: "SMALLINT", nullable: false, defaultValue: "1", description: "Clearance level integer (1=Staff, 2=Officer, 3=Director, 4=Chief)." }
      ]
    },
    {
      name: "role_implicit_permissions",
      icon: <ShieldCheck size={16} />,
      category: "System",
      description: "Implicit permissions automatically granted to specific roles, such as admin panel access or audit logging logs.",
      fields: [
        { name: "role_key", type: "VARCHAR(32)", isPk: true, isFk: true, fkTarget: "custom_roles.role_key", nullable: false, description: "Reference to custom role." },
        { name: "permission_id", type: "UUID", isPk: true, isFk: true, fkTarget: "permissions.id", nullable: false, description: "Reference to permission." }
      ]
    },
    {
      name: "magic_links",
      icon: <Lock size={16} />,
      category: "Identity",
      description: "Temporary security tokens generated for user passwordless authentication.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "user_id", type: "UUID", isFk: true, fkTarget: "users.id", nullable: false, description: "Reference to recipient user." },
        { name: "token", type: "VARCHAR(128)", nullable: false, description: "Secure random magic login token." },
        { name: "expires_at", type: "TIMESTAMPTZ", nullable: false, description: "Link expiration timestamp." },
        { name: "used", type: "BOOLEAN", nullable: false, defaultValue: "FALSE", description: "Flag indicating if token has been verified." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Timestamp token was issued." }
      ]
    },
    {
      name: "password_resets",
      icon: <Lock size={16} />,
      category: "Identity",
      description: "Temporary secure tokens for credential reset workflow sequences.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "user_id", type: "UUID", isFk: true, fkTarget: "users.id", nullable: false, description: "Reference to user." },
        { name: "token", type: "VARCHAR(128)", nullable: false, description: "Secure random reset token." },
        { name: "expires_at", type: "TIMESTAMPTZ", nullable: false, description: "Token expiration timestamp." },
        { name: "used", type: "BOOLEAN", nullable: false, defaultValue: "FALSE", description: "Flag indicating if token has been verified." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Timestamp token was issued." }
      ]
    },
    {
      name: "user_sessions",
      icon: <Clock size={16} />,
      category: "Identity",
      description: "Stores active login sessions and device/IP context details for token validation.",
      fields: [
        { name: "id", type: "UUID", isPk: true, defaultValue: "uuid_generate_v4()", description: "Primary key identifier." },
        { name: "user_id", type: "UUID", isFk: true, fkTarget: "users.id", nullable: false, description: "Reference to user." },
        { name: "token_prefix", type: "VARCHAR(16)", nullable: false, description: "Session tracking prefix identifier." },
        { name: "device", type: "VARCHAR(255)", nullable: false, defaultValue: "''", description: "Client browser user-agent info." },
        { name: "ip", type: "VARCHAR(45)", nullable: false, defaultValue: "''", description: "Client IP address used at creation." },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Timestamp when session started." },
        { name: "last_seen_at", type: "TIMESTAMPTZ", nullable: false, defaultValue: "NOW()", description: "Last observed activity timestamp." }
      ]
    }
];

export default function ERDPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const tableRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Visual connections coordinates map for the 1050x580 canvas
  const connections = useMemo(() => {
    return [
      { id: "c1", from: "webauthn_credentials", to: "users", fromSide: "bottom", toSide: "top" },
      { id: "c2", from: "files", to: "users", fromSide: "left", toSide: "right" },
      { id: "c3", from: "file_versions", to: "files", fromSide: "bottom", toSide: "top" },
      { id: "c4", from: "file_versions", to: "users", fromSide: "left", toSide: "top" },
      { id: "c5", from: "favorites", to: "users", fromSide: "bottom", toSide: "top" },
      { id: "c6", from: "favorites", to: "files", fromSide: "right", toSide: "top" },
      { id: "c7", from: "file_shares", to: "users", fromSide: "left", toSide: "bottom" },
      { id: "c8", from: "file_shares", to: "files", fromSide: "top", toSide: "bottom" },
      { id: "c9", from: "governance_requests", to: "users", fromSide: "left", toSide: "right" },
      { id: "c10", from: "governance_requests", to: "files", fromSide: "left", toSide: "right" },
      { id: "c11", from: "audit_logs", to: "users", fromSide: "left", toSide: "bottom" }
    ];
  }, []);

  const cardCoordinates: { [key: string]: { x: number; y: number; w: number; h: number } } = {
    webauthn_credentials: { x: 50, y: 35, w: 200, h: 105 },
    users: { x: 50, y: 215, w: 200, h: 125 },
    system_config: { x: 50, y: 415, w: 200, h: 105 },
    favorites: { x: 310, y: 85, w: 180, h: 90 },
    files: { x: 550, y: 215, w: 180, h: 145 },
    file_versions: { x: 550, y: 35, w: 180, h: 105 },
    file_shares: { x: 310, y: 385, w: 180, h: 105 },
    governance_requests: { x: 800, y: 215, w: 210, h: 155 },
    audit_logs: { x: 800, y: 415, w: 200, h: 105 }
  };

  const getSideAnchor = (tableName: string, side: string) => {
    const coord = cardCoordinates[tableName];
    if (!coord) return { x: 0, y: 0 };
    switch (side) {
      case "top": return { x: coord.x + coord.w / 2, y: coord.y };
      case "bottom": return { x: coord.x + coord.w / 2, y: coord.y + coord.h };
      case "left": return { x: coord.x, y: coord.y + coord.h / 2 };
      case "right": return { x: coord.x + coord.w, y: coord.y + coord.h / 2 };
      default: return { x: coord.x + coord.w / 2, y: coord.y + coord.h / 2 };
    }
  };

  const getBezierPath = (
    fromTable: string,
    toTable: string,
    fromSide: string,
    toSide: string
  ) => {
    const from = getSideAnchor(fromTable, fromSide);
    const to = getSideAnchor(toTable, toSide);
    const dx = Math.abs(from.x - to.x);
    const dy = Math.abs(from.y - to.y);

    let ctrl1X = from.x;
    let ctrl1Y = from.y;
    let ctrl2X = to.x;
    let ctrl2Y = to.y;

    const pull = Math.min(100, Math.max(30, (dx + dy) * 0.25));

    if (fromSide === "left") ctrl1X -= pull;
    else if (fromSide === "right") ctrl1X += pull;
    else if (fromSide === "top") ctrl1Y -= pull;
    else if (fromSide === "bottom") ctrl1Y += pull;

    if (toSide === "left") ctrl2X -= pull;
    else if (toSide === "right") ctrl2X += pull;
    else if (toSide === "top") ctrl2Y -= pull;
    else if (toSide === "bottom") ctrl2Y += pull;

    return `M ${from.x} ${from.y} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${to.x} ${to.y}`;
  };

  const handleTableClick = (tableName: string) => {
    setSelectedTable(selectedTable === tableName ? null : tableName);
    tableRefs.current[tableName]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const isRelationActive = (from: string, to: string) => {
    const active = selectedTable || hoveredTable;
    if (!active) return false;
    return (from === active && to !== active) || (to === active && from !== active);
  };

  // Search filter matches columns or table name
  const filteredTables = useMemo(() => {
    if (!searchQuery) return tables;
    const query = searchQuery.toLowerCase();
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.fields.some((f) => f.name.toLowerCase().includes(query) || f.type.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded shadow-sm">
          <Network size={12} /> SECTION 14.0 : ENTITY RELATIONSHIP DIAGRAM
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Relational Schema Visualization
        </h2>
        <p className="text-sm sm:text-base text-foreground-muted leading-relaxed font-sans max-w-4xl">
          An interactive, high-fidelity mapping of the PostgreSQL schema tables and indexes. Hover over nodes to highlight path linkages. Click any table node to focus its detail manifest below.
        </p>
      </div>

      {/* Interactive Diagram Canvas Container */}
      <div className="border border-border/20 bg-background-panel/20 backdrop-blur-sm rounded-lg overflow-hidden flex flex-col">
        <div className="p-3 bg-background-panel/40 border-b border-border/10 flex items-center justify-between text-xs font-mono text-foreground-subtle">
          <span className="flex items-center gap-1.5"><Info size={12} className="text-accent" /> Click nodes to scroll to fields; Hover to trace foreign keys.</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-500/80 inline-block border border-amber-600/30" /> PK</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-sky-500/80 inline-block border border-sky-600/30" /> FK</span>
          </span>
        </div>

        {/* Outer Scroll Container for Canvas */}
        <div className="relative overflow-x-auto overflow-y-hidden p-6 bg-radial-grid min-h-[580px]">
          {/* Scroll wrapper forcing width */}
          <div className="relative w-[1050px] h-[540px] mx-auto select-none">
            
            {/* SVG Connector Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <defs>
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Draw Connector Lines */}
              {connections.map((conn) => {
                const isActive = isRelationActive(conn.from, conn.to);
                return (
                  <path
                    key={conn.id}
                    d={getBezierPath(conn.from, conn.to, conn.fromSide, conn.toSide)}
                    fill="none"
                    stroke={isActive ? "var(--color-accent, #e11d48)" : "currentColor"}
                    strokeWidth={isActive ? 2.5 : 1}
                    className={`transition-all duration-300 ${
                      isActive ? "text-accent filter drop-shadow-[0_0_4px_rgba(225,29,72,0.6)]" : "text-border/40"
                    }`}
                    style={isActive ? { filter: "url(#neon-glow)" } : undefined}
                  />
                );
              })}
            </svg>

            {/* Render Absolute positioned Cards */}
            {tables.map((table) => {
              const coords = cardCoordinates[table.name];
              if (!coords) return null;
              
              const isSelected = selectedTable === table.name;
              const isHovered = hoveredTable === table.name;
              const isRelated = selectedTable 
                ? connections.some(c => (c.from === selectedTable && c.to === table.name) || (c.to === selectedTable && c.from === table.name))
                : hoveredTable
                  ? connections.some(c => (c.from === hoveredTable && c.to === table.name) || (c.to === hoveredTable && c.from === table.name))
                  : false;

              return (
                <div
                  key={table.name}
                  style={{
                    left: `${coords.x}px`,
                    top: `${coords.y}px`,
                    width: `${coords.w}px`,
                    height: `${coords.h}px`,
                  }}
                  onMouseEnter={() => setHoveredTable(table.name)}
                  onMouseLeave={() => setHoveredTable(null)}
                  onClick={() => handleTableClick(table.name)}
                  className={`absolute z-10 p-3 rounded-lg border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? "bg-background-panel border-accent shadow-[0_0_12px_rgba(225,29,72,0.25)] scale-[1.02]"
                      : isHovered
                        ? "bg-background-panel border-accent/70 shadow-[0_0_8px_rgba(225,29,72,0.15)] scale-[1.01]"
                        : isRelated
                          ? "bg-background-panel/40 border-border/60 shadow-sm"
                          : "bg-background-panel/30 border-border/20"
                  }`}
                >
                  <div className="space-y-1.5">
                    {/* Card Title */}
                    <div className="flex items-center gap-1.5 border-b border-border/10 pb-1">
                      <span className={`transition-colors ${isSelected || isHovered ? "text-accent" : "text-foreground-subtle"}`}>
                        {table.icon}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">{table.name}</span>
                    </div>

                    {/* Primary fields overview in card */}
                    <div className="font-mono text-[9px] leading-tight space-y-1 text-foreground-subtle">
                      {table.fields.slice(0, 4).map((f) => (
                        <div key={f.name} className="flex justify-between items-center">
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            {f.isPk && <span className="h-1 w-1 bg-amber-500 rounded" />}
                            {f.isFk && <span className="h-1 w-1 bg-sky-400 rounded" />}
                            <span className={f.isPk ? "text-amber-400/90 font-bold" : f.isFk ? "text-sky-300/90 font-medium" : ""}>{f.name}</span>
                          </span>
                          <span className="text-[8px] text-foreground-subtle/50 uppercase truncate max-w-[60px]">{f.type.split("(")[0]}</span>
                        </div>
                      ))}
                      {table.fields.length > 4 && (
                        <div className="text-[8px] text-foreground-subtle/40 italic flex items-center gap-0.5 justify-end">
                          +{table.fields.length - 4} columns
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card category tag */}
                  <div className="flex items-center justify-between text-[8px] font-mono text-foreground-subtle/50 mt-1 uppercase border-t border-border/5 pt-1">
                    <span>{table.category}</span>
                    <span className="text-accent/60">schema</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Database details header and search bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/10 pb-3">
          <h3 className="text-xl font-bold font-serif text-foreground flex items-center gap-2">
            <Database size={18} className="text-accent" /> Field Specifications &amp; Metadata
          </h3>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-foreground-subtle/60" />
            <input
              type="text"
              placeholder="Search tables, columns, or types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background-panel/40 border border-border/20 rounded-md py-2 pl-9 pr-4 text-xs font-mono text-foreground placeholder:text-foreground-subtle/40 focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>

        {/* Detailed cards grid */}
        <div className="space-y-6">
          {filteredTables.map((table) => {
            const isSelected = selectedTable === table.name;

            return (
              <div
                key={table.name}
                ref={(el) => {
                  tableRefs.current[table.name] = el;
                }}
                onMouseEnter={() => setHoveredTable(table.name)}
                onMouseLeave={() => setHoveredTable(null)}
                className={`border rounded-lg bg-background-panel/30 p-5 space-y-4 shadow-sm hover:border-border/60 transition-all duration-300 ${
                  isSelected ? "border-accent ring-1 ring-accent/30 bg-background-panel/50" : "border-border/30"
                }`}
              >
                {/* Table Title Block */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/10 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-accent/5 border border-accent/20 flex items-center justify-center text-accent">
                      {table.icon}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground font-serif">{table.name}</h4>
                      <p className="text-[9px] font-mono text-accent uppercase tracking-wider">{table.category} Schema Model</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[9px] text-foreground-subtle bg-background/55 border border-border/20 px-2 py-0.5 rounded shadow-sm">
                    {table.fields.length} columns defined
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-foreground-subtle leading-relaxed font-sans">
                  {table.description}
                </p>

                {/* Columns layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/10 text-foreground-subtle/80 text-[10px] uppercase tracking-wider">
                        <th className="py-2 px-3">Column Name</th>
                        <th className="py-2 px-3">SQL Data Type</th>
                        <th className="py-2 px-3">Constraints</th>
                        <th className="py-2 px-3">Default Value</th>
                        <th className="py-2 px-3">Utility Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.fields.map((field) => (
                        <tr
                          key={field.name}
                          className={`border-b border-border/5 hover:bg-background-panel/40 transition-colors ${
                            field.isPk 
                              ? "bg-amber-500/[0.02]" 
                              : field.isFk 
                                ? "bg-sky-500/[0.01]" 
                                : ""
                          }`}
                        >
                          {/* Name */}
                          <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-1.5 max-w-[180px] truncate">
                            {field.isPk && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[8px] rounded uppercase font-bold"
                                title="Primary Key"
                              >
                                PK
                              </span>
                            )}
                            {field.isFk && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[8px] rounded uppercase font-bold cursor-help"
                                title={`Foreign Key referencing ${field.fkTarget}`}
                              >
                                FK
                              </span>
                            )}
                            <span className={field.isPk ? "text-amber-400/90" : field.isFk ? "text-sky-300/90" : ""}>
                              {field.name}
                            </span>
                          </td>

                          {/* Data Type */}
                          <td className="py-2.5 px-3 text-foreground-subtle max-w-[120px] truncate">
                            {field.type}
                          </td>

                          {/* Constraints */}
                          <td className="py-2.5 px-3 text-[10px]">
                            {field.nullable === false ? (
                              <span className="text-red-400/80 bg-red-400/5 px-1.5 py-0.5 rounded border border-red-500/10">NOT NULL</span>
                            ) : (
                              <span className="text-foreground-subtle/50 bg-background/30 px-1.5 py-0.5 rounded border border-border/10">NULLABLE</span>
                            )}
                          </td>

                          {/* Default value */}
                          <td className="py-2.5 px-3 text-foreground-subtle/60 text-[10px]">
                            {field.defaultValue ? (
                              <code className="bg-background-panel/40 px-1 py-0.5 rounded text-[9px] border border-border/10">
                                {field.defaultValue}
                              </code>
                            ) : (
                              <span className="text-foreground-subtle/30">-</span>
                            )}
                          </td>

                          {/* Description */}
                          <td className="py-2.5 px-3 text-foreground-subtle text-[11px] font-sans leading-relaxed max-w-[280px]">
                            {field.description}
                            {field.isFk && field.fkTarget && (
                              <div className="text-[10px] text-sky-400/70 mt-1 font-mono">
                                ↳ References: <span className="underline cursor-pointer" onClick={() => handleTableClick(field.fkTarget!.split(".")[0])}>{field.fkTarget}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {filteredTables.length === 0 && (
            <div className="border border-border/20 rounded-lg bg-background-panel/20 p-12 text-center space-y-2">
              <p className="text-sm text-foreground-muted font-sans">
                No database tables or columns matching your query found.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-mono text-accent hover:underline cursor-pointer"
              >
                Clear Search Query
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
