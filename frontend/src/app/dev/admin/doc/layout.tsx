"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Shield, Layers, CheckCircle, Database, Eye, Zap,
  Search, ChevronRight, ChevronDown,
} from "lucide-react";

interface DocNavItem {
  label: string;
  href: string;
}

interface DocCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  pages: DocNavItem[];
}

const DOC_NAV: DocCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    icon: BookOpen,
    pages: [
      { label: "Overview & Architecture", href: "/dev/admin/doc" },
      { label: "Quick Start Guide", href: "/dev/admin/doc/quick-start" },
      { label: "Core Concepts", href: "/dev/admin/doc/core-concepts" },
    ],
  },
  {
    id: "role-builder",
    label: "Role Builder",
    icon: Shield,
    pages: [
      { label: "Role Builder Guide", href: "/dev/admin/doc/role-builder" },
    ],
  },
  {
    id: "classifications",
    label: "Classification Builder",
    icon: Layers,
    pages: [
      { label: "Classification Builder Guide", href: "/dev/admin/doc/classifications" },
    ],
  },
  {
    id: "governance",
    label: "Governance Console",
    icon: CheckCircle,
    pages: [
      { label: "Governance Guide", href: "/dev/admin/doc/governance" },
    ],
  },
  {
    id: "admin-features",
    label: "Admin Panel Features",
    icon: Database,
    pages: [
      { label: "Admin Features Guide", href: "/dev/admin/doc/admin-features" },
      { label: "Database Reset", href: "/dev/admin/doc/database-reset" },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard (User-Facing)",
    icon: Eye,
    pages: [
      { label: "Dashboard Guide", href: "/dev/admin/doc/dashboard" },
    ],
  },
  {
    id: "advanced",
    label: "Advanced Topics",
    icon: Zap,
    pages: [
      { label: "Advanced Topics Guide", href: "/dev/admin/doc/advanced" },
    ],
  },
];

export default function DocLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(DOC_NAV.map((c) => c.id))
  );
  const [search, setSearch] = useState("");

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPages = DOC_NAV.flatMap((c) =>
    c.pages.map((p) => ({ ...p, category: c.label, categoryId: c.id }))
  );

  const filtered = search
    ? allPages.filter(
        (p) =>
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.href.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <div className="flex gap-0 min-h-[calc(100vh-200px)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/20 bg-background-panel/40 overflow-y-auto max-h-[calc(100vh-180px)] sticky top-0">
        <div className="p-3 border-b border-border/20">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search docs..."
              className="h-8 w-full pl-8 pr-3 rounded border border-input-border bg-input-bg text-[11px] text-foreground placeholder:text-foreground-subtle/50 focus:outline-none focus:border-accent"
            />
          </div>
          {search && (
            <div className="mt-2 space-y-0.5 max-h-[200px] overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setSearch("")}
                    className="block px-2 py-1 rounded text-[10px] font-mono text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30 no-underline"
                  >
                    <span className="text-foreground-subtle/50">{p.category}</span>
                    {" → "}{p.label}
                  </Link>
                ))
              ) : (
                <p className="text-[10px] text-foreground-subtle px-1">No results.</p>
              )}
            </div>
          )}
        </div>

        <nav className="p-2 space-y-1">
          {DOC_NAV.map((cat) => {
            const Icon = cat.icon;
            const isExpanded = expanded.has(cat.id);
            return (
              <div key={cat.id}>
                <button
                  onClick={() => toggle(cat.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-bold font-sans uppercase tracking-wider text-foreground-subtle hover:text-foreground hover:bg-background-subtle/20 transition-colors"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <Icon size={13} />
                  {cat.label}
                </button>
                {isExpanded && (
                  <div className="ml-5 space-y-0.5 mt-0.5">
                    {cat.pages.map((p) => (
                      <Link
                        key={p.href}
                        href={p.href}
                        className={`block px-2 py-1 rounded text-[10px] font-mono transition-colors no-underline ${
                          pathname === p.href
                            ? "text-accent bg-accent/10 font-bold"
                            : "text-foreground-subtle hover:text-foreground hover:bg-background-subtle/20"
                        }`}
                      >
                        {p.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-y-auto max-h-[calc(100vh-180px)] px-8 py-6">
        {children}
        <div className="border-t border-border/20 pt-8 pb-16 mt-16 text-center text-[10px] font-mono text-foreground-subtle/50">
          Unggul Axiom Hub — Documentation v1.0 — {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
