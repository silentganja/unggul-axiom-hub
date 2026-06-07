"use client";
 
import { DocSection, WarningBox } from "@/components/features/admin/DocComponents";

export default function DatabaseReset() {
  return (
    <div className="space-y-16">
      <DocSection id="reset-overview" title="Database Reset & Initialize">
        <WarningBox><strong>DANGER ZONE:</strong> This operation permanently deletes all transactional data. It cannot be undone. Only the hardcoded super-admin can execute it.</WarningBox>

        <h3>Purpose</h3>
        <p>Prepares the system for its first official production deployment by purging all test records, log histories, and user-generated content while preserving structural configuration.</p>

        <h3>What Gets Wiped (9 tables)</h3>
        <p><code>files, file_shares, audit_logs, governance_requests, user_role_groups, user_permissions, password_resets, magic_links, webauthn_credentials</code></p>

        <h3>What Gets Preserved (10 tables)</h3>
        <p><code>users, permissions, role_groups, role_group_permissions, custom_roles, role_implicit_permissions, classifications, classification_permissions, system_config, _migrations</code></p>

        <h3>Safety Guardrails</h3>
        <ol>
          <li><strong>Super-admin only:</strong> Delegated admins cannot access this feature.</li>
          <li><strong>One-time consent token:</strong> An 8-character hex token is generated. The admin must type it back exactly. Expires after 5 minutes.</li>
          <li><strong>Single transaction:</strong> All deletions run in one database transaction. Any failure rolls back completely.</li>
          <li><strong>Audit logged:</strong> A DATABASE_RESET audit entry is written with total row counts.</li>
        </ol>

        <h3>How to Use</h3>
        <ol>
          <li>Navigate to <strong>System</strong> tab.</li>
          <li>Click <strong>Request Reset Token</strong> — an 8-character hex token appears with a 5-minute countdown.</li>
          <li>Type the token exactly into the confirmation field (characters are displayed individually for verification).</li>
          <li>Click <strong>I Understand — Unlock Final Step</strong>.</li>
          <li>Review the final warning listing exactly what will happen.</li>
          <li>Click <strong>Wipe Database Now</strong>.</li>
          <li>The result card shows every table, row counts deleted, and the preserved tables list.</li>
        </ol>

        <WarningBox>
          <strong>After reset:</strong> User accounts are preserved but all group memberships and direct overrides are cleared. Re-assign users to groups before they can access anything. The system is in a clean state ready for production use.
        </WarningBox>
      </DocSection>
    </div>
  );
}
