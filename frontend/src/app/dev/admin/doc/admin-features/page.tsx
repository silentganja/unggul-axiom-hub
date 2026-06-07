"use client";
/* eslint-disable react/no-unescaped-entities */
import { DocSection, WarningBox } from "@/components/features/admin/DocComponents";

export default function AdminFeatures() {
  return (
    <div className="space-y-16">
      <DocSection id="admin-dashboard" title="Admin Dashboard">
        <p>The admin dashboard shows real-time system metrics: total users, active users, total files, folders, storage used, pending governance requests, locked files, and shared files. Use it for a quick system health check.</p>
      </DocSection>

      <DocSection id="admin-users" title="User Management">
        <h4>Creating Users</h4>
        <ol>
          <li>Go to <strong>Users</strong> tab. Click <strong>New User</strong>.</li>
          <li>Fill in email, password, full name, role, department, supervisor (optional), and storage quota.</li>
          <li>Click <strong>Create</strong>.</li>
        </ol>
        <h4>Bulk Creation</h4>
        <p>Use <strong>Bulk Create</strong> to import multiple users via CSV with email, full name, and role columns.</p>
        <h4>Managing Users</h4>
        <ul>
          <li><strong>Edit</strong> — Click a user to update profile, role, department, supervisor, storage quota.</li>
          <li><strong>Reset Password</strong> — Sends a password reset email to the user.</li>
          <li><strong>Toggle Active</strong> — Deactivate without deleting. Prevents login.</li>
          <li><strong>Delete</strong> — Blocked if user has governance history. Deactivate instead.</li>
        </ul>
        <WarningBox>Users with governance history cannot be deleted due to FK constraints. Deactivate them instead.</WarningBox>
      </DocSection>

      <DocSection id="admin-files" title="File Management">
        <p>The <strong>Files</strong> tab lets admins browse ALL files regardless of ownership. Capabilities:</p>
        <ul>
          <li>Browse any user's file tree.</li>
          <li>Force-delete files (bypasses ownership and classification checks).</li>
          <li>Transfer file ownership to another user.</li>
          <li>View file metadata (size, classification, timestamps, lock status).</li>
        </ul>
      </DocSection>

      <DocSection id="admin-audit" title="Audit Log Viewer">
        <p>The <strong>Audit</strong> tab shows a chronological log of all system activity. Each entry includes actor, action, target, timestamp, and IP address.</p>
        <h4>Filtering</h4>
        <p>Filter by user, action type, and date range. Action types now include all role builder and classification events: ROLE_GROUP_CREATE, ROLE_GROUP_PERMISSIONS, PERMISSION_DELETE, CLASSIFICATION_PERMISSIONS, DATABASE_RESET, and more.</p>
        <h4>Rich Diffs</h4>
        <p>For permission and classification rule changes, the target field contains a JSON diff showing the exact before/after state. This enables full reconstruction of what changed and who changed it.</p>
      </DocSection>

      <DocSection id="admin-shares" title="Shares Management">
        <p>The <strong>Shares</strong> tab lists all file sharing relationships. Admins can view who shared what with whom, see share roles (editor vs viewer) and timestamps, and revoke any share.</p>
      </DocSection>

      <DocSection id="admin-storage" title="Storage Management">
        <p>The <strong>Storage</strong> tab shows per-user analytics: file count and total bytes, quota vs actual usage, classification breakdown (files and bytes per tier), and storage trends for capacity planning.</p>
      </DocSection>

      <DocSection id="admin-config" title="System Configuration">
        <p>The <strong>Config</strong> tab manages system-wide settings:</p>
        <table>
          <thead><tr><th>Key</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td>ui_theme</td><td>midnight, cyberpunk, emerald, ocean</td></tr>
            <tr><td>ui_org_name</td><td>Organization name in headers</td></tr>
            <tr><td>ui_greeting_header</td><td>Welcome text</td></tr>
            <tr><td>ui_logo_url</td><td>Custom logo image URL</td></tr>
            <tr><td>ui_typography</td><td>sans or serif font family</td></tr>
            <tr><td>ui_glass_blur</td><td>Glassmorphism blur (px)</td></tr>
            <tr><td>ui_glow_intensity</td><td>Glow effect opacity (0-1)</td></tr>
            <tr><td>ui_scanlines_opacity</td><td>Scan line overlay (0-1)</td></tr>
            <tr><td>classification_default_read_perms</td><td>Auto-read rules for new tiers</td></tr>
            <tr><td>classification_default_write_perms</td><td>Auto-write rules for new tiers</td></tr>
          </tbody>
        </table>
      </DocSection>
    </div>
  );
}
