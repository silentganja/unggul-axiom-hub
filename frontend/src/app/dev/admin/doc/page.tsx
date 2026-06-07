"use client";
 

import { DocSection, InfoBox } from "@/components/features/admin/DocComponents";

export default function DocOverview() {
  return (
    <div className="space-y-16">
      <DocSection id="overview" title="System Overview & Architecture">
        <p>
          Unggul Axiom Hub is a secure document management platform with
          military-grade classification controls, granular role-based access,
          and a governance workflow for sensitive operations.
        </p>

        <h3>Two Interfaces</h3>
        <InfoBox>
          <strong>Admin Panel</strong> (<code>/dev/admin</code>) — Configure
          users, roles, permissions, classifications, and governance. Accessible
          only to administrators via separate admin credentials.
        </InfoBox>
        <InfoBox>
          <strong>Dashboard</strong> (<code>/dashboard</code>) — User-facing
          interface for browsing, uploading, sharing, and managing files.
          Includes the Governance Board for requesting and approving actions.
        </InfoBox>

        <h3>Architecture Layers</h3>
        <table>
          <thead><tr><th>Layer</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td>Authentication</td><td>JWT-based auth with Argon2id passwords. Two paths: regular user login and admin panel login.</td></tr>
            <tr><td>Permissions</td><td>19 atomic permission keys (files:read, governance:approve, etc.). Assigned via role groups, custom roles, or direct overrides.</td></tr>
            <tr><td>Role Groups</td><td>Named bundles of permissions. Users inherit permissions from all groups they belong to.</td></tr>
            <tr><td>Classifications</td><td>Dynamic tiers (TERBUKA through RAHSIA + custom). Each tier has configurable read/write access rules.</td></tr>
            <tr><td>Governance</td><td>Approval workflow for sensitive operations: file lock/unlock, classification change, file move, file delete.</td></tr>
            <tr><td>Files</td><td>Encrypted storage with classification tagging. Every operation checks permissions + classification access.</td></tr>
          </tbody>
        </table>

        <h3>Key Design Principles</h3>
        <ul>
          <li><strong>Least Privilege by Default:</strong> Staff users start with zero permissions. Everything is granted explicitly.</li>
          <li><strong>Defense in Depth:</strong> File access is gated by both permission checks AND classification access rules.</li>
          <li><strong>Governance for Mutations:</strong> Destructive or sensitive operations require approval — never unilateral.</li>
          <li><strong>Audit Everything:</strong> Every permission change, classification rule change, and governance action is logged with before/after diffs.</li>
          <li><strong>Dynamic Configuration:</strong> Permissions, roles, classifications, and access rules are all database-driven — no code changes needed.</li>
        </ul>
      </DocSection>
    </div>
  );
}
