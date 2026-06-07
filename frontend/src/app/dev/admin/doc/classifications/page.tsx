"use client";
 
import { DocSection, InfoBox, WarningBox } from "@/components/features/admin/DocComponents";

export default function Classifications() {
  return (
    <div className="space-y-16">
      <DocSection id="cb-overview" title="Classification Builder Overview">
        <p>Classification tiers define document sensitivity levels. Each tier has a key, label, numeric hierarchy level, and configurable access rules. Two sub-tabs:</p>
        <ul>
          <li><strong>Classifications</strong> — Create, edit, and delete tiers.</li>
          <li><strong>Access Control</strong> — Configure which permissions grant read/write access to each tier.</li>
        </ul>
      </DocSection>

      <DocSection id="cb-tiers" title="Classification Tiers">
        <h4>Default Tiers</h4>
        <table>
          <thead><tr><th>Key</th><th>Label</th><th>Level</th><th>Default?</th></tr></thead>
          <tbody>
            <tr><td>TERBUKA</td><td>Terbuka (Open)</td><td>0</td><td>Yes</td></tr>
            <tr><td>TERHAD</td><td>Terhad (Restricted)</td><td>1</td><td>No</td></tr>
            <tr><td>SULIT</td><td>Sulit (Confidential)</td><td>2</td><td>No</td></tr>
            <tr><td>RAHSIA</td><td>Rahsia (Secret)</td><td>3</td><td>No</td></tr>
          </tbody>
        </table>
        <h4>Creating a New Tier</h4>
        <ol>
          <li>Click <strong>New Classification</strong>.</li>
          <li>Enter a key (uppercase), label, level (higher = more restricted), and description.</li>
          <li>Click <strong>Create</strong>.</li>
          <li>Go to <strong>Access Control</strong> sub-tab to configure access rules for the new tier.</li>
        </ol>
        <InfoBox>Renaming a classification key automatically updates all files with the old key in a single database transaction.</InfoBox>
        <WarningBox>You cannot delete a classification if files are using it. You also cannot delete the last remaining classification.</WarningBox>
      </DocSection>

      <DocSection id="cb-access" title="Access Control Rules">
        <p>Each tier has two sets of rules defining which permissions grant access:</p>
        <ul>
          <li><strong>Read Access</strong> — Who can view/download files of this tier.</li>
          <li><strong>Write Access</strong> — Who can assign/change files to this tier.</li>
        </ul>
        <h4>Default Seed Rules</h4>
        <table>
          <thead><tr><th>Tier</th><th>Read Access</th><th>Write Access</th></tr></thead>
          <tbody>
            <tr><td>TERBUKA</td><td>files:read</td><td>files:write, files:classify</td></tr>
            <tr><td>TERHAD</td><td>files:read</td><td>files:classify</td></tr>
            <tr><td>SULIT</td><td>files:read</td><td>files:classify</td></tr>
            <tr><td>RAHSIA</td><td>files:read</td><td>files:classify</td></tr>
          </tbody>
        </table>
        <InfoBox>Chief and Director bypass classification access checks entirely — they can read and write ALL tiers regardless of configured rules.</InfoBox>
        <h4>Configuring Rules</h4>
        <ol>
          <li>Go to <strong>Access Control</strong> sub-tab.</li>
          <li>Select a tier from the left panel.</li>
          <li>Check permissions under Read Access and Write Access.</li>
          <li>Click <strong>Save Access Rules</strong>.</li>
        </ol>
      </DocSection>

      <DocSection id="cb-defaults" title="Default Rules for New Tiers">
        <p>When creating a new classification, the system auto-applies default access rules if configured. Set these in the <strong>Config</strong> tab:</p>
        <table>
          <thead><tr><th>Config Key</th><th>Example</th></tr></thead>
          <tbody>
            <tr><td><code>classification_default_read_perms</code></td><td><code>files:read</code></td></tr>
            <tr><td><code>classification_default_write_perms</code></td><td><code>files:classify</code></td></tr>
          </tbody>
        </table>
        <InfoBox>Without these config keys, new tiers start with no access rules. In that state, access is allowed to everyone (safe fallback). Configure defaults to lock down new tiers immediately.</InfoBox>
      </DocSection>
    </div>
  );
}
