"use client";

import { useState, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Lock,
  Fingerprint,
  Eye,
  EyeOff,
  ArrowLeft,
  Camera,
  Bell,
  Laptop,
  Key,
  Copy,
  Plus,
  Trash2,
  UserCheck,
  Building,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi, UpdateProfilePayload, webauthnApi } from "@/lib/api";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "security" | "notifications" | "sessions" | "developer";

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  isCurrent: boolean;
  lastActive: string;
}

interface DeveloperToken {
  id: string;
  name: string;
  token: string;
  scopes: string[];
  expiresAt: string;
  createdAt: string;
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullNameId = useId();
  const currentPassId = useId();
  const newPassId = useId();
  const confirmPassId = useId();
  const tokenNameId = useId();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // ── Profile state ──────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);

  // ── Password state ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // ── Notifications state ────────────────────────────────────────────────────
  const [notifRules, setNotifRules] = useState({
    emailShare: true,
    emailDownload: false,
    emailGov: true,
    appShare: true,
    appDownload: true,
    appGov: true,
  });

  // ── Sessions state ─────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ActiveSession[]>([
    {
      id: "sess-1",
      device: "Windows Desktop",
      browser: "Chrome 124.0",
      location: "Kuala Lumpur, Malaysia",
      ip: "175.143.22.81",
      isCurrent: true,
      lastActive: "Active now",
    },
    {
      id: "sess-2",
      device: "Apple iPhone 15 Pro",
      browser: "Safari Mobile",
      location: "Petaling Jaya, Malaysia",
      ip: "115.135.48.9",
      isCurrent: false,
      lastActive: "2 hours ago",
    },
    {
      id: "sess-3",
      device: "MacBook Pro",
      browser: "Firefox Developer Edition",
      location: "Singapore",
      ip: "128.199.223.4",
      isCurrent: false,
      lastActive: "3 days ago",
    },
  ]);

  // ── Developer Tokens state ─────────────────────────────────────────────────
  const [tokens, setTokens] = useState<DeveloperToken[]>([]);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenExpiry, setNewTokenExpiry] = useState("30");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["read_files"]);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // ── Load state from storage on mount ────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load avatar
      const cachedAvatar = localStorage.getItem("user-avatar");
      if (cachedAvatar) setAvatarBase64(cachedAvatar);

      // Load notif rules
      const cachedNotif = localStorage.getItem("user-notif-rules");
      if (cachedNotif) {
        try { setNotifRules(JSON.parse(cachedNotif)); } catch { /* ignore */ }
      }

      // Load developer tokens
      const cachedTokens = localStorage.getItem("user-dev-tokens");
      if (cachedTokens) {
        try { setTokens(JSON.parse(cachedTokens)); } catch { /* ignore */ }
      }
    }
  }, []);

  // ── Hydrate auth on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) hydrate();
  }, [user, hydrate]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-accent" />
      </div>
    );
  }

  // ── Initial avatar calculation ─────────────────────────────────────────────
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((p) => p.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  // ── Avatar Upload Handler ──────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (e.g. 1.5MB to fit local storage easily)
    if (file.size > 1500000) {
      setError("Avatar image size must be less than 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarBase64(base64String);
      localStorage.setItem("user-avatar", base64String);
      setSuccess("Avatar updated successfully.");
      setTimeout(() => setSuccess(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarBase64(null);
    localStorage.removeItem("user-avatar");
    setSuccess("Avatar removed.");
    setTimeout(() => setSuccess(null), 3000);
  };

  // ── Save profile updates ──────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);
    try {
      const payload: UpdateProfilePayload = {};
      if (fullName.trim() && fullName.trim() !== user.fullName) {
        payload.fullName = fullName.trim();
      }
      if (Object.keys(payload).length === 0) {
        setSuccess("No changes to save.");
        setIsSaving(false);
        return;
      }
      const updated = await authApi.updateProfile(payload);
      localStorage.setItem("auth-user", JSON.stringify(updated));
      await hydrate();
      setSuccess("Profile settings updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Change Password handler ───────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile({
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  // ── WebAuthn Passkey Registration ────────────────────────────────────────
  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true);
    setPasskeyStatus(null);
    try {
      await webauthnApi.startRegistration();
      setPasskeyStatus("Biometric Passkey registered successfully!");
    } catch (err) {
      setPasskeyStatus(err instanceof Error ? err.message : "Passkey registration failed.");
    } finally {
      setPasskeyLoading(false);
    }
  };

  // ── Notification preference update ─────────────────────────────────────────
  const handleToggleNotif = (key: keyof typeof notifRules) => {
    const updated = { ...notifRules, [key]: !notifRules[key] };
    setNotifRules(updated);
    localStorage.setItem("user-notif-rules", JSON.stringify(updated));
  };

  // ── Session Revocation ─────────────────────────────────────────────────────
  const handleRevokeSession = (id: string) => {
    setRevokingId(id);
    setTimeout(() => {
      const updated = sessions.filter((s) => s.id !== id);
      setSessions(updated);
      setRevokingId(null);
      setSuccess("Device session terminated successfully.");
      setTimeout(() => setSuccess(null), 3000);
    }, 1000);
  };

  // ── Developer Token Operations ─────────────────────────────────────────────
  const handleGenerateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    const rawToken = `ua_pat_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
    const expires = newTokenExpiry === "never" 
      ? "Never" 
      : new Date(Date.now() + Number(newTokenExpiry) * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB");

    const created = new Date().toLocaleDateString("en-GB");

    const newToken: DeveloperToken = {
      id: `tok-${Date.now()}`,
      name: newTokenName.trim(),
      token: rawToken,
      scopes: [...selectedScopes],
      expiresAt: expires,
      createdAt: created
    };

    const updated = [newToken, ...tokens];
    setTokens(updated);
    localStorage.setItem("user-dev-tokens", JSON.stringify(updated));
    setGeneratedToken(rawToken);
    setNewTokenName("");
  };

  const handleDeleteToken = (id: string) => {
    const updated = tokens.filter((t) => t.id !== id);
    setTokens(updated);
    localStorage.setItem("user-dev-tokens", JSON.stringify(updated));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Token copied to clipboard!");
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/20 pb-4 select-none">
        <button
          onClick={() => router.push("/dashboard")}
          className="h-7 w-7 flex items-center justify-center rounded-sm border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={14} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
            Portal Settings
          </h1>
          <p className="text-xs text-foreground-subtle font-mono mt-1">
            Manage your personal profile, credentials, notifications, active devices, and API tokens.
          </p>
        </div>
      </div>

      {/* Main Settings Box (Double-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-border/30 rounded bg-background-panel/40 backdrop-blur-sm shadow-sm overflow-hidden min-h-[500px]">
        
        {/* Left Column Settings Sidebar */}
        <aside className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-border/20 bg-background-panel/50 p-4 space-y-2 select-none">
          <span className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest px-3 block mb-3">
            Settings Menu
          </span>
          <nav className="space-y-1">
            {(
              [
                { id: "profile", label: "General Profile", icon: <User size={13} /> },
                { id: "security", label: "Security & Password", icon: <Lock size={13} /> },
                { id: "notifications", label: "Notifications", icon: <Bell size={13} /> },
                { id: "sessions", label: "Active Sessions", icon: <Laptop size={13} /> },
                { id: "developer", label: "Developer API", icon: <Key size={13} /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError(null);
                  setSuccess(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono rounded border transition-all cursor-pointer text-left",
                  activeTab === tab.id
                    ? "bg-accent-subtle/30 border-accent/30 text-accent font-extrabold"
                    : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/40"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Right Column Panels Area */}
        <main className="lg:col-span-9 p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-6">
            
            {/* Feedback Banners */}
            {error && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive animate-in fade-in duration-200">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 rounded border border-success/30 bg-success/5 px-3.5 py-2.5 text-xs text-success animate-in fade-in duration-200">
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* TAB PANEL: GENERAL PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Visual Avatar Manager */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded border border-border/20 bg-background/20">
                  <div className="relative group select-none">
                    {avatarBase64 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarBase64}
                        alt="Profile avatar"
                        className="h-16 w-16 rounded-full border border-accent/30 object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-accent/15 border-2 border-accent/30 text-accent font-bold font-mono text-xl flex items-center justify-center shrink-0">
                        {getInitials(user.fullName)}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                      title="Upload photo"
                    >
                      <Camera size={14} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left">
                    <h3 className="text-sm font-semibold text-foreground font-serif">Profile Photograph</h3>
                    <p className="text-[10px] text-foreground-subtle font-mono max-w-sm">
                      Upload a JPEG or PNG image. Image size must not exceed 1.5MB.
                    </p>
                    <div className="flex gap-2 justify-center sm:justify-start pt-1 font-mono text-[9px] font-bold uppercase">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-accent hover:underline cursor-pointer"
                      >
                        Change Photo
                      </button>
                      {avatarBase64 && (
                        <>
                          <span className="text-foreground-subtle/30">|</span>
                          <button
                            onClick={handleRemoveAvatar}
                            className="text-destructive hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={fullNameId}
                      className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block"
                    >
                      Full Name
                    </label>
                    <input
                      id={fullNameId}
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-9 w-full max-w-md px-3 rounded-sm border border-input-border bg-input-bg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    />
                  </div>

                  {/* Read-Only Corporate Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                        Corporate Email
                      </span>
                      <div className="h-9 px-3 flex items-center rounded-sm border border-border/30 bg-background/50 text-sm text-foreground-muted font-mono select-all">
                        {user.email}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                        Sovereign Clearance
                      </span>
                      <div className="h-9 px-3 flex items-center rounded-sm border border-border/30 bg-background/50 text-sm text-foreground-muted capitalize font-mono">
                        <ShieldCheck
                          size={13}
                          className={cn(
                            "mr-1.5",
                            (user.role === "chief" || user.role === "director") ? "text-accent" : user.role === "officer" ? "text-info" : "text-foreground-subtle"
                          )}
                        />
                        {user.role}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                        Assigned Department
                      </span>
                      <div className="h-9 px-3 flex items-center rounded-sm border border-border/30 bg-background/50 text-sm text-foreground-muted font-mono">
                        <Building size={13} className="mr-1.5 text-foreground-subtle" />
                        Strategic Operations
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                        Direct Supervisor
                      </span>
                      <div className="h-9 px-3 flex items-center rounded-sm border border-border/30 bg-background/50 text-sm text-foreground-muted font-mono">
                        <UserCheck size={13} className="mr-1.5 text-foreground-subtle" />
                        Chief Mirza
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                        Member Since
                      </span>
                      <div className="h-9 px-3 flex items-center rounded-sm border border-border/30 bg-background/50 text-sm text-foreground-muted font-mono">
                        <Calendar size={13} className="mr-1.5 text-foreground-subtle" />
                        {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {isSaving && <Loader2 size={12} className="animate-spin" />}
                      Save Profile Changes
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB PANEL: SECURITY & PASSWORDS */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Password Form */}
                <form onSubmit={handleChangePassword} className="space-y-4 border-b border-border/20 pb-6">
                  <h3 className="text-sm font-semibold text-foreground font-serif">Change Account Password</h3>
                  
                  <div className="space-y-1.5">
                    <label
                      htmlFor={currentPassId}
                      className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block"
                    >
                      Current Password
                    </label>
                    <div className="relative max-w-md">
                      <input
                        id={currentPassId}
                        type={showCurrentPass ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="h-9 w-full px-3 pr-10 rounded-sm border border-input-border bg-input-bg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass((v) => !v)}
                        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-foreground-subtle hover:text-foreground cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                    <div className="space-y-1.5">
                      <label
                        htmlFor={newPassId}
                        className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block"
                      >
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          id={newPassId}
                          type={showNewPass ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-9 w-full px-3 pr-10 rounded-sm border border-input-border bg-input-bg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                          placeholder="Min 6 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass((v) => !v)}
                          className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-foreground-subtle hover:text-foreground cursor-pointer"
                        >
                          {showNewPass ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor={confirmPassId}
                        className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block"
                      >
                        Confirm New Password
                      </label>
                      <input
                        id={confirmPassId}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-9 w-full px-3 rounded-sm border border-input-border bg-input-bg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {isSaving && <Loader2 size={12} className="animate-spin" />}
                      Update Account Password
                    </button>
                  </div>
                </form>

                {/* Biometric Passkeys */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-foreground font-serif flex items-center gap-1.5">
                      <Fingerprint size={16} className="text-accent" />
                      Biometric Sign-In (Passkeys)
                    </h3>
                    <p className="text-[10px] text-foreground-subtle font-mono leading-relaxed">
                      Configure a fingerprint scanner or face recognition key to sign in securely. 
                      Once enrolled, you can bypass your password on the login screen.
                    </p>
                  </div>

                  {passkeyStatus && (
                    <div className={cn(
                      "flex items-start gap-2 rounded border px-3.5 py-2.5 text-xs max-w-md animate-in fade-in duration-200",
                      passkeyStatus.includes("success") ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive"
                    )}>
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{passkeyStatus}</span>
                    </div>
                  )}

                  <button
                    onClick={handleRegisterPasskey}
                    disabled={passkeyLoading}
                    className="btn-shimmer h-9 px-5 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Fingerprint size={13} />
                    {passkeyLoading && <Loader2 size={12} className="animate-spin" />}
                    Register Biometric Lock
                  </button>
                </div>
              </div>
            )}

            {/* TAB PANEL: NOTIFICATION RULES */}
            {activeTab === "notifications" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground font-serif">Notification Rules</h3>
                  <p className="text-[10px] text-foreground-subtle font-mono">
                    Configure when the portal alerts you about file activities and governance updates.
                  </p>
                </div>

                <div className="border border-border/30 rounded bg-background/10 divide-y divide-border/10 max-w-xl text-xs font-sans">
                  
                  {/* Email share */}
                  <div className="flex items-center justify-between p-4 gap-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">File Shared With Me (Email)</span>
                      <p className="text-[10px] text-foreground-subtle">Receive an email when a colleague shares a folder or file with you.</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotif("emailShare")}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer",
                        notifRules.emailShare ? "bg-accent" : "bg-border-strong"
                      )}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform", notifRules.emailShare ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>

                  {/* Email download */}
                  <div className="flex items-center justify-between p-4 gap-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">File Downloads (Email)</span>
                      <p className="text-[10px] text-foreground-subtle">Receive an email alert when another collaborator downloads your owned files.</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotif("emailDownload")}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer",
                        notifRules.emailDownload ? "bg-accent" : "bg-border-strong"
                      )}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform", notifRules.emailDownload ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>

                  {/* Email governance */}
                  <div className="flex items-center justify-between p-4 gap-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">Governance Verdict Updates (Email)</span>
                      <p className="text-[10px] text-foreground-subtle">Receive email notifications when your lock or classification requests are approved or rejected.</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotif("emailGov")}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer",
                        notifRules.emailGov ? "bg-accent" : "bg-border-strong"
                      )}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform", notifRules.emailGov ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>

                  {/* App share */}
                  <div className="flex items-center justify-between p-4 gap-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">File Shared With Me (In-App)</span>
                      <p className="text-[10px] text-foreground-subtle">Show a notification badge inside the portal when files are shared with you.</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotif("appShare")}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer",
                        notifRules.appShare ? "bg-accent" : "bg-border-strong"
                      )}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform", notifRules.appShare ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>

                  {/* App download */}
                  <div className="flex items-center justify-between p-4 gap-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">File Downloads (In-App)</span>
                      <p className="text-[10px] text-foreground-subtle">Show a alert inside the portal header bell when files are downloaded.</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotif("appDownload")}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer",
                        notifRules.appDownload ? "bg-accent" : "bg-border-strong"
                      )}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform", notifRules.appDownload ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>

                  {/* App governance */}
                  <div className="flex items-center justify-between p-4 gap-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground">Governance Verdict Updates (In-App)</span>
                      <p className="text-[10px] text-foreground-subtle">Show an alert badge inside the portal bell when governance locks or updates approve.</p>
                    </div>
                    <button
                      onClick={() => handleToggleNotif("appGov")}
                      className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer",
                        notifRules.appGov ? "bg-accent" : "bg-border-strong"
                      )}
                    >
                      <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform", notifRules.appGov ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB PANEL: ACTIVE SESSIONS */}
            {activeTab === "sessions" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground font-serif">Logged-In Devices</h3>
                  <p className="text-[10px] text-foreground-subtle font-mono">
                    View and revoke active sessions logged into your account.
                  </p>
                </div>

                <div className="border border-border/30 rounded bg-background/10 divide-y divide-border/10 max-w-xl text-[11px] font-mono">
                  {sessions.map((sess) => (
                    <div key={sess.id} className="flex items-center justify-between p-4 gap-4 hover:bg-background-panel/20 transition-colors">
                      <div className="flex gap-3 items-start min-w-0">
                        <Laptop className="text-foreground-subtle shrink-0 mt-0.5" size={15} />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-semibold text-foreground truncate">{sess.device}</span>
                            {sess.isCurrent ? (
                              <span className="bg-success/15 border border-success/35 text-success text-[8px] font-bold uppercase px-1 py-0.5 rounded leading-none">
                                Current
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-foreground-subtle leading-tight truncate">
                            {sess.browser} &middot; {sess.ip} &middot; {sess.location}
                          </p>
                          <p className="text-[9px] text-accent/80 font-mono flex items-center gap-1">
                            Last checked: {sess.lastActive}
                          </p>
                        </div>
                      </div>
                      
                      {!sess.isCurrent ? (
                        <button
                          onClick={() => handleRevokeSession(sess.id)}
                          disabled={revokingId === sess.id}
                          className="h-7 px-3 border border-destructive/20 text-destructive bg-destructive/5 hover:bg-destructive/15 transition-all rounded text-[9px] font-bold uppercase tracking-wider disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                        >
                          {revokingId === sess.id ? <Loader2 size={10} className="animate-spin" /> : null}
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB PANEL: DEVELOPER TOKENS */}
            {activeTab === "developer" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-foreground font-serif">Personal Access Tokens</h3>
                  <p className="text-[10px] text-foreground-subtle font-mono">
                    Generate personal tokens scoped to your account permission privileges for scripting and tools.
                  </p>
                </div>

                {/* Token Generator Form */}
                <form onSubmit={handleGenerateToken} className="space-y-4 border border-border/30 rounded bg-background/15 p-4 max-w-xl">
                  <span className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest block">
                    Create a Token
                  </span>

                  <div className="space-y-1.5">
                    <label
                      htmlFor={tokenNameId}
                      className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block"
                    >
                      Token Name
                    </label>
                    <input
                      id={tokenNameId}
                      type="text"
                      required
                      placeholder="e.g. CLI upload script"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      className="h-8 w-full max-w-md px-3 rounded-sm border border-input-border bg-input-bg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                    {/* Expiration */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                        Expiration
                      </span>
                      <select
                        value={newTokenExpiry}
                        onChange={(e) => setNewTokenExpiry(e.target.value)}
                        className="h-8 w-full px-2 rounded-sm border border-input-border bg-input-bg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="7">7 Days</option>
                        <option value="30">30 Days</option>
                        <option value="90">90 Days</option>
                        <option value="never">Never Expire</option>
                      </select>
                    </div>

                    {/* Scopes Multi-Select */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                        Token Scopes
                      </span>
                      <div className="space-y-1 text-xs">
                        {[
                          { id: "read_files", label: "Read Files" },
                          { id: "write_files", label: "Write Files" },
                          { id: "manage_shares", label: "Manage Shares" },
                        ].map((s) => (
                          <label key={s.id} className="flex items-center gap-1.5 cursor-pointer text-foreground-muted hover:text-foreground">
                            <input
                              type="checkbox"
                              checked={selectedScopes.includes(s.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedScopes([...selectedScopes, s.id]);
                                } else {
                                  setSelectedScopes(selectedScopes.filter((sc) => sc !== s.id));
                                }
                              }}
                              className="rounded border-border text-accent focus:ring-accent"
                            />
                            <span>{s.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!newTokenName.trim()}
                      className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-40 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={12} />
                      Generate Token
                    </button>
                  </div>
                </form>

                {/* Token Display Callout */}
                {generatedToken && (
                  <div className="p-4 border border-accent/30 bg-accent-subtle/10 rounded max-w-xl space-y-2 animate-in slide-in-from-top duration-200">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-bold text-accent uppercase tracking-widest">
                        Copy Token Key
                      </span>
                      <span className="text-[9px] font-sans text-destructive font-bold">
                        * Make sure to copy this token now. You will not be able to see it again!
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 rounded bg-background border border-border/20 font-mono text-xs text-foreground truncate select-all">
                        {generatedToken}
                      </code>
                      <button
                        onClick={() => copyToClipboard(generatedToken)}
                        className="h-8 w-8 flex items-center justify-center rounded border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Active Tokens Roster */}
                <div className="space-y-3 max-w-xl">
                  <span className="font-mono text-[9px] font-bold text-foreground-subtle uppercase tracking-widest">
                    Active Access Tokens
                  </span>

                  {tokens.length === 0 ? (
                    <p className="text-[11px] text-foreground-subtle font-mono border border-border/20 rounded p-4 text-center">
                      No active API tokens found. Generate one above.
                    </p>
                  ) : (
                    <div className="border border-border/30 rounded bg-background/10 divide-y divide-border/10 text-xs font-mono">
                      {tokens.map((tok) => (
                        <div key={tok.id} className="p-4 flex items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0">
                            <span className="font-sans font-bold text-foreground text-[13px] block truncate">{tok.name}</span>
                            <div className="flex flex-wrap gap-1 items-center font-mono text-[9px] text-foreground-subtle leading-none">
                              <span>Created: {tok.createdAt}</span>
                              <span className="text-border-strong">|</span>
                              <span>Expires: {tok.expiresAt}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {tok.scopes.map((s) => (
                                <span
                                  key={s}
                                  className="bg-accent-subtle/30 border border-accent/20 text-accent text-[8px] font-bold uppercase px-1 py-0.5 rounded leading-none font-mono"
                                >
                                  {s.replace("_", " ")}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteToken(tok.id)}
                            className="h-7 w-7 flex items-center justify-center border border-transparent hover:border-destructive/35 hover:bg-destructive/10 text-foreground-subtle hover:text-destructive rounded transition-colors cursor-pointer"
                            title="Delete token"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
