"use client";
/* eslint-disable react/no-unescaped-entities */
import { DocSection, InfoBox } from "@/components/features/admin/DocComponents";

export default function CoreConcepts() {
  return (
    <div className="space-y-16">
      <DocSection id="permission-resolution" title="Permission Resolution">
        <p>When the system checks if a user has a permission, it evaluates in this order:</p>
        <ol>
          <li><strong>Fast path</strong> — Chief and Director always have ALL permissions. Officer has a hardcoded subset (files:read, files:write, users:read, governance:approve, governance:reject, audit:read).</li>
          <li><strong>Database query</strong> — A UNION of three sources: direct user overrides, base role implicit grants, and role group memberships. If any source grants the permission, the function returns true.</li>
        </ol>
        <pre>{`SELECT EXISTS(
    SELECT 1 FROM user_permissions up JOIN permissions p ...
    WHERE up.user_id = $1 AND p.key = $3
    UNION ALL
    SELECT 1 FROM role_implicit_permissions rip ...
    WHERE rip.role_key = $2 AND p.key = $3
    UNION ALL
    SELECT 1 FROM user_role_groups urg
    JOIN role_group_permissions rgp ...
    WHERE urg.user_id = $1 AND p.key = $3
    LIMIT 1
)`}</pre>
        <InfoBox>A Staff user in multiple groups gets the UNION of all group permissions. Direct overrides add on top. There is no "deny" — permissions are additive only.</InfoBox>
      </DocSection>

      <DocSection id="classification-access" title="Classification Access">
        <p>Each classification tier has two sets of rules defining which permissions grant access:</p>
        <ul>
          <li><strong>Read access</strong> — Which permissions allow viewing/downloading files of this tier.</li>
          <li><strong>Write access</strong> — Which permissions allow assigning/changing files to this tier.</li>
        </ul>
        <p>Chief and Director bypass all classification access checks. For all other users, the system gathers their effective permission keys and checks if any of them has a matching rule for the classification tier.</p>
        <InfoBox>If a classification tier has no access rules configured, access is allowed (safe fallback). Configure rules to lock down a tier.</InfoBox>
      </DocSection>

      <DocSection id="governance-flow" title="Governance Flow">
        <ol>
          <li>User submits a request (lock, unlock, classify, move, delete).</li>
          <li>Supervisor gets notified (if assigned).</li>
          <li>Approver (officer+, director+, or someone with <code>governance:approve</code>) reviews the request.</li>
          <li>Approver approves or rejects with a written reason (minimum 10 characters).</li>
          <li>On approval, the action executes automatically in a database transaction.</li>
          <li>Both requester and approver are notified of the outcome.</li>
        </ol>
        <h4>Who Can Approve What</h4>
        <table>
          <thead><tr><th>Request Type</th><th>Approval Required</th></tr></thead>
          <tbody>
            <tr><td>FILE_LOCK, FILE_UNLOCK, FILE_MOVE, FILE_DELETE</td><td>Officer+ or governance:approve</td></tr>
            <tr><td>CLASSIFICATION_UPGRADE, CLASSIFICATION_DOWNGRADE</td><td>Director+ AND governance:approve</td></tr>
          </tbody>
        </table>
      </DocSection>

      <DocSection id="admin-auth" title="Admin Authentication">
        <p>The admin panel has two authentication paths:</p>
        <ol>
          <li><strong>Hardcoded Super-Admin:</strong> Login with <code>ADMIN_USERNAME</code> / <code>ADMIN_PASSWORD</code> env vars. Has full unrestricted access. Required for Database Reset.</li>
          <li><strong>Delegated Admin:</strong> A regular user who has the <code>admin:access</code> permission via a role group. Individual admin actions require additional specific permissions.</li>
        </ol>
      </DocSection>
    </div>
  );
}
