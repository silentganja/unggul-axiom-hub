"use client";
/* eslint-disable react/no-unescaped-entities */
import { DocSection, InfoBox } from "@/components/features/admin/DocComponents";

export default function QuickStart() {
  return (
    <div className="space-y-16">
      <DocSection id="admin-setup" title="First-Time Setup (Admin)">
        <ol>
          <li><strong>Log in</strong> to the Admin Panel at <code>/dev/admin</code> with your admin credentials.</li>
          <li><strong>Create users</strong> — Navigate to <strong>Users</strong> tab. Add staff accounts with roles (chief, director, officer, staff). Set their department and supervisor.</li>
          <li><strong>Configure Role Groups</strong> — Navigate to <strong>Roles</strong> tab. Create groups with permission sets (e.g., "Engineering Leads" with files:read, files:write, files:classify).</li>
          <li><strong>Assign users to groups</strong> — In each role group, select which users belong to it and save.</li>
          <li><strong>Review Classifications</strong> — Navigate to <strong>Classifications</strong> tab. Review the 4 default tiers (TERBUKA, TERHAD, SULIT, RAHSIA). Configure access rules in the Access Control sub-tab.</li>
          <li><strong>Set default rules for new tiers</strong> — In the <strong>Config</strong> tab, set <code>classification_default_read_perms</code> and <code>classification_default_write_perms</code> (comma-separated permission keys).</li>
          <li><strong>Configure System</strong> — In <strong>Config</strong> tab, set org name, theme, logo URL, typography, etc.</li>
          <li><strong>Done</strong> — Users can now log in to the Dashboard and start uploading files.</li>
        </ol>
        <InfoBox>
          After initial testing, use the <strong>Database Reset</strong> tool in the System tab to purge all test data before going live.
        </InfoBox>
      </DocSection>

      <DocSection id="daily-ops" title="Daily Operations (All Users)">
        <ol>
          <li>Log in to the <strong>Dashboard</strong> at <code>/dashboard</code>.</li>
          <li><strong>Upload files</strong> — Use the upload form. Select the appropriate classification tier from the dropdown.</li>
          <li><strong>Browse files</strong> — Navigate folders, search by name, filter by classification tier, sort by column.</li>
          <li><strong>Share files</strong> — Click a file to open the access sheet. Add collaborators by email with editor or viewer role.</li>
          <li><strong>Request changes</strong> — Use the Governance Board to submit requests for file locks, classification changes, file moves, or deletions.</li>
          <li><strong>Approve requests</strong> — Users with approval permissions can review and approve/reject pending governance requests.</li>
        </ol>
      </DocSection>

      <DocSection id="roles-reference" title="Quick Reference: Base Roles">
        <table>
          <thead><tr><th>Role</th><th>Level</th><th>Can Govern</th><th>Can Govern Classified</th><th>Implicit Permissions</th></tr></thead>
          <tbody>
            <tr><td>Chief</td><td>4</td><td>Yes</td><td>Yes</td><td>All permissions</td></tr>
            <tr><td>Director</td><td>3</td><td>Yes</td><td>Yes</td><td>All permissions</td></tr>
            <tr><td>Officer</td><td>2</td><td>Yes</td><td>No</td><td>files:read, files:write, users:read, governance:approve, governance:reject, audit:read</td></tr>
            <tr><td>Staff</td><td>1</td><td>No</td><td>No</td><td>None (rely on role groups)</td></tr>
          </tbody>
        </table>
      </DocSection>
    </div>
  );
}
