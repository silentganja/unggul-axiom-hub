"use client";
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Shield, Layers,
  Search, ChevronRight, ChevronDown,
  AlertTriangle, CheckCircle, Info,
  Database, Zap, Eye,
} from "lucide-react";

const CATEGORIES = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: BookOpen,
    sections: [
      { id: "overview", title: "System Overview & Architecture" },
      { id: "quick-start", title: "Quick Start Guide" },
      { id: "concepts", title: "Core Concepts" },
    ],
  },
  {
    id: "admin-roles",
    label: "Role Builder",
    icon: Shield,
    sections: [
      { id: "rb-permissions", title: "Managing Permissions" },
      { id: "rb-groups", title: "Role Groups" },
      { id: "rb-custom-roles", title: "Custom Roles & Implicit Permissions" },
      { id: "rb-audit", title: "User Audit & Direct Overrides" },
      { id: "rb-workflow", title: "Role Builder Workflow" },
    ],
  },
  {
    id: "admin-classifications",
    label: "Classification Builder",
    icon: Layers,
    sections: [
      { id: "cb-tiers", title: "Classification Tiers" },
      { id: "cb-access", title: "Access Control Rules" },
      { id: "cb-defaults", title: "Default Rules & New Tiers" },
      { id: "cb-workflow", title: "Classification Workflow" },
    ],
  },
  {
    id: "admin-governance",
    label: "Governance Console",
    icon: CheckCircle,
    sections: [
      { id: "gov-overview", title: "Governance Overview" },
      { id: "gov-approve-reject", title: "Approving & Rejecting Requests" },
      { id: "gov-force", title: "Force Approve & Force Reject" },
      { id: "gov-undo", title: "Undoing Governance Actions" },
    ],
  },
  {
    id: "admin-panel",
    label: "Admin Panel Features",
    icon: Database,
    sections: [
      { id: "admin-dashboard", title: "Admin Dashboard" },
      { id: "admin-users", title: "User Management" },
      { id: "admin-files", title: "File Management" },
      { id: "admin-audit", title: "Audit Log Viewer" },
      { id: "admin-shares", title: "Shares Management" },
      { id: "admin-storage", title: "Storage Management" },
      { id: "admin-config", title: "System Configuration" },
      { id: "admin-uiux", title: "UI/UX Templates" },
      { id: "admin-reset", title: "Database Reset & Initialize" },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard (User-Facing)",
    icon: Eye,
    sections: [
      { id: "dash-overview", title: "Dashboard Overview" },
      { id: "dash-files", title: "My Files — File Explorer" },
      { id: "dash-upload", title: "Uploading Files & Classification" },
      { id: "dash-sharing", title: "File Sharing & Collaboration" },
      { id: "dash-governance", title: "Governance Board (User)" },
      { id: "dash-executive", title: "Executive Overview" },
      { id: "dash-favorites", title: "Favorites & Trash" },
      { id: "dash-settings", title: "User Settings & Profile" },
    ],
  },
  {
    id: "advanced",
    label: "Advanced Topics",
    icon: Zap,
    sections: [
      { id: "adv-permission-resolution", title: "Permission Resolution Flow" },
      { id: "adv-classification-access", title: "Classification Access Flow" },
      { id: "adv-governance-flow", title: "Governance Approval Flow" },
      { id: "adv-security", title: "Security Model & Best Practices" },
      { id: "adv-troubleshooting", title: "Troubleshooting Guide" },
    ],
  },
];

