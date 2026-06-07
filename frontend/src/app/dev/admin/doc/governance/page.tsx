"use client";
/* eslint-disable react/no-unescaped-entities */
import { DocSection, InfoBox, WarningBox } from "@/components/features/admin/DocComponents";

export default function Governance() {
  return (
    <div className="space-y-16">
      <DocSection id="gov-overview" title="Governance Overview">
        <p>The Governance system provides an approval workflow for sensitive file operations. Users submit requests; authorized personnel approve or reject them.</p>
        <h4>Request Types</h4>
        <table>
          <thead><tr><th>Type</th><th>Action</th><th>Approval Authority</th></tr></thead>
          <tbody>
            <tr><td>FILE_LOCK</td><td>Lock a file to prevent edits</td><td>Officer+ or governance:approve</td></tr>
            <tr><td>FILE_UNLOCK</td><td>Unlock a previously locked file</td><td>Officer+ or governance:approve</td></tr>
            <tr><td>CLASSIFICATION_UPGRADE</td><td>Increase classification level</td><td>Director+ AND governance:approve</td></tr>
            <tr><td>CLASSIFICATION_DOWNGRADE</td><td>Decrease classification level</td><td>Director+ AND governance:approve</td></tr>
            <tr><td>FILE_MOVE</td><td>Move file to different folder</td><td>Officer+ or governance:approve</td></tr>
            <tr><td>FILE_DELETE</td><td>Delete file (soft delete)</td><td>Officer+ or governance:approve</td></tr>
          </tbody>
        </table>
        <h4>Permission Matrix</h4>
        <table>
          <thead><tr><th>Role</th><th>Submit</th><th>Approve General</th><th>Approve Classification</th></tr></thead>
          <tbody>
            <tr><td>Chief</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Director</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Officer</td><td>Yes</td><td>Yes</td><td>No</td></tr>
            <tr><td>Staff</td><td>Yes</td><td>With governance:approve</td><td>No</td></tr>
          </tbody>
        </table>
      </DocSection>

      <DocSection id="gov-approve-reject" title="Approving & Rejecting Requests">
        <h4>In the Admin Panel</h4>
        <ol>
          <li>Go to <strong>Governance</strong> tab.</li>
          <li><strong>Select a Reviewer</strong> from the dropdown — this is who the action is recorded under. Must be a chief or director.</li>
          <li>Use status and type filters to narrow the list.</li>
          <li>Click <strong>Approve</strong> to immediately execute, or <strong>Reject</strong> to open the rejection modal (minimum 10-character reason required).</li>
        </ol>
        <h4>In the Dashboard</h4>
        <ol>
          <li>Go to <strong>Governance Board</strong>.</li>
          <li>Use status/type filters and click <strong>Apply</strong> to refresh.</li>
          <li>Approve/Decline buttons only appear for requests you're authorized to act on. Your own requests show a status badge instead.</li>
          <li>Optionally select a reviewer to force-approve/reject on their behalf.</li>
        </ol>
        <InfoBox>Batch operations: check multiple requests and use the floating batch action bar to approve or reject them all at once.</InfoBox>
      </DocSection>

      <DocSection id="gov-force" title="Force Approve & Force Reject">
        <p>Force Approve/Reject lets admins act on behalf of a specified reviewer. Use when:</p>
        <ul>
          <li>The original approver is unavailable.</li>
          <li>A specific reviewer's name needs to be on record.</li>
          <li>A chief submits a request and needs someone else to approve it (self-approval is blocked).</li>
        </ul>
        <ol>
          <li>Select a <strong>Reviewer</strong> from the dropdown (chief or director).</li>
          <li>Click Approve or Reject.</li>
          <li>The action is recorded under the selected reviewer's identity.</li>
        </ol>
        <WarningBox>Force Approve/Reject requires <code>governance:approve</code> admin permission.</WarningBox>
      </DocSection>

      <DocSection id="gov-undo" title="Undoing Governance Actions">
        <ol>
          <li>In the Admin Governance Console, find the processed request.</li>
          <li>Click the <strong>Undo</strong> button (circular arrow).</li>
          <li>The request reverts to PENDING status.</li>
          <li>For FILE_MOVE: the file returns to its original folder.</li>
        </ol>
        <InfoBox>Undo is available for APPROVED and REJECTED requests in the Admin Governance Console only (not in the Dashboard Governance Board).</InfoBox>
      </DocSection>
    </div>
  );
}
