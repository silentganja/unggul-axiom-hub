"use client";
/* eslint-disable react/no-unescaped-entities */
import { DocSection, InfoBox } from "@/components/features/admin/DocComponents";

export default function DashboardGuide() {
  return (
    <div className="space-y-16">
      <DocSection id="dash-overview" title="Dashboard Overview">
        <p>The Dashboard is the primary user interface at <code>/dashboard</code>. Navigation views:</p>
        <ul>
          <li><strong>Overview</strong> — Executive summary with governance tasks, recent files, activity feed.</li>
          <li><strong>My Files</strong> — File explorer with upload, sharing, and classification management.</li>
          <li><strong>Shared With Me</strong> — Files others have shared with you.</li>
          <li><strong>Recent</strong> — Recently accessed files.</li>
          <li><strong>Favorites</strong> — Starred files for quick access.</li>
          <li><strong>Trash</strong> — Deleted files (recoverable).</li>
          <li><strong>Governance Board</strong> — Submit and approve governance requests.</li>
        </ul>
        <InfoBox>Chief and Director users land on the Executive Overview. Staff users are redirected to My Files.</InfoBox>
      </DocSection>

      <DocSection id="dash-files" title="My Files — File Explorer">
        <h4>Browsing</h4>
        <ul>
          <li>Navigate folders by clicking on them. Use breadcrumbs to go back.</li>
          <li>Search files by name using the search bar.</li>
          <li><strong>Classification filter:</strong> Dropdown next to the search bar filters by tier.</li>
          <li>Sort by name, size, classification, or last updated by clicking column headers.</li>
          <li>Select multiple files for batch operations (download, move, delete, governance).</li>
        </ul>
        <h4>Classification Badges</h4>
        <p>Color-coded by hierarchy level:</p>
        <ul>
          <li><strong>Level 0:</strong> Gray — unrestricted.</li>
          <li><strong>Level 1:</strong> Blue — restricted.</li>
          <li><strong>Level 2:</strong> Yellow — confidential.</li>
          <li><strong>Level 3+:</strong> Red — secret / highest security.</li>
        </ul>
        <h4>File Access Sheet</h4>
        <p>Click any file to open the side panel showing classification, lock status, sharing controls, and metadata. Classification changes are routed through governance automatically.</p>
      </DocSection>

      <DocSection id="dash-upload" title="Uploading Files">
        <ol>
          <li>Navigate to <strong>My Files</strong>.</li>
          <li>Click upload or drag-and-drop files.</li>
          <li>Select a classification from the dropdown. The system default tier is pre-selected.</li>
          <li>Click <strong>Upload</strong>.</li>
        </ol>
        <InfoBox>TERBUKA files can be uploaded by anyone. TERHAD and above require <code>files:classify</code> permission or director+ role. Otherwise, use a governance request.</InfoBox>
      </DocSection>

      <DocSection id="dash-sharing" title="File Sharing & Collaboration">
        <h4>Sharing a File</h4>
        <ol>
          <li>Click a file to open the access sheet.</li>
          <li>Enter recipient's email and select <strong>Editor</strong> or <strong>Viewer</strong> role.</li>
          <li>Click <strong>Add</strong>.</li>
        </ol>
        <h4>Restrictions</h4>
        <p>Files classified above TERBUKA can only be shared with recipients who have <code>files:classify</code> permission or director+ role. Locked files cannot be shared unless you're the locker or have higher authority.</p>
        <h4>Shared With Me</h4>
        <p>View shared files in the <strong>Shared With Me</strong> view. Files are automatically filtered by classification — you only see what you have read access to.</p>
      </DocSection>

      <DocSection id="dash-governance-board" title="Governance Board (User)">
        <h4>Submitting a Request</h4>
        <ol>
          <li>Go to <strong>Governance Board</strong>. Click <strong>New Request</strong>.</li>
          <li>Select request type, target file, and any additional details.</li>
          <li>For classification changes: the target dropdown auto-detects upgrade vs downgrade based on level comparison.</li>
          <li>Add title and description. Click <strong>Submit</strong>.</li>
        </ol>
        <h4>Viewing Your Requests</h4>
        <p>Your submitted requests show a status badge: Pending (yellow), Approved (green), or Rejected (red). You cannot approve your own requests.</p>
        <h4>Approving Requests</h4>
        <p>If you have approval permission, Approve/Decline buttons appear on other users' pending requests. Classification changes require director+ authority in addition to approval permission.</p>
        <h4>Filters</h4>
        <p>Use status filter (All/Pending/Approved/Rejected) and type filter. Click <strong>Apply</strong> to refresh.</p>
      </DocSection>

      <DocSection id="dash-settings" title="User Settings & Profile">
        <p>Access from the dashboard sidebar. Manage:</p>
        <ul>
          <li><strong>Full Name, Department, Supervisor</strong> — Your profile details.</li>
          <li><strong>Password</strong> — Change your login password.</li>
          <li><strong>Notification Preferences</strong> — Toggle email and in-app notifications.</li>
        </ul>
      </DocSection>
    </div>
  );
}
