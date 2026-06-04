"use client";

import { useState, useId, useEffect, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  HardDrive,
  Share2,
  Clock,
  Star,
  Trash2,
  ChevronRight,
  Search,
  User,
  LogOut,
  Settings,
  Lock,
  Menu,
  LayoutDashboard,
  Terminal,
  FileCheck,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import StorageQuotaWidget from "@/components/features/StorageQuotaWidget";
import NotificationBell from "@/components/features/NotificationBell";
import { useFileStore } from "@/store/useFileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

interface SidebarLinkProps {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  active?: boolean;
  onClick?: () => void;
}

function SidebarLink({ label, icon: Icon, active, onClick }: SidebarLinkProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded text-[12px] font-mono tracking-wider uppercase transition-all duration-150 border",
        active
          ? "bg-accent/10 border-accent/20 text-accent font-semibold"
          : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50"
      )}
    >
      <Icon className={cn("shrink-0", active ? "text-accent" : "text-foreground-subtle")} size={14} />
      <span>{label}</span>
    </button>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchId = useId();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // ── Auth guard ────────────────────────────────────────────────────────────
  const { isAuthenticated, isLoading: authLoading, user, hydrate, logout } = useAuthStore();
  const fetchQuota = useFileStore((state) => state.fetchQuota);

  useEffect(() => {
    // Use getState() to avoid dependency on the hook reference
    useAuthStore.getState().hydrate();
    const interval = setInterval(() => {
      useAuthStore.getState().hydrate();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Timeout: if auth check takes >10s, force-show login
  const [authTimeout, setAuthTimeout] = useState(false);
  useEffect(() => {
    if (authLoading) {
      const t = setTimeout(() => setAuthTimeout(true), 10000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAuthTimeout(false);
  }, [authLoading]);

  useEffect(() => {
    if (isAuthenticated) fetchQuota();
  }, [isAuthenticated, fetchQuota]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // ── File store ────────────────────────────────────────────────────────────
  const activeView = useFileStore((state) => state.activeView);
  const setActiveView = useFileStore((state) => state.setActiveView);
  const searchQuery = useFileStore((state) => state.searchQuery);
  const setSearchQuery = useFileStore((state) => state.setSearchQuery);
  const currentFolderId = useFileStore((state) => state.currentFolderId);
  const files = useFileStore((state) => state.files);
  const mapsToFolder = useFileStore((state) => state.mapsToFolder);

  const handleSidebarClick = (
    view: "overview" | "files" | "governance" | "shared" | "recent" | "favorites" | "trash"
  ) => {
    setActiveView(view);
    setSidebarOpen(false);
    if (pathname !== "/dashboard") {
      sessionStorage.setItem("unggul-nav-view", view);
      router.push("/dashboard");
    }
  };

  const buildBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [];
    let currentId: string | null = currentFolderId;
    while (currentId !== null) {
      const folder = files.find((f) => f.id === currentId && f.type === "folder");
      if (folder) {
        crumbs.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId;
      } else {
        break;
      }
    }
    return crumbs;
  };
  const breadcrumbs = buildBreadcrumbs();

  const handleLogout = () => {
    startTransition(() => {
      logout();
    });
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (authLoading) {
    if (authTimeout) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center bg-background gap-4">
          <p className="font-mono text-xs text-foreground-subtle">Connection timed out. The server may be unavailable.</p>
          <button onClick={() => { setAuthTimeout(false); hydrate(); }} className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider cursor-pointer">Retry</button>
          <button onClick={() => router.push("/login")} className="h-8 px-4 rounded-sm border border-border bg-background hover:bg-background-subtle/50 text-[10px] font-bold tracking-wider uppercase font-mono text-foreground-subtle transition-colors cursor-pointer">Back to Login</button>
        </div>
      );
    }
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background font-mono text-xs text-foreground-subtle gap-2">
        <Loader2 size={16} className="animate-spin text-accent" />
        INITIALIZING SECURE SESSION...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  const userEmail = user?.email || "admin@unggul.axiom";

  return (
    <div className="relative min-h-dvh flex bg-background text-foreground font-sans overflow-hidden selection:bg-accent selection:text-accent-foreground">

      {/* Skip-to-content link for keyboard users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[300] focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-foreground focus:rounded-sm focus:text-xs focus:font-mono focus:outline-none">
        Skip to content
      </a>

      {/* ── Background Scan Grid Overlay ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[20%] w-[35%] h-[35%] rounded-full bg-accent/5 blur-[120px] hidden md:block" />
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-info/5 blur-[100px] hidden md:block" />
        <div className="absolute inset-0 scan-grid opacity-[0.015] dark:opacity-[0.03]" />
      </div>

      {/* ── Mobile Sidebar Backdrop ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-sm lg:hidden transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* ── Enterprise Sidebar (Fixed Left Navigation) ── */}
      <aside
        aria-label="Sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-border/40 bg-background-panel/85 backdrop-blur-md flex flex-col justify-between p-5 transition-transform duration-300 lg:translate-x-0 lg:static shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="space-y-6 overflow-y-auto max-h-[80vh] pr-1 scrollbar-none">
          {/* Brand header */}
          <div className="flex items-center gap-3 border-b border-border/20 pb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-accent/25 bg-accent-subtle">
              <Shield size={16} className="text-accent" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-tight text-foreground leading-none">
                Unggul Axiom
              </span>
              <span className="font-mono text-[8px] font-bold tracking-[0.25em] text-accent uppercase mt-1 leading-none">
                Workspace Hub
              </span>
            </div>
          </div>

          {/* Secure Status Badge */}
          <div className="p-3 rounded border border-border/30 bg-background/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] uppercase tracking-wider text-foreground-subtle">Session Status</span>
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
            </div>
            <p className="font-mono text-[9px] font-bold truncate text-foreground-muted">{userEmail}</p>
            <div className="flex items-center gap-1.5 text-[8px] text-foreground-subtle font-mono uppercase tracking-wider pt-1.5 border-t border-border/20">
              <Lock size={9} className="text-accent" /> Restricted Sandbox
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4" aria-label="Main navigation">
            <div className="space-y-1">
              <span className="block font-mono text-[8px] uppercase tracking-widest text-foreground-subtle/50 px-3 mb-1.5">
                Command Core
              </span>
              <SidebarLink
                label="Executive Overview"
                icon={LayoutDashboard}
                active={pathname === "/dashboard" && activeView === "overview"}
                onClick={() => handleSidebarClick("overview")}
              />
              <SidebarLink
                label="My Files"
                icon={HardDrive}
                active={pathname === "/dashboard" && activeView === "files"}
                onClick={() => handleSidebarClick("files")}
              />
              <SidebarLink
                label="Governance Board"
                icon={FileCheck}
                active={pathname === "/dashboard" && activeView === "governance"}
                onClick={() => handleSidebarClick("governance")}
              />
              <SidebarLink
                label="Audit Logs"
                icon={Terminal}
                active={pathname === "/dashboard/audit"}
                onClick={() => {
                  router.push("/dashboard/audit");
                  setSidebarOpen(false);
                }}
              />
            </div>

            <div className="space-y-1">
              <span className="block font-mono text-[8px] uppercase tracking-widest text-foreground-subtle/50 px-3 mb-1.5">
                Storage Utilities
              </span>
              <SidebarLink
                label="Shared with Me"
                icon={Share2}
                active={pathname === "/dashboard" && activeView === "shared"}
                onClick={() => handleSidebarClick("shared")}
              />
              <SidebarLink
                label="Recent Files"
                icon={Clock}
                active={pathname === "/dashboard" && activeView === "recent"}
                onClick={() => handleSidebarClick("recent")}
              />
              <SidebarLink
                label="Favorites"
                icon={Star}
                active={pathname === "/dashboard" && activeView === "favorites"}
                onClick={() => handleSidebarClick("favorites")}
              />
              <SidebarLink
                label="Trash Repository"
                icon={Trash2}
                active={pathname === "/dashboard" && activeView === "trash"}
                onClick={() => handleSidebarClick("trash")}
              />
            </div>
          </nav>
        </div>

        {/* ── Storage Quota Widget ── */}
        <StorageQuotaWidget />

      </aside>

      {/* ── Right Content Panel (Dynamic Viewport) ── */}
      <div className="flex-grow flex flex-col overflow-hidden relative">

        {/* ── Sticky Top Navigation (Topbar) ── */}
        <header className="sticky top-0 z-30 h-14 border-b border-border/30 bg-background-panel/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          {/* Mobile hamburger menu & Breadcrumbs */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-foreground-subtle select-none min-w-0">
            {/* Hamburger Trigger button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden h-8 w-8 rounded border border-border bg-background/50 hover:bg-background-subtle/30 flex items-center justify-center text-foreground shrink-0 transition-colors"
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
              aria-expanded={sidebarOpen}
            >
              <Menu size={14} />
            </button>

            <span className="text-foreground-muted/80 hidden sm:inline">Unggul Axiom</span>
            <ChevronRight size={10} className="text-foreground-subtle/60 shrink-0 hidden sm:inline" />
            {pathname === "/dashboard/audit" ? (
              <span className="text-accent font-semibold font-sans tracking-normal">
                Audit Logs
              </span>
            ) : activeView === "overview" ? (
              <span className="text-accent font-semibold font-sans tracking-normal">
                Overview
              </span>
            ) : activeView === "governance" ? (
              <span className="text-accent font-semibold font-sans tracking-normal">
                Governance Board
              </span>
            ) : (
              <>
                <span
                  onClick={() => {
                    setActiveView("files");
                    mapsToFolder(null);
                  }}
                  className="hover:text-accent transition-colors cursor-pointer"
                >
                  My Files
                </span>
                {activeView === "files" ? (
                  breadcrumbs.map((crumb) => (
                    <div key={crumb.id || "root"} className="flex items-center gap-2">
                      <ChevronRight size={10} className="text-foreground-subtle/60 shrink-0" />
                      <span
                        onClick={() => mapsToFolder(crumb.id)}
                        className="hover:text-accent transition-colors cursor-pointer max-w-[120px] truncate"
                      >
                        {crumb.name}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    <ChevronRight size={10} className="text-foreground-subtle/60 shrink-0" />
                    <span className="text-accent font-semibold capitalize font-sans tracking-normal">
                      {activeView.replace("-", " ")}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          {/* Search, Theme Toggle, User Profile */}
          <div className="flex items-center gap-4">

            {/* Global Search Input */}
            <div className="relative group hidden sm:block">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-foreground-subtle">
                <Search size={12} />
              </span>
              <label htmlFor={searchId} className="sr-only">Search corporate drive</label>
              <input
                id={searchId}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search corporate drive..."
                className="h-8 w-56 pl-8 pr-3 rounded border border-input-border bg-input-bg text-xs text-foreground placeholder-foreground-subtle/60 transition-all focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-ring"
              />
            </div>

            {/* Theme Switcher */}
            <ThemeToggle />

            {/* Notification Bell */}
            <NotificationBell />

            {/* User Profile Dropdown Trigger */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 h-8 px-2.5 rounded border border-border bg-background/50 hover:bg-background-subtle/30 transition-colors"
              >
                <div className="h-4.5 w-4.5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                  <User size={10} className="text-accent" />
                </div>
                <span className="text-xs font-mono font-semibold hidden md:inline text-foreground-muted">
                  {user?.fullName?.split(" ")[0] || "admin"}
                </span>
              </button>

              {/* Minimalist Profile Dropdown (Cloudflare-inspired) */}
              {profileDropdownOpen && (
                <>
                  {/* Backdrop Closer */}
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-50 w-56 rounded border border-border/80 bg-background-panel shadow-md p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-2.5 py-1.5 border-b border-border/20 mb-1">
                      <span className="block text-[10px] font-mono uppercase text-foreground-subtle leading-none">
                        Authorized Session
                      </span>
                      <span className="block text-xs font-bold text-foreground mt-1 truncate">
                        {user?.fullName || "Administrator"}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        router.push("/dashboard/settings");
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground-muted hover:text-foreground hover:bg-background-subtle/50 rounded text-left transition-colors font-mono"
                    >
                      <Settings size={12} className="text-foreground-subtle" />
                      Portal Settings
                    </button>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/15 rounded text-left transition-colors font-mono border border-transparent hover:border-destructive/25"
                    >
                      <LogOut size={12} className="text-destructive" />
                      Terminate Session
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>

        </header>

        {/* ── Main Panel Viewport ── */}
        <main id="main-content" className="flex-grow p-6 overflow-y-auto relative">
          {children}
        </main>

      </div>
    </div>
  );
}
