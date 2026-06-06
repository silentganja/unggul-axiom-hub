"use client";

import Link from "next/link";
import {
  BookOpen,
  Folder,
  Shield,
  Users,
  Play,
  ChevronRight,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

export default function GuideIntroPage() {
  const portalFeatures = [
    {
      title: "File Explorer",
      desc: "Manage documents, directory namespaces, stars, and shared assets under strict classification controls.",
      href: "/usr/guide/explorer",
      icon: <Folder size={18} className="text-accent" />,
    },
    {
      title: "Governance & Approvals",
      desc: "Submit, review, and execute transactionally-isolated resource governance workflow directives.",
      href: "/usr/guide/governance",
      icon: <Shield size={18} className="text-accent" />,
    },
    {
      title: "Security & Roles",
      desc: "Understand base clearance configurations, dynamic permission groups, and biometric device setups.",
      href: "/usr/guide/roles",
      icon: <Users size={18} className="text-accent" />,
    },
    {
      title: "Operational Scenarios",
      desc: "Walk through step-by-step simulations of real-world API handshakes and database executions.",
      href: "/usr/guide/scenarios",
      icon: <Play size={18} className="text-accent" />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Intro Hero Section */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <BookOpen size={10} /> User Guide
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
          Welcome to the Strategic Portal
        </h2>
        <p className="text-sm text-foreground-muted leading-relaxed font-sans max-w-2xl">
          The Strategic Portal is a security-hardened document repository and collaboration engine. Operating on an asynchronous Actix-Web systems layer, the platform coordinates resource lifecycle operations via cryptographic user session validations, role-based access control (RBAC), and transactional governance pipelines.
        </p>
      </div>

      {/* Compliance Warning */}
      <div className="p-4 rounded border border-warning/30 bg-warning/5 flex items-start gap-3">
        <ShieldAlert size={18} className="text-warning shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <span className="font-bold text-foreground font-sans">Important Compliance Notice</span>
          <p className="text-foreground-muted leading-relaxed font-sans">
            To ensure data safety, the portal automatically logs file uploads, downloads, and sharing activities. Accessing sensitive documents beyond your clearance level without permission is strictly monitored. Please handle all documents according to company policy.
          </p>
        </div>
      </div>

      {/* Core Objectives Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <h3 className="text-sm font-bold font-serif text-foreground">Cryptographic Storage</h3>
          </div>
          <p className="text-sm text-foreground-subtle leading-relaxed font-sans">
            Store documents securely, categorize them under clear security labels, and keep track of files easily. This helps protect valuable company plans and resources.
          </p>
        </div>
        
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-accent" />
            <h3 className="text-sm font-bold font-serif text-foreground">Transactional Integrity</h3>
          </div>
          <p className="text-sm text-foreground-subtle leading-relaxed font-sans">
            Major changes to sensitive files follow a guided review path. You can submit requests directly in the portal, and your supervisor can review and approve them in a few clicks.
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-accent uppercase tracking-widest">
          Find Help Topics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {portalFeatures.map((feat) => (
            <Link
              key={feat.title}
              href={feat.href}
              className="group border border-border/30 rounded bg-background-panel/30 hover:bg-background-panel/60 p-4 flex gap-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background-panel shrink-0 transition-colors group-hover:border-accent/40">
                {feat.icon}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <h4 className="text-sm font-bold text-foreground font-serif group-hover:text-accent transition-colors">
                    {feat.title}
                  </h4>
                  <ChevronRight size={12} className="text-foreground-subtle/50 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-sm text-foreground-subtle leading-relaxed font-sans">
                  {feat.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick-Start Pathway */}
      <div className="border border-border/20 rounded-lg p-5 bg-background/20 space-y-3">
        <h3 className="font-mono text-xs font-bold text-accent uppercase tracking-widest">
          Quick Start Guide for New Users
        </h3>
        <div className="space-y-3 font-mono text-xs text-foreground-subtle">
          <div className="flex gap-3">
            <span className="font-bold text-accent shrink-0">STEP 01</span>
            <p className="font-sans text-sm leading-relaxed">
              <strong>Biometric Enrollment:</strong> Scan your fingerprint or register face recognition details to register cryptographic WebAuthn credentials, enabling secure passwordless session creation (see <Link href="/usr/guide/roles" className="text-accent hover:underline">Section 4</Link>).
            </p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-accent shrink-0">STEP 02</span>
            <p className="font-sans text-sm leading-relaxed">
              <strong>Namespace Discovery:</strong> Browse the directory structures on the <Link href="/usr/guide/explorer" className="text-accent hover:underline">File Explorer</Link>. Access to SULIT and RAHSIA classification blocks is filtered automatically based on your token parameters.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-accent shrink-0">STEP 03</span>
            <p className="font-sans text-sm leading-relaxed">
              <strong>Concurrent Write Safety:</strong> Lock files prior to modification. This registers a locked database status key, preventing simultaneous collaborator edits from overwriting your revision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
