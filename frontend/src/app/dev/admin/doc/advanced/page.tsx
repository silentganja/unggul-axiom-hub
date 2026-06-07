"use client";
/* eslint-disable react/no-unescaped-entities */
import { DocSection } from "@/components/features/admin/DocComponents";

export default function Advanced() {
  return (
    <div className="space-y-16">
      <DocSection id="adv-permission" title="Permission Resolution Flow">
        <p>The function <code>user_has_permission(pool, user_id, base_role, key)</code> is the single entry point for all permission checks.</p>
        <h4>Step 1: Fast Path</h4>
        <pre>{`match base_role {
    "admin_panel" | "chief" | "director" => return Ok(true),
    "officer" if [files:read, files:write, users:read,
                   governance:approve, governance:reject,
                   audit:read].contains(&key) => return Ok(true),
    _ => {}
}`}</pre>
        <h4>Step 2: Database UNION Query</h4>
        <p>Checks three sources simultaneously: direct user overrides, base role implicit grants, and role group memberships. Returns true if any source grants the permission.</p>
        <h4>Step 3: Result</h4>
        <p>If any source grants the permission → true. Otherwise → false. Permissions are additive only — there is no explicit deny mechanism.</p>
      </DocSection>

      <DocSection id="adv-classification" title="Classification Access Flow">
        <h4>Read Access: <code>user_can_read_classification()</code></h4>
        <ol>
          <li>Fast path: chief/director → always true.</li>
          <li>Check if access rules exist for this tier. If none → allow (safe fallback).</li>
          <li>Gather user's effective permission keys.</li>
          <li>Check if any permission has a read rule for this classification.</li>
        </ol>
        <h4>Where It's Enforced</h4>
        <table>
          <thead><tr><th>Operation</th><th>Check</th></tr></thead>
          <tbody>
            <tr><td>File list (shared)</td><td>user_can_read_classification</td></tr>
            <tr><td>File download</td><td>user_can_read_classification (non-owner)</td></tr>
            <tr><td>File preview</td><td>user_can_read_classification (non-owner)</td></tr>
            <tr><td>File upload (restricted)</td><td>is_valid_classification + files:classify</td></tr>
            <tr><td>Classification change</td><td>is_valid_classification + user_can_write_classification + files:classify</td></tr>
            <tr><td>Share (restricted)</td><td>Recipient must have files:classify or director+</td></tr>
            <tr><td>Governance approve</td><td>is_valid_classification + level direction check</td></tr>
          </tbody>
        </table>
      </DocSection>

      <DocSection id="adv-governance" title="Governance Approval Flow (End-to-End)">
        <h4>1. Submission</h4>
        <pre>{`POST /api/governance/requests
{ "type": "CLASSIFICATION_UPGRADE",
  "title": "Upgrade to SULIT",
  "targetFileId": "uuid",
  "metadata": { "newClassification": "SULIT" } }`}</pre>
        <p>Handler verifies file ownership, creates PENDING request. Supervisor is notified.</p>

        <h4>2. Approval</h4>
        <pre>{`POST /api/governance/requests/{id}/approve
{ "reason": "Sensitivity confirmed" }`}</pre>
        <p>Validates: user has governance:approve (or is supervisor with it). Classification changes need director+. Validates level direction (upgrade must go higher, downgrade lower). File is updated inside the same database transaction.</p>

        <h4>3. Rejection</h4>
        <pre>{`POST /api/governance/requests/{id}/reject
{ "reason": "Insufficient justification" }`}</pre>
        <p>Status updated to REJECTED. Minimum 10-character reason required.</p>

        <h4>4. Notification</h4>
        <p>After transaction commit, requester receives a real-time notification. For FILE_LOCK/FILE_UNLOCK, all file collaborators are also notified.</p>
      </DocSection>

      <DocSection id="adv-security" title="Security Model & Best Practices">
        <h4>Authentication</h4>
        <ul>
          <li>JWT-based with HS256. Secret from <code>JWT_SECRET</code> env var.</li>
          <li>Passwords hashed with Argon2id.</li>
          <li>Admin panel uses separate credentials. 15-minute idle timeout with auto-logout.</li>
          <li>Step-up authentication for critical admin actions.</li>
        </ul>
        <h4>Best Practices</h4>
        <ol>
          <li><strong>Least privilege:</strong> Minimum necessary permissions. Use role groups, not direct overrides.</li>
          <li><strong>Regular audits:</strong> Review Audit Log and User Audit tabs periodically.</li>
          <li><strong>Classification defaults:</strong> Always set <code>classification_default_read_perms</code> and <code>classification_default_write_perms</code>.</li>
          <li><strong>Governance for classification:</strong> Route classification changes through governance. Don't give files:classify broadly.</li>
          <li><strong>Separate duties:</strong> Use granular admin permissions for delegated admins.</li>
          <li><strong>Supervisor assignment:</strong> Ensure all users have supervisors so governance requests are noticed.</li>
        </ol>
      </DocSection>

      <DocSection id="adv-troubleshooting" title="Troubleshooting Guide">
        <h4>Can't see Approve/Decline buttons in Governance Board</h4>
        <ul>
          <li>You cannot approve your own requests — status badge is shown instead.</li>
          <li>Check that your role is officer+ or you have <code>governance:approve</code> via a role group.</li>
          <li>For classification changes, director+ authority is additionally required.</li>
        </ul>

        <h4>User can't access files they should be able to</h4>
        <ul>
          <li>Check User Audit tab for their effective permissions.</li>
          <li>Verify classification access rules for the file's tier in Access Control.</li>
          <li>Check if the file is locked.</li>
        </ul>

        <h4>Governance request rejected with "Cannot downgrade/upgrade"</h4>
        <ul>
          <li>The request type doesn't match the classification levels. If the target tier is higher than the current, it must be CLASSIFICATION_UPGRADE. If lower, CLASSIFICATION_DOWNGRADE.</li>
          <li>The dashboard now auto-detects the correct type when you select a target classification.</li>
        </ul>

        <h4>Governance action did nothing / request still shows as Pending</h4>
        <ul>
          <li>In the Admin Panel: always select a <strong>Reviewer</strong> from the dropdown before approving or rejecting.</li>
          <li>In the Dashboard: if using force-approve, select a reviewer. Self-approval is blocked — you cannot approve your own requests.</li>
          <li>Check that the API call isn't returning an error. The error should now be displayed in the modal.</li>
        </ul>

        <h4>Deleted a permission and things broke</h4>
        <ul>
          <li>Permissions cascade-delete from all groups, roles, and classification rules.</li>
          <li>The system warns before deletion showing exactly where it's used.</li>
          <li>Recreate the permission with the same key — but reassign it manually.</li>
        </ul>

        <h4>Database Reset error</h4>
        <ul>
          <li>Must be logged in as the hardcoded super-admin (not delegated admin).</li>
          <li>Consent token expires after 5 minutes — request a new one.</li>
        </ul>
      </DocSection>
    </div>
  );
}