// Flatten for search
const ALL_SECTIONS = CATEGORIES.flatMap((c) =>
  c.sections.map((s) => ({ ...s, category: c.label, categoryId: c.id }))
);

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORIES.map((c) => c.id))
  );
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  const filteredSections = searchQuery
    ? ALL_SECTIONS.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(`doc-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Intersection observer to track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace("doc-", "");
            setActiveSection(id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );

    ALL_SECTIONS.forEach((s) => {
      const el = document.getElementById(`doc-${s.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex gap-0 min-h-[calc(100vh-200px)]">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-border/20 bg-background-panel/40 overflow-y-auto max-h-[calc(100vh-180px)] sticky top-0">
        {/* Search */}
        <div className="p-3 border-b border-border/20">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search docs..."
              className="h-8 w-full pl-8 pr-3 rounded border border-input-border bg-input-bg text-[11px] text-foreground placeholder:text-foreground-subtle/50 focus:outline-none focus:border-accent"
            />
          </div>
          {searchQuery && filteredSections.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {filteredSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSearchQuery("");
                    scrollToSection(s.id);
                    setExpandedCategories((prev) =>
                      new Set([...prev, s.categoryId])
                    );
                  }}
                  className="w-full text-left px-2 py-1 rounded text-[10px] font-mono text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30 transition-colors block truncate"
                >
                  <span className="text-foreground-subtle/50">{s.category}</span>
                  {" → "}
                  {s.title}
                </button>
              ))}
            </div>
          )}
          {searchQuery && filteredSections.length === 0 && (
            <p className="text-[10px] text-foreground-subtle mt-2 px-1">
              No results found.
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isExpanded = expandedCategories.has(cat.id);
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-bold font-sans uppercase tracking-wider text-foreground-subtle hover:text-foreground hover:bg-background-subtle/20 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  <Icon size={13} />
                  {cat.label}
                </button>
                {isExpanded && (
                  <div className="ml-5 space-y-0.5 mt-0.5">
                    {cat.sections.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => scrollToSection(s.id)}
                        className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono transition-colors block truncate ${
                          activeSection === s.id
                            ? "text-accent bg-accent/10 font-bold"
                            : "text-foreground-subtle hover:text-foreground hover:bg-background-subtle/20"
                        }`}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ── Content Area ───────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        className="flex-1 min-w-0 overflow-y-auto max-h-[calc(100vh-180px)] px-8 py-6 space-y-16"
      >
        {/* ══════════════════════════════════════════════════════════════════
            GETTING STARTED
           ══════════════════════════════════════════════════════════════════ */}

        <Section id="overview" title="System Overview & Architecture">
          <p>
            Unggul Axiom Hub is a secure document management platform with
            military-grade classification controls, granular role-based access,
            and a governance workflow for sensitive operations. The system has
            two main interfaces:
          </p>

          <InfoBox>
            <strong>Admin Panel</strong> (<code>/dev/admin</code>) — Configure
            users, roles, permissions, classifications, and governance. Accessible
            only to administrators.
          </InfoBox>
          <InfoBox>
            <strong>Dashboard</strong> (<code>/dashboard</code>) — The
            user-facing interface for browsing, uploading, sharing, and managing
            files. Also includes the Governance Board for requesting and
            approving actions.
          </InfoBox>

          <h3>Architecture Layers</h3>
          <table>
            <thead>
              <tr><th>Layer</th><th>What it does</th></tr>
            </thead>
            <tbody>
              <tr><td>Authentication</td><td>JWT-based auth with Argon2id passwords. Two paths: regular user login and admin panel login.</td></tr>
              <tr><td>Permissions</td><td>16+ atomic permission keys (files:read, governance:approve, etc.). Assigned via role groups, custom roles, or direct overrides.</td></tr>
              <tr><td>Role Groups</td><td>Named bundles of permissions. Users are assigned to groups. A user's effective permissions = union of group memberships + base role implicit + direct overrides.</td></tr>
              <tr><td>Classifications</td><td>Dynamic tiers (TERBUKA, TERHAD, SULIT, RAHSIA + custom). Each tier has access rules defining which permissions grant read/write access.</td></tr>
              <tr><td>Governance</td><td>Approval workflow for sensitive operations: file lock/unlock, classification change, file move, file delete. Requests flow through approver review.</td></tr>
              <tr><td>Files</td><td>Encrypted storage with classification tagging. Every read/write/delete operation checks permissions + classification access.</td></tr>
            </tbody>
          </table>
        </Section>

        <Section id="quick-start" title="Quick Start Guide">
          <h3>First-Time Setup (Admin)</h3>
          <ol>
            <li><strong>Log in</strong> to the Admin Panel at <code>/dev/admin</code> with your admin credentials.</li>
            <li><strong>Create users</strong> — Navigate to <strong>Users</strong> tab. Add staff accounts with roles (chief, director, officer, staff).</li>
            <li><strong>Configure Role Groups</strong> — Navigate to <strong>Roles</strong> tab. Create groups with permission sets (e.g., "Engineering Leads" with files:read, files:write, files:classify).</li>
            <li><strong>Assign users to groups</strong> — In each role group, select which users belong to it.</li>
            <li><strong>Review Classifications</strong> — Navigate to <strong>Classifications</strong> tab. Review the 4 default tiers. Configure access rules if needed.</li>
            <li><strong>Configure System</strong> — Navigate to <strong>Config</strong> tab. Set org name, theme, logo, etc.</li>
            <li><strong>Done</strong> — Users can now log in to the Dashboard and start uploading files.</li>
          </ol>

          <h3>Daily Operations (User)</h3>
          <ol>
            <li>Log in to the <strong>Dashboard</strong> at <code>/dashboard</code>.</li>
            <li><strong>Upload files</strong> — Use the upload form. Select the appropriate classification tier.</li>
            <li><strong>Share files</strong> — Click a file to open the access sheet. Add collaborators by email.</li>
            <li><strong>Request changes</strong> — Use the Governance Board to request file locks, classification changes, moves, or deletions.</li>
            <li><strong>Approve requests</strong> — If you have approval permissions, review and approve/reject pending governance requests.</li>
          </ol>
        </Section>

        <Section id="concepts" title="Core Concepts">
          <h3>Permission Resolution</h3>
          <p>
            When the system checks if a user has a permission, it evaluates in this order:
          </p>
          <ol>
            <li><strong>Fast path</strong> — Chief and Director always have ALL permissions. Officer has a hardcoded subset.</li>
            <li><strong>DB query</strong> — UNION of direct user overrides, base role implicit grants, and role group memberships.</li>
          </ol>
          <p>
            This means a Staff user assigned to a role group inherits all permissions from that group.
            If they're in multiple groups, they get the union of all group permissions.
          </p>

          <h3>Classification Access</h3>
          <p>
            Each classification tier has two sets of rules:
          </p>
          <ul>
            <li><strong>Read access</strong> — Which permissions allow viewing/downloading files of this tier.</li>
            <li><strong>Write access</strong> — Which permissions allow assigning/changing files to this tier.</li>
          </ul>
          <p>
            By default, <code>files:read</code> grants read access to all tiers, and <code>files:classify</code> grants write access to all tiers. Admins can customize these rules per tier.
          </p>

          <h3>Governance Flow</h3>
          <ol>
            <li>User submits a request (lock, unlock, classify, move, delete).</li>
            <li>Supervisor gets notified (if assigned).</li>
            <li>Approver (officer+, director+, or someone with governance:approve) reviews the request.</li>
            <li>Approver approves or rejects with a reason.</li>
            <li>On approval, the action executes automatically (file locked, classification changed, etc.).</li>
            <li>Both requester and approver are notified of the outcome.</li>
          </ol>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════
            ROLE BUILDER
           ══════════════════════════════════════════════════════════════════ */}

        <Section id="rb-permissions" title="Managing Permissions">
          <p>
            Permissions are the atomic units of access control. Each permission is a
            key-value pair defining a specific capability.
          </p>

          <h3>Permission Categories</h3>
          <table>
            <thead><tr><th>Category</th><th>Permissions</th></tr></thead>
            <tbody>
              <tr><td><strong>Files</strong></td><td>files:read, files:write, files:delete, files:classify</td></tr>
              <tr><td><strong>Users</strong></td><td>users:read, users:manage, users:delete</td></tr>
              <tr><td><strong>Governance</strong></td><td>governance:approve, governance:reject</td></tr>
              <tr><td><strong>Admin</strong></td><td>admin:access, shares:manage, audit:read, permissions:manage, role_groups:manage, role_groups:assign</td></tr>
              <tr><td><strong>System</strong></td><td>storage:manage, config:read, config:write, classifications:manage</td></tr>
            </tbody>
          </table>

          <h3>Creating a Permission</h3>
          <ol>
            <li>Navigate to <strong>Roles</strong> → <strong>Permissions</strong> sub-tab.</li>
            <li>Enter a key (e.g., <code>reports:export</code>) and description.</li>
            <li>Click <strong>Create</strong>. The permission is immediately available for assignment.</li>
          </ol>

          <WarningBox>
            Deleting a permission removes it from ALL groups, roles, and classification
            rules via cascade. The system now warns you before deletion, showing exactly
            where the permission is used.
          </WarningBox>
        </Section>

        <Section id="rb-groups" title="Role Groups">
          <p>
            Role Groups are named bundles of permissions. Users assigned to a group
            inherit all its permissions. This is the primary mechanism for granting
            access to Staff users.
          </p>

          <h3>Creating a Role Group</h3>
          <ol>
            <li>Navigate to <strong>Roles</strong> → <strong>Groups</strong> sub-tab.</li>
            <li>Click <strong>New Group</strong>.</li>
            <li>Enter a name (e.g., "Engineering Leads") and optional description.</li>
            <li>Click <strong>Create Group</strong>.</li>
          </ol>

          <h3>Configuring a Group</h3>
          <ol>
            <li>Select the group from the left panel.</li>
            <li><strong>Permissions</strong> — Check the permissions you want to grant. Use Quick Presets for common configurations (Read-Only Auditor, Content Manager, User Manager, Governance Officer, Full Access). Use category Select All / Deselect All for bulk changes.</li>
            <li><strong>Users</strong> — Search and check the users to assign to this group.</li>
            <li>Click <strong>Save Changes</strong> when the indicator shows unsaved changes.</li>
          </ol>

          <InfoBox>
            <strong>Tip:</strong> The permission panel shows warnings when you select
            problematic combinations. For example, selecting <code>files:delete</code>{" "}
            without <code>files:read</code> warns you that the user could delete files
            they cannot see.
          </InfoBox>

          <h3>Duplicating a Group</h3>
          <p>
            Click the copy icon next to a group name. The duplicate copies all
            permissions but NOT the user assignments. Rename the duplicate as needed.
          </p>
        </Section>

        <Section id="rb-custom-roles" title="Custom Roles & Implicit Permissions">
          <p>
            Custom Roles extend the 4 base roles (chief, director, officer, staff)
            with configurable hierarchy levels and implicit permission grants.
          </p>

          <h3>Base Roles (Always Present)</h3>
          <table>
            <thead><tr><th>Role</th><th>Level</th><th>Implicit Permissions</th></tr></thead>
            <tbody>
              <tr><td>Chief</td><td>4</td><td>All 16+ permissions (full access)</td></tr>
              <tr><td>Director</td><td>3</td><td>All 16+ permissions (full access)</td></tr>
              <tr><td>Officer</td><td>2</td><td>files:read, files:write, users:read, governance:approve, governance:reject, audit:read</td></tr>
              <tr><td>Staff</td><td>1</td><td>None (relies on role groups)</td></tr>
            </tbody>
          </table>

          <h3>Creating a Custom Role</h3>
          <ol>
            <li>Navigate to <strong>Roles</strong> → <strong>Roles</strong> sub-tab.</li>
            <li>Enter a key (e.g., <code>manager</code>), label ("Department Manager"), and level (1-10).</li>
            <li>Click <strong>Create</strong>.</li>
            <li>Click <strong>Implicit Permissions</strong> to configure which permissions this role automatically grants.</li>
          </ol>

          <InfoBox>
            The 4 base roles (chief, director, officer, staff) cannot be deleted.
            Custom roles can be deleted freely.
          </InfoBox>
        </Section>

        <Section id="rb-audit" title="User Audit & Direct Overrides">
          <p>
            The User Audit sub-tab lets you inspect any user's effective permissions
            and grant or revoke specific permissions directly, bypassing group membership.
          </p>

          <h3>Viewing a User's Permissions</h3>
          <ol>
            <li>Navigate to <strong>Roles</strong> → <strong>Audit</strong> sub-tab.</li>
            <li>Search for and select a user from the directory.</li>
            <li>The <strong>Effective Permissions Matrix</strong> shows every permission with its source: base role implicit grant, group inheritance, or direct override.</li>
          </ol>

          <h3>Direct Overrides</h3>
          <p>
            Direct overrides let you grant a permission to a specific user regardless of
            their group membership. Check a permission to grant it, uncheck to revoke.
            Click <strong>Save Overrides</strong> to apply.
          </p>

          <WarningBox>
            Direct overrides should be used sparingly. Prefer role groups for
            maintainable, auditable permission management.
          </WarningBox>
        </Section>

        <Section id="rb-workflow" title="Role Builder Workflow">
          <h3>Recommended Setup Pattern</h3>
          <ol>
            <li><strong>Define permissions</strong> — Use the 16 seeded permissions or create custom ones.</li>
            <li><strong>Create role groups</strong> — One group per functional role (Engineering, QA, Management, etc.).</li>
            <li><strong>Configure group permissions</strong> — Assign the minimum necessary permissions to each group.</li>
            <li><strong>Assign users to groups</strong> — Add users to their appropriate groups.</li>
            <li><strong>Audit</strong> — Spot-check users to verify their effective permissions are correct.</li>
            <li><strong>Use overrides sparingly</strong> — For exceptions, use direct overrides.</li>
          </ol>

          <h3>Example: Engineering Team Setup</h3>
          <ol>
            <li>Create group "Engineering Team" with: files:read, files:write, users:read.</li>
            <li>Create group "Engineering Leads" with: files:read, files:write, files:delete, files:classify, users:read, governance:approve, governance:reject.</li>
            <li>Assign all engineers to "Engineering Team".</li>
            <li>Assign lead engineers to BOTH "Engineering Team" and "Engineering Leads".</li>
            <li>Lead engineers now have the union of both groups' permissions.</li>
          </ol>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════
            CLASSIFICATION BUILDER
           ══════════════════════════════════════════════════════════════════ */}

        <Section id="cb-tiers" title="Classification Tiers">
          <p>
            Classification tiers define the sensitivity levels for documents.
            Each tier has a key, label, numeric hierarchy level, and access rules.
          </p>

          <h3>Default Tiers</h3>
          <table>
            <thead><tr><th>Key</th><th>Label</th><th>Level</th><th>Default?</th></tr></thead>
            <tbody>
              <tr><td>TERBUKA</td><td>Terbuka (Open)</td><td>0</td><td>Yes</td></tr>
              <tr><td>TERHAD</td><td>Terhad (Restricted)</td><td>1</td><td>No</td></tr>
              <tr><td>SULIT</td><td>Sulit (Confidential)</td><td>2</td><td>No</td></tr>
              <tr><td>RAHSIA</td><td>Rahsia (Secret)</td><td>3</td><td>No</td></tr>
            </tbody>
          </table>

          <h3>Creating a New Tier</h3>
          <ol>
            <li>Navigate to <strong>Classifications</strong> → <strong>Classifications</strong> sub-tab.</li>
            <li>Click <strong>New Classification</strong>.</li>
            <li>Enter a key (uppercase, e.g., <code>RAHSIA NASIONAL</code>), label, level (higher = more restricted), and description.</li>
            <li>Optionally check "Set as default for new files".</li>
            <li>Click <strong>Create</strong>.</li>
          </ol>

          <InfoBox>
            When you rename a classification key, all files with the old key are
            automatically updated to the new key in a single database transaction.
          </InfoBox>

          <WarningBox>
            You cannot delete a classification if files are using it. Reclassify
            those files first. You also cannot delete the last remaining classification.
          </WarningBox>
        </Section>

        <Section id="cb-access" title="Access Control Rules">
          <p>
            Each classification tier has configurable access rules. You define
            which permissions grant <strong>read</strong> access (who can view
            files of this tier) and which grant <strong>write</strong> access
            (who can assign/change files to this tier).
          </p>

          <h3>Configuring Access Rules</h3>
          <ol>
            <li>Navigate to <strong>Classifications</strong> → <strong>Access Control</strong> sub-tab.</li>
            <li>Select a classification tier from the left panel.</li>
            <li>Check permissions under <strong>Read Access</strong> (who can view).</li>
            <li>Check permissions under <strong>Write Access</strong> (who can assign).</li>
            <li>Click <strong>Save Access Rules</strong>.</li>
          </ol>

          <h3>Default Seed Rules</h3>
          <table>
            <thead><tr><th>Tier</th><th>Read Access</th><th>Write Access</th></tr></thead>
            <tbody>
              <tr><td>TERBUKA (0)</td><td>files:read</td><td>files:write, files:classify</td></tr>
              <tr><td>TERHAD (1)</td><td>files:read</td><td>files:classify</td></tr>
              <tr><td>SULIT (2)</td><td>files:read</td><td>files:classify</td></tr>
              <tr><td>RAHSIA (3)</td><td>files:read</td><td>files:classify</td></tr>
            </tbody>
          </table>

          <InfoBox>
            Chief and Director roles bypass classification access checks entirely —
            they can read and write ALL tiers regardless of configured rules.
          </InfoBox>
        </Section>

        <Section id="cb-defaults" title="Default Rules & New Tiers">
          <h3>Default Access Rules for New Tiers</h3>
          <p>
            When you create a new classification tier, you can configure site-wide
            default access rules that auto-apply. Set these in the{" "}
            <strong>Config</strong> tab:
          </p>
          <table>
            <thead><tr><th>Config Key</th><th>Example Value</th><th>Effect</th></tr></thead>
            <tbody>
              <tr><td><code>classification_default_read_perms</code></td><td><code>files:read</code></td><td>New tiers automatically grant read access to users with files:read</td></tr>
              <tr><td><code>classification_default_write_perms</code></td><td><code>files:classify</code></td><td>New tiers automatically grant write access to users with files:classify</td></tr>
            </tbody>
          </table>
          <p>
            If these config keys are not set, new tiers start with no access rules,
            which means they're accessible to everyone (safe fallback).
          </p>
        </Section>

        <Section id="cb-workflow" title="Classification Workflow">
          <h3>How Classification Access Works</h3>
          <ol>
            <li>Admin creates classification tiers and configures access rules.</li>
            <li>User uploads a file with a classification.</li>
            <li>System checks: does the user have <code>files:classify</code> permission? If not, restricted tiers require a governance request.</li>
            <li>When another user tries to view the file, the system checks: does this user's effective permissions include a permission that grants read access to this tier?</li>
            <li>If yes → file is accessible. If no → access denied.</li>
          </ol>

          <h3>Changing a File's Classification</h3>
          <ol>
            <li>In the Dashboard, select a file and open the access sheet.</li>
            <li>Change the classification dropdown and click Save.</li>
            <li>A governance request is automatically created.</li>
            <li>An approver reviews and approves/rejects the request.</li>
            <li>On approval, the file's classification is updated.</li>
          </ol>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════
            GOVERNANCE CONSOLE
           ══════════════════════════════════════════════════════════════════ */}

        <Section id="gov-overview" title="Governance Overview">
          <p>
            The Governance system provides an approval workflow for sensitive
            file operations. Instead of allowing direct destructive actions,
            users submit requests that must be approved by authorized personnel.
          </p>

          <h3>Request Types</h3>
          <table>
            <thead><tr><th>Type</th><th>What it does</th><th>Approval Required</th></tr></thead>
            <tbody>
              <tr><td>FILE_LOCK</td><td>Lock a file to prevent edits</td><td>Officer+ or governance:approve</td></tr>
              <tr><td>FILE_UNLOCK</td><td>Unlock a previously locked file</td><td>Officer+ or governance:approve</td></tr>
              <tr><td>CLASSIFICATION_UPGRADE</td><td>Increase a file's classification level</td><td>Director+ AND governance:approve</td></tr>
              <tr><td>CLASSIFICATION_DOWNGRADE</td><td>Decrease a file's classification level</td><td>Director+ AND governance:approve</td></tr>
              <tr><td>FILE_MOVE</td><td>Move a file to a different folder</td><td>Officer+ or governance:approve</td></tr>
              <tr><td>FILE_DELETE</td><td>Permanently delete a file</td><td>Officer+ or governance:approve</td></tr>
            </tbody>
          </table>

          <h3>Who Can Do What</h3>
          <table>
            <thead><tr><th>Role</th><th>Can Submit</th><th>Can Approve (General)</th><th>Can Approve (Classification)</th></tr></thead>
            <tbody>
              <tr><td>Chief</td><td>Yes</td><td>Yes (all)</td><td>Yes (all)</td></tr>
              <tr><td>Director</td><td>Yes</td><td>Yes (all)</td><td>Yes (all)</td></tr>
              <tr><td>Officer</td><td>Yes</td><td>Yes (lock/unlock/move/delete)</td><td>No</td></tr>
              <tr><td>Staff</td><td>Yes</td><td>No (unless in group with governance:approve)</td><td>No (even with governance:approve, needs director+)</td></tr>
            </tbody>
          </table>
        </Section>

        <Section id="gov-approve-reject" title="Approving & Rejecting Requests">
          <h3>In the Admin Panel</h3>
          <ol>
            <li>Navigate to <strong>Governance</strong> tab.</li>
            <li>Select a <strong>Reviewer</strong> from the dropdown (this is who the approval will be recorded under).</li>
            <li>Filter by status and type if needed.</li>
            <li>For each request: click <strong>Approve</strong> to immediately execute, or <strong>Reject</strong> to open the rejection modal (minimum 10-character reason required).</li>
          </ol>

          <h3>In the Dashboard</h3>
          <ol>
            <li>Navigate to <strong>Governance Board</strong>.</li>
            <li>Use the status/type filters and click Apply to refresh.</li>
            <li>Only requests you're authorized to act on show Approve/Decline buttons. Your own requests show a status badge instead.</li>
            <li>Select a reviewer to force-approve/reject on someone else's behalf (admin/chief/director only).</li>
          </ol>

          <InfoBox>
            <strong>Batch operations:</strong> Check multiple requests and use the
            floating batch action bar to approve or reject them all at once with a
            single reason.
          </InfoBox>
        </Section>

        <Section id="gov-force" title="Force Approve & Force Reject">
          <p>
            Force Approve and Force Reject let admins act on behalf of a specified
            reviewer. This is useful when:
          </p>
          <ul>
            <li>The original approver is unavailable.</li>
            <li>The admin needs to process requests that require a specific reviewer's name on record.</li>
            <li>A chief submits a request and needs someone else to approve it (self-approval is blocked).</li>
          </ul>

          <h3>How to Force Approve/Reject</h3>
          <ol>
            <li>Select a <strong>Reviewer</strong> from the dropdown (must be chief or director).</li>
            <li>Click Approve or Reject on the request.</li>
            <li>The action is recorded under the selected reviewer's identity.</li>
          </ol>

          <WarningBox>
            Force Approve/Reject requires <code>governance:approve</code> admin
            permission. The selected reviewer must exist in the system.
          </WarningBox>
        </Section>

        <Section id="gov-undo" title="Undoing Governance Actions">
          <h3>Undoing an Approved/Rejected Request</h3>
          <ol>
            <li>In the Admin Governance Console, find the processed request.</li>
            <li>Click the <strong>Undo</strong> button (circular arrow icon).</li>
            <li>The request reverts to PENDING status.</li>
            <li>For FILE_MOVE: the file returns to its original folder.</li>
          </ol>

          <InfoBox>
            Undo is available for APPROVED and REJECTED requests. Only in the
            Admin Governance Console — not in the dashboard Governance Board.
          </InfoBox>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════
            ADMIN PANEL FEATURES
           ══════════════════════════════════════════════════════════════════ */}

        <Section id="admin-dashboard" title="Admin Dashboard">
          <p>
            The admin dashboard (<code>/dev/admin</code>) shows system metrics:
            total users, active users, total files, storage used, pending governance
            requests, locked files, and shared files.
          </p>
          <p>
            Use this page to get a quick health check of the system. The numbers
            update on each page load.
          </p>
        </Section>

        <Section id="admin-users" title="User Management">
          <h3>Creating Users</h3>
          <ol>
            <li>Navigate to <strong>Users</strong> tab.</li>
            <li>Click <strong>New User</strong>.</li>
            <li>Fill in email, password, full name, role, department, supervisor, and storage quota.</li>
            <li>Click <strong>Create</strong>.</li>
          </ol>

          <h3>Bulk User Creation</h3>
          <p>
            Use the <strong>Bulk Create</strong> feature to import multiple users
            at once. Paste or upload a CSV with email, full name, and role columns.
          </p>

          <h3>Editing & Managing Users</h3>
          <ul>
            <li>Click a user to edit their profile, role, department, supervisor, and storage quota.</li>
            <li><strong>Reset Password</strong> — Generates a password reset link for the user.</li>
            <li><strong>Toggle Active</strong> — Deactivate a user (prevents login) without deleting their data.</li>
            <li><strong>Delete User</strong> — Removes the user. Blocked if they have governance history.</li>
          </ul>

          <WarningBox>
            Users with governance history (submitted or reviewed requests) cannot
            be deleted. Deactivate them instead.
          </WarningBox>
        </Section>

        <Section id="admin-files" title="File Management">
          <p>
            The <strong>Files</strong> tab lets admins browse ALL files in the system,
            regardless of ownership. You can:
          </p>
          <ul>
            <li>Browse any user's file tree.</li>
            <li>Force-delete files (bypasses ownership and classification checks).</li>
            <li>Transfer file ownership to another user.</li>
            <li>View file metadata (size, classification, timestamps).</li>
          </ul>
        </Section>

        <Section id="admin-audit" title="Audit Log Viewer">
          <p>
            The <strong>Audit</strong> tab shows a chronological log of all system
            activity. Each entry includes:
          </p>
          <ul>
            <li><strong>Actor</strong> — Who performed the action.</li>
            <li><strong>Action</strong> — What they did (FILE_UPLOAD, GOVERNANCE_APPROVE, ROLE_GROUP_PERMISSIONS, etc.).</li>
            <li><strong>Target</strong> — What was affected (file ID, group name, classification key, etc.).</li>
            <li><strong>Timestamp</strong> — When it happened.</li>
            <li><strong>IP Address</strong> — Where the request came from.</li>
          </ul>

          <h3>Filtering</h3>
          <p>
            Filter by user, action type, and date range. Available action types
            now include all role builder and classification mutations:
            ROLE_GROUP_CREATE, ROLE_GROUP_PERMISSIONS, PERMISSION_DELETE,
            CLASSIFICATION_PERMISSIONS, DATABASE_RESET, and more.
          </p>

          <h3>Rich Diffs</h3>
          <p>
            For permission changes and classification rule changes, the target
            field contains a JSON diff showing the exact before/after state.
            This enables full reconstruction of what changed.
          </p>
        </Section>

        <Section id="admin-shares" title="Shares Management">
          <p>
            The <strong>Shares</strong> tab lists all file sharing relationships
            in the system. Admins can:
          </p>
          <ul>
            <li>View who shared what with whom.</li>
            <li>Revoke any share (remove a user's access to a shared file).</li>
            <li>See share roles (editor vs viewer) and timestamps.</li>
          </ul>
        </Section>

        <Section id="admin-storage" title="Storage Management">
          <p>
            The <strong>Storage</strong> tab shows per-user storage analytics:
          </p>
          <ul>
            <li>File count and total bytes per user.</li>
            <li>Storage quota vs actual usage.</li>
            <li>Classification breakdown (files and bytes per tier).</li>
            <li>Storage trend data for capacity planning.</li>
          </ul>
        </Section>

        <Section id="admin-config" title="System Configuration">
          <p>
            The <strong>Config</strong> tab manages system-wide settings stored
            in the <code>system_config</code> table:
          </p>

          <table>
            <thead><tr><th>Key</th><th>Purpose</th></tr></thead>
            <tbody>
              <tr><td>ui_theme</td><td>midnight, cyberpunk, emerald, ocean</td></tr>
              <tr><td>ui_org_name</td><td>Organization name displayed in headers</td></tr>
              <tr><td>ui_greeting_header</td><td>Welcome text ("Strategic Portal")</td></tr>
              <tr><td>ui_logo_url</td><td>URL to custom logo image</td></tr>
              <tr><td>ui_typography</td><td>sans or serif font family</td></tr>
              <tr><td>ui_glass_blur</td><td>Glassmorphism blur intensity (px)</td></tr>
              <tr><td>ui_glow_intensity</td><td>Glow effect opacity (0-1)</td></tr>
              <tr><td>ui_scanlines_opacity</td><td>Scan line overlay opacity (0-1)</td></tr>
              <tr><td>classification_default_read_perms</td><td>Comma-separated permission keys for auto-read rules on new tiers</td></tr>
              <tr><td>classification_default_write_perms</td><td>Comma-separated permission keys for auto-write rules on new tiers</td></tr>
            </tbody>
          </table>
        </Section>

        <Section id="admin-uiux" title="UI/UX Templates">
          <p>
            The <strong>UI/UX Templates</strong> tab provides a visual preview
            of all UI components and styling in the current theme. Use this to
            verify that your theme configuration produces the desired look.
          </p>
        </Section>

        <Section id="admin-reset" title="Database Reset & Initialize">
          <WarningBox>
            <strong>DANGER ZONE:</strong> This operation permanently deletes all
            transactional data. It cannot be undone.
          </WarningBox>

          <h3>Purpose</h3>
          <p>
            The Database Reset tool prepares the system for its first official
            production deployment by purging all test records, log histories,
            and user-generated content while preserving structural configuration.
          </p>

          <h3>What Gets Wiped</h3>
          <p>files, file_shares, audit_logs, governance_requests, user_role_groups, user_permissions, password_resets, magic_links, webauthn_credentials.</p>

          <h3>What Gets Preserved</h3>
          <p>users, permissions, role_groups, role_group_permissions, custom_roles, role_implicit_permissions, classifications, classification_permissions, system_config, _migrations.</p>

          <h3>How to Use</h3>
          <ol>
            <li>Navigate to <strong>System</strong> tab.</li>
            <li>Click <strong>Request Reset Token</strong> — an 8-character hex token appears with a 5-minute countdown.</li>
            <li>Type the token exactly into the confirmation field.</li>
            <li>Click <strong>I Understand — Unlock Final Step</strong>.</li>
            <li>Review the final warning, then click <strong>Wipe Database Now</strong>.</li>
            <li>The result card shows every table, row counts deleted, and preserved tables.</li>
          </ol>

          <WarningBox>
            <strong>Security:</strong> Only the hardcoded super-admin can initiate a reset.
            The consent token is one-time-use with a 5-minute expiry. All deletions
            run in a single database transaction — any failure rolls back completely.
          </WarningBox>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════
            DASHBOARD
           ══════════════════════════════════════════════════════════════════ */}

        <Section id="dash-overview" title="Dashboard Overview">
          <p>
            The Dashboard (<code>/dashboard</code>) is the primary user interface.
            It has multiple views accessible from the navigation sidebar:
          </p>
          <ul>
            <li><strong>Overview</strong> — Executive summary with governance tasks, recent files, and activity feed.</li>
            <li><strong>My Files</strong> — File explorer with upload, sharing, and classification management.</li>
            <li><strong>Shared With Me</strong> — Files others have shared with you.</li>
            <li><strong>Recent</strong> — Recently accessed files.</li>
            <li><strong>Favorites</strong> — Starred files.</li>
            <li><strong>Trash</strong> — Deleted files (recoverable within retention period).</li>
            <li><strong>Governance Board</strong> — Request and approve governance actions.</li>
          </ul>
        </Section>

        <Section id="dash-files" title="My Files — File Explorer">
          <h3>Browsing Files</h3>
          <p>
            The file explorer shows files and folders in a table view. You can:
          </p>
          <ul>
            <li>Navigate into folders by clicking on them.</li>
            <li>Search files by name using the search bar.</li>
            <li><strong>Classification filter</strong> — Use the dropdown next to the search bar to filter by classification tier.</li>
            <li>Sort by name, size, classification, or last updated by clicking column headers.</li>
            <li>Select multiple files using checkboxes for batch operations (download, move, delete, governance).</li>
          </ul>

          <h3>Classification Badges</h3>
          <p>
            Each file shows a colored classification badge. Colors are based on
            hierarchy level:
          </p>
          <ul>
            <li><strong>Level 0 (TERBUKA):</strong> Gray — unrestricted.</li>
            <li><strong>Level 1 (TERHAD):</strong> Blue — restricted.</li>
            <li><strong>Level 2 (SULIT):</strong> Yellow — confidential.</li>
            <li><strong>Level 3+ (RAHSIA, custom):</strong> Red — secret / highest security.</li>
          </ul>

          <h3>File Actions (Access Sheet)</h3>
          <p>Click any file to open the access sheet, which shows:</p>
          <ul>
            <li><strong>Classification</strong> — Current tier with a dropdown to request changes (goes through governance).</li>
            <li><strong>Lock Status</strong> — Whether the file is locked and by whom.</li>
            <li><strong>Sharing</strong> — Manage collaborators (add/remove, set editor/viewer role).</li>
            <li><strong>Metadata</strong> — File name, type, size, created/updated dates.</li>
          </ul>
        </Section>

        <Section id="dash-upload" title="Uploading Files & Classification">
          <h3>Uploading a File</h3>
          <ol>
            <li>Navigate to <strong>My Files</strong>.</li>
            <li>Click the upload button or drag-and-drop files.</li>
            <li>Select a <strong>Classification</strong> from the dropdown. The system default tier is pre-selected.</li>
            <li>Click <strong>Upload</strong>.</li>
          </ol>

          <h3>Classification Restrictions on Upload</h3>
          <ul>
            <li><strong>TERBUKA:</strong> Anyone can upload.</li>
            <li><strong>TERHAD and above:</strong> Requires <code>files:classify</code> permission, director+ role, or a governance request.</li>
          </ul>

          <InfoBox>
            The classification dropdown shows all tiers dynamically fetched from
            the server. Custom tiers created in the admin panel appear here
            automatically.
          </InfoBox>
        </Section>

        <Section id="dash-sharing" title="File Sharing & Collaboration">
          <h3>Sharing a File</h3>
          <ol>
            <li>Click a file to open the access sheet.</li>
            <li>Enter the recipient's email and select a role: <strong>Editor</strong> (can modify) or <strong>Viewer</strong> (read-only).</li>
            <li>Click <strong>Add</strong>.</li>
          </ol>

          <h3>Classification Restrictions on Sharing</h3>
          <p>
            Files classified above TERBUKA can only be shared with recipients
            who have <code>files:classify</code> permission or director+ role.
            This prevents accidental exposure of sensitive documents.
          </p>

          <h3>Viewing Shared Files</h3>
          <p>
            Navigate to <strong>Shared With Me</strong> to see files others have
            shared with you. Files are filtered by classification — you can only
            see shared files whose classification you have read access to.
          </p>
        </Section>

        <Section id="dash-governance" title="Governance Board (User)">
          <h3>Submitting a Request</h3>
          <ol>
            <li>Navigate to <strong>Governance Board</strong>.</li>
            <li>Click <strong>New Request</strong>.</li>
            <li>Select the request type (FILE_LOCK, CLASSIFICATION_UPGRADE, etc.).</li>
            <li>Select the target file from the picker.</li>
            <li>For classification changes: select the target tier from the dropdown.</li>
            <li>Add a title and description.</li>
            <li>Click <strong>Submit</strong>.</li>
          </ol>

          <h3>Viewing Your Requests</h3>
          <p>
            Your submitted requests appear with a status badge (Pending/Approved/Rejected).
            You cannot approve your own requests — the Approve/Decline buttons are
            hidden for your own submissions.
          </p>

          <h3>Approving Requests (if authorized)</h3>
          <p>
            If you have approval permission (chief, director, officer, or governance:approve
            via role group), you'll see Approve/Decline buttons on other users' pending
            requests. Classification changes additionally require director+ authority.
          </p>

          <h3>Filters</h3>
          <p>
            Use the status filter (All/Pending/Approved/Rejected) and type filter
            to narrow down the request list. Click <strong>Apply</strong> to refresh.
          </p>
        </Section>

        <Section id="dash-executive" title="Executive Overview">
          <p>
            The Executive Overview is the default landing page for directors and
            chiefs. It shows:
          </p>
          <ul>
            <li><strong>Governance Register</strong> — Latest pending requests with quick Approve/Decline (if authorized).</li>
            <li><strong>Recent Files</strong> — Recently modified documents.</li>
            <li><strong>Activity Feed</strong> — Latest system events (uploads, shares, governance actions).</li>
          </ul>
          <p>
            Staff users are redirected to My Files instead. The landing view is
            determined by the user's base role.
          </p>
        </Section>

        <Section id="dash-favorites" title="Favorites & Trash">
          <h3>Favorites</h3>
          <p>
            Star any file or folder to add it to your Favorites. Use the
            Favorites view for quick access to frequently used documents.
            Favorites are personal — they don't affect other users.
          </p>

          <h3>Trash</h3>
          <p>
            Deleted files go to Trash. From Trash you can:
          </p>
          <ul>
            <li><strong>Restore</strong> — Return the file to its original location.</li>
            <li><strong>Permanent Delete</strong> — Irreversibly remove the file.</li>
          </ul>
          <p>
            Trash items are auto-cleaned after a configurable retention period.
            Classification still applies in Trash — you can only see files you
            had access to before deletion.
          </p>
        </Section>

        <Section id="dash-settings" title="User Settings & Profile">
          <h3>Profile Settings</h3>
          <p>
            Navigate to <strong>Settings</strong> from the dashboard to manage:
          </p>
          <ul>
            <li><strong>Full Name</strong> — Your display name.</li>
            <li><strong>Department</strong> — Your organizational unit.</li>
            <li><strong>Supervisor</strong> — Who receives governance notifications for your requests.</li>
            <li><strong>Password</strong> — Change your login password.</li>
            <li><strong>Notification Preferences</strong> — Toggle email and in-app notifications.</li>
          </ul>
        </Section>

        {/* ══════════════════════════════════════════════════════════════════
            ADVANCED TOPICS
           ══════════════════════════════════════════════════════════════════ */}

        <Section id="adv-permission-resolution" title="Permission Resolution Flow">
          <h3>How the System Determines What a User Can Do</h3>

          <p>
            The function <code>user_has_permission(pool, user_id, base_role, permission_key)</code>{" "}
            in <code>models/user.rs</code> is the single entry point for all permission
            checks. Every file operation, governance action, and admin function flows
            through it.
          </p>

          <h4>Step 1: Fast Path</h4>
          <pre>{`match base_role {
    "admin_panel" | "chief" | "director" => return Ok(true),
    "officer" if ["files:read","files:write","users:read",
                   "governance:approve","governance:reject",
                   "audit:read"].contains(&permission_key) => return Ok(true),
    _ => {}
}`}</pre>

          <h4>Step 2: Database Query (UNION)</h4>
          <pre>{`SELECT EXISTS(
    -- Direct user overrides
    SELECT 1 FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = $1 AND p.key = $3
    UNION ALL
    -- Base role implicit grants
    SELECT 1 FROM role_implicit_permissions rip
    JOIN permissions p ON p.id = rip.permission_id
    WHERE rip.role_key = $2 AND p.key = $3
    UNION ALL
    -- Role group membership
    SELECT 1 FROM user_role_groups urg
    JOIN role_group_permissions rgp ON rgp.role_group_id = urg.role_group_id
    JOIN permissions p ON p.id = rgp.permission_id
    WHERE urg.user_id = $1 AND p.key = $3
    LIMIT 1
)`}</pre>

          <h4>Step 3: Result</h4>
          <p>
            If any of the three sources grants the permission, the function returns{" "}
            <code>true</code>. Otherwise <code>false</code>.
          </p>
        </Section>

        <Section id="adv-classification-access" title="Classification Access Flow">
          <h3>How the System Determines Classification Access</h3>

          <h4>Read Access: <code>user_can_read_classification()</code></h4>
          <ol>
            <li>Fast path: chief/director/admin_panel → always true.</li>
            <li>Check if access rules exist for this tier. If none → allow (safe fallback).</li>
            <li>Gather user's effective permission keys.</li>
            <li>Check if any of those permissions has a <code>read</code> rule for this classification.</li>
            <li>If yes → allow. If no → deny.</li>
          </ol>

          <h4>Write Access: <code>user_can_write_classification()</code></h4>
          <p>Same flow but checks for <code>write</code> access type rules.</p>

          <h4>Where It's Enforced</h4>
          <table>
            <thead><tr><th>Operation</th><th>Check</th></tr></thead>
            <tbody>
              <tr><td>File list (shared)</td><td>user_can_read_classification()</td></tr>
              <tr><td>File download</td><td>user_can_read_classification() (non-owner)</td></tr>
              <tr><td>File preview</td><td>user_can_read_classification() (non-owner)</td></tr>
              <tr><td>File upload (restricted tier)</td><td>is_valid_classification() + files:classify</td></tr>
              <tr><td>Classification change</td><td>is_valid_classification() + user_can_write_classification() + files:classify</td></tr>
              <tr><td>File share (restricted tier)</td><td>Recipient must have files:classify or director+</td></tr>
              <tr><td>Governance approve (classification)</td><td>is_valid_classification() + level direction check</td></tr>
            </tbody>
          </table>
        </Section>

        <Section id="adv-governance-flow" title="Governance Approval Flow">
          <h3>End-to-End Governance Lifecycle</h3>

          <h4>1. Submission</h4>
          <pre>{`POST /api/governance/requests
{
  "type": "CLASSIFICATION_UPGRADE",
  "title": "Upgrade Project Helios to SULIT",
  "targetFileId": "uuid",
  "metadata": { "newClassification": "SULIT" }
}`}</pre>
          <p>The handler verifies the file exists and belongs to the user, then creates the request with PENDING status. The user's supervisor is notified.</p>

          <h4>2. Approval</h4>
          <pre>{`POST /api/governance/requests/{id}/approve
{ "reason": "Approved — project sensitivity confirmed" }`}</pre>
          <p>
            The handler validates: user has governance:approve (or is supervisor with it),
            classification changes additionally require director+ authority.
            The classification level direction is validated (upgrade must go to a higher level,
            downgrade to a lower level). The file is updated inside a database transaction
            along with the status change, ensuring atomicity.
          </p>

          <h4>3. Rejection</h4>
          <pre>{`POST /api/governance/requests/{id}/reject
{ "reason": "Rejected — insufficient justification for classification upgrade" }`}</pre>
          <p>Status updated to REJECTED. Minimum 10-character reason required.</p>

          <h4>4. Notification</h4>
          <p>
            After commit, the requester receives a notification with the outcome.
            For FILE_LOCK/FILE_UNLOCK, all users with access to the file are notified.
          </p>

          <h4>5. Undo (Admin Only)</h4>
          <pre>{`POST /api/governance/requests/{id}/undo`}</pre>
          <p>Reverts to PENDING. For FILE_MOVE, the file returns to its original folder.</p>
        </Section>

        <Section id="adv-security" title="Security Model & Best Practices">
          <h3>Authentication</h3>
          <ul>
            <li>JWT-based with HS256 signing. Secret from <code>JWT_SECRET</code> env var.</li>
            <li>Passwords hashed with Argon2id.</li>
            <li>Admin panel uses separate credentials (<code>ADMIN_USERNAME</code> / <code>ADMIN_PASSWORD</code>).</li>
            <li>Two admin auth paths: hardcoded super-admin (full access) or delegated admin (regular user + admin:access permission).</li>
            <li>15-minute idle timeout on admin panel.</li>
            <li>Step-up authentication for critical admin actions.</li>
          </ul>

          <h3>Authorization</h3>
          <ul>
            <li>Permission-based: every action requires a specific permission key.</li>
            <li>Role-based fast paths: chief/director bypass most checks.</li>
            <li>Classification-based: file access gated by tier rules.</li>
            <li>Governance-based: sensitive operations require approval.</li>
          </ul>

          <h3>Best Practices</h3>
          <ol>
            <li><strong>Least privilege:</strong> Assign minimum necessary permissions. Use role groups, not direct overrides.</li>
            <li><strong>Regular audits:</strong> Review the Audit Log and User Audit tabs periodically.</li>
            <li><strong>Classification defaults:</strong> Set <code>classification_default_read_perms</code> and <code>classification_default_write_perms</code> so new tiers are never accidentally open.</li>
            <li><strong>Governance for classification:</strong> Don't give <code>files:classify</code> broadly. Route classification changes through governance.</li>
            <li><strong>Separate duties:</strong> Use granular admin permissions (permissions:manage, role_groups:manage, role_groups:assign) for delegated admins instead of the broad users:manage umbrella.</li>
            <li><strong>Supervisor assignment:</strong> Ensure all users have supervisors so governance requests don't go unnoticed.</li>
            <li><strong>Never enable DB reset in production:</strong> The Database Reset is now always available — use it only in staging/pre-launch.</li>
          </ol>
        </Section>

        <Section id="adv-troubleshooting" title="Troubleshooting Guide">
          <h3>Common Issues</h3>

          <h4>"I can't see Approve/Decline buttons in the Governance Board"</h4>
          <ul>
            <li>You cannot approve your own requests — this is intentional. Requests you submitted show a status badge instead.</li>
            <li>Check that your base role is officer+ or you have <code>governance:approve</code> via a role group.</li>
            <li>For classification changes, you need director+ authority.</li>
          </ul>

          <h4>"A user can't access files they should be able to"</h4>
          <ul>
            <li>Check the User Audit tab to see their effective permissions.</li>
            <li>Verify classification access rules for the file's tier.</li>
            <li>Check if the file is locked (locked files may have additional restrictions).</li>
          </ul>

          <h4>"A governance request I rejected came back"</h4>
          <ul>
            <li>Always select a <strong>Reviewer</strong> from the dropdown before approving or rejecting. If no reviewer is selected, the action uses your user token which may not have sufficient permissions in the admin panel.</li>
            <li>For the admin panel: use Force Approve/Force Reject with a selected reviewer.</li>
          </ul>

          <h4>"A new classification tier doesn't appear in the dashboard"</h4>
          <ul>
            <li>The dashboard fetches classification tiers on page load. Refresh the page.</li>
            <li>Custom tiers appear automatically — no need to update any code.</li>
          </ul>

          <h4>"I deleted a permission and now things are broken"</h4>
          <ul>
            <li>Permissions cascade-delete from all groups, roles, and classification rules.</li>
            <li>The system now warns you before deletion showing exactly where it's used.</li>
            <li>If a critical permission was deleted, recreate it with the same key — but you'll need to reassign it manually.</li>
          </ul>

          <h4>"The Database Reset button shows an error"</h4>
          <ul>
            <li>You must be logged in as the hardcoded super-admin (not a delegated admin).</li>
            <li>The consent token expires after 5 minutes — request a new one.</li>
            <li>Type the token exactly as shown (case-insensitive).</li>
          </ul>
        </Section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="border-t border-border/20 pt-8 pb-16 text-center text-[10px] font-mono text-foreground-subtle/50">
          Unggul Axiom Hub — Documentation v1.0 — {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

// ── Reusable Components ─────────────────────────────────────────────────────

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={`doc-${id}`} className="scroll-mt-20">
      <h2 className="text-xl font-bold text-foreground font-serif mb-4 pb-2 border-b border-border/20">
        {title}
      </h2>
      <div className="prose prose-sm prose-invert max-w-none space-y-4 text-sm text-foreground leading-relaxed [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-foreground-subtle [&_h4]:mt-6 [&_h4]:mb-2 [&_p]:text-foreground/90 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_li]:text-foreground/90 [&_code]:bg-background-subtle/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-accent [&_pre]:bg-background-panel [&_pre]:border [&_pre]:border-border/20 [&_pre]:rounded [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:text-xs [&_pre]:font-mono [&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_th]:text-left [&_th]:px-3 [&_th]:py-2 [&_th]:border-b [&_th]:border-border/30 [&_th]:bg-background-panel/50 [&_th]:font-bold [&_th]:font-sans [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-foreground-subtle [&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border/10 [&_td]:text-foreground/90 [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 my-3 p-3 rounded-md border border-info/20 bg-info/5 text-xs text-foreground/90">
      <Info size={14} className="text-info shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 my-3 p-3 rounded-md border border-destructive/20 bg-destructive/5 text-xs text-foreground/90">
      <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
