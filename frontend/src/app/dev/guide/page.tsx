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
      desc: "Upload, download, classify, and share strategic assets with full security control.",
      href: "/dev/guide/explorer",
      icon: <Folder size={18} className="text-accent" />,
    },
    {
      title: "Governance Engine",
      desc: "Request and manage file locks or classification updates via formal supervisor approvals.",
      href: "/dev/guide/governance",
      icon: <Shield size={18} className="text-accent" />,
    },
    {
      title: "Security & Credentials",
      desc: "Directory roles, access scopes, and multi-factor biometric passkey configurations.",
      href: "/dev/guide/roles",
      icon: <Users size={18} className="text-accent" />,
    },
    {
      title: "Interactive Scenarios",
      desc: "Step-by-step simulations of real-world operational workflows and governance gates.",
      href: "/dev/guide/scenarios",
      icon: <Play size={18} className="text-accent" />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Intro Hero Section */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[9px] font-semibold text-accent tracking-wider uppercase border border-accent/20 bg-accent-subtle/30 rounded">
          <BookOpen size={10} /> Platforms Manual
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground font-serif">
          Welcome to the Strategic Portal
        </h2>
        <p className="text-xs text-foreground-muted leading-relaxed font-sans max-w-2xl">
          This manual serves as the official operational guide and playbook for all Unggul Axiom staff. The Strategic Portal provides a secured environment for storing critical files, organizing corporate resources, and conducting workflows governed by strict, audited policy constraints.
        </p>
      </div>

      {/* Compliance Warning */}
      <div className="p-4 rounded border border-warning/30 bg-warning/5 flex items-start gap-3">
        <ShieldAlert size={18} className="text-warning shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <span className="font-bold text-foreground font-sans">Mandatory Regulatory Notice</span>
          <p className="text-foreground-muted leading-relaxed font-sans">
            Under Unggul Axiom compliance guidelines, all actions taken inside the Strategic Portal—including file creation, download logs, and sharing configurations—are logged to immutable system database tables. Unauthorized access to files classified above your current clearance level (such as RAHSIA) is strictly prohibited.
          </p>
        </div>
      </div>

      {/* Core Objectives Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <h3 className="text-xs font-bold font-serif text-foreground">Secure Knowledge Management</h3>
          </div>
          <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
            Centralized document libraries represent the core of our corporate intellect. The portal ensures documents are structured, version-protected, and mapped to specific data classifications to protect organizational IP.
          </p>
        </div>
        
        <div className="border border-border/30 rounded bg-background-panel/40 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-accent" />
            <h3 className="text-xs font-bold font-serif text-foreground">Administrative Governance</h3>
          </div>
          <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
            Modifying critical files or security states requires formal justification. The portal automates this path, placing requests in a supervisor review queue before executing operations.
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Explore System Guidelines
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
                  <h4 className="text-xs font-bold text-foreground font-serif group-hover:text-accent transition-colors">
                    {feat.title}
                  </h4>
                  <ChevronRight size={12} className="text-foreground-subtle/50 group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-[11px] text-foreground-subtle leading-relaxed font-sans">
                  {feat.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick-Start Pathway */}
      <div className="border border-border/20 rounded-lg p-5 bg-background/20 space-y-3">
        <h3 className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
          Quick-Start Operations Check
        </h3>
        <div className="space-y-3 font-mono text-[10px] text-foreground-subtle">
          <div className="flex gap-3">
            <span className="font-bold text-accent shrink-0">STEP 01</span>
            <p className="font-sans text-[11px] leading-relaxed">
              <strong>Access the portal:</strong> Login using your company email credentials or set up a biometric passkey on your device for passwordless access (see <Link href="/dev/guide/roles" className="text-accent hover:underline">Section 4</Link>).
            </p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-accent shrink-0">STEP 02</span>
            <p className="font-sans text-[11px] leading-relaxed">
              <strong>Check folder permissions:</strong> Access the <Link href="/dev/guide/explorer" className="text-accent hover:underline">File Explorer</Link> and browse folders. Files marked with SULIT or RAHSIA require designated collaborator access or specific operational roles.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="font-bold text-accent shrink-0">STEP 03</span>
            <p className="font-sans text-[11px] leading-relaxed">
              <strong>Initiate locking:</strong> Prevent overwrites by submitting a locking request via the Actions menu for any files you wish to edit in shared project workspace zones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
