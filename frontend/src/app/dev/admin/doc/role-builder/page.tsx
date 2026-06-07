"use client";
/* eslint-disable react/no-unescaped-entities */
import { DocSection, InfoBox, WarningBox } from "@/components/features/admin/DocComponents";

export default function RoleBuilder() {
  return (
    <div className="space-y-16">
      <DocSection id="rb-overview" title="Role Builder Overview">
        <p>The Role Builder is the central permission management system. It has four sub-tabs:</p>
        <ul>
          <li><strong>Groups</strong> — Create and manage role groups (bundles of permissions assigned to users).</li>
          <li><strong>Permissions</strong> — Create, edit, and delete permission definitions.</li>
          <li><strong>Roles</strong> — Manage custom base roles and their implicit permission grants.</li>
          <li><strong>Audit</strong> — Inspect any user's effective permissions and apply direct overrides.</li>
        </ul>
      </DocSection>

      <DocSection id="rb-permissions" title="Permissions">
        <p>Permissions are the atomic units of access control. Each is a key-value pair.</p>
        <h4>Current Permission Catalog</h4>
        <table>
          <thead><tr><th>Category</th><th>Permission Keys</th></tr></thead>
          <tbody>
            <tr><td>Files</td><td>files:read, files:write, files:delete, files:classify</td></tr>
            <tr><td>Users</td><td>users:read, users:manage, users:delete</td></tr>
            <tr><td>Governance</td><td>governance:approve, governance:reject</td></tr>
            <tr><td>Admin</td><td>admin:access, shares:manage, audit:read, permissions:manage, role_groups:manage, role_groups:assign</td></tr>
            <tr><td>System</td><td>storage:manage, config:read, config:write, classifications:manage</td></tr>
          </tbody>
        </table>
        <h4>Creating a Permission</h4>
        <ol>
          <li>Go to <strong>Roles</strong> → <strong>Permissions</strong> sub-tab.</li>
          <li>Enter a key (e.g., <code>reports:export</code>) and description.</li>
          <li>Click <strong>Create</strong>.</li>
        </ol>
        <WarningBox>Deleting a permission removes it from ALL groups, roles, and classification rules via cascade. The system now warns you before deletion, showing exactly where the permission is used (which groups, roles, classification rules, and user overrides reference it).</WarningBox>
      </DocSection>

      <DocSection id="rb-groups" title="Role Groups">
        <p>Role Groups are named bundles of permissions. Users assigned to a group inherit all its permissions.</p>
        <h4>Creating a Group</h4>
        <ol>
          <li>Go to <strong>Roles</strong> → <strong>Groups</strong> sub-tab.</li>
          <li>Click <strong>New Group</strong>. Enter name and optional description.</li>
          <li>Select the group from the left panel to configure it.</li>
          <li><strong>Permissions panel:</strong> Check permissions by category. Use Quick Presets for common configs (Read-Only Auditor, Content Manager, User Manager, Governance Officer, Full Access).</li>
          <li><strong>Users panel:</strong> Search and select users to assign to this group.</li>
          <li>Click <strong>Save Changes</strong>.</li>
        </ol>
        <h4>Quick Presets</h4>
        <table>
          <thead><tr><th>Preset</th><th>Permissions</th></tr></thead>
          <tbody>
            <tr><td>Read-Only Auditor</td><td>files:read, users:read, audit:read, config:read</td></tr>
            <tr><td>Content Manager</td><td>files:read, files:write, files:delete, files:classify, shares:manage</td></tr>
            <tr><td>User Manager</td><td>users:read, users:manage, users:delete, admin:access</td></tr>
            <tr><td>Governance Officer</td><td>governance:approve, governance:reject, files:read, users:read, audit:read</td></tr>
            <tr><td>Full Access</td><td>All 19 permissions</td></tr>
          </tbody>
        </table>
        <InfoBox>The permission panel shows warnings when you select problematic combinations — like files:delete without files:read.</InfoBox>
      </DocSection>

      <DocSection id="rb-custom-roles" title="Custom Roles & Implicit Permissions">
        <p>Custom Roles extend the 4 base roles with configurable levels (1-10). Each custom role can have implicit permissions that are automatically granted to any user with that role.</p>
        <h4>Creating a Custom Role</h4>
        <ol>
          <li>Go to <strong>Roles</strong> → <strong>Roles</strong> sub-tab.</li>
          <li>Enter a key, label, and level (1-10).</li>
          <li>Click <strong>Create</strong>.</li>
          <li>Click <strong>Implicit Permissions</strong> to configure which permissions this role grants.</li>
          <li>Save changes.</li>
        </ol>
        <InfoBox>The 4 base roles (chief, director, officer, staff) cannot be deleted. Custom roles can be deleted freely.</InfoBox>
      </DocSection>

      <DocSection id="rb-audit" title="User Audit & Direct Overrides">
        <p>The User Audit sub-tab provides per-user permission inspection and direct override capability.</p>
        <h4>Viewing a User's Permissions</h4>
        <ol>
          <li>Go to <strong>Roles</strong> → <strong>Audit</strong> sub-tab.</li>
          <li>Search for and select a user.</li>
          <li>The <strong>Effective Permissions Matrix</strong> shows every permission with its source: base role, group inheritance, or direct override. Each permission shows "Granted" or "Denied" with the source attribution.</li>
        </ol>
        <h4>Direct Overrides</h4>
        <p>Check permissions under "Direct Overrides Configuration" to grant them directly to the user, bypassing group membership. Click <strong>Save Overrides</strong> to apply.</p>
        <WarningBox>Use direct overrides sparingly. Prefer role groups for maintainable, auditable permission management.</WarningBox>
      </DocSection>
    </div>
  );
}
