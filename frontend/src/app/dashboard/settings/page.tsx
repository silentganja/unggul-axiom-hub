"use client";

import { useState, useEffect, useId } from "react";
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
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { authApi, UpdateProfilePayload, webauthnApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { user, hydrate } = useAuthStore();

  const fullNameId = useId();
  const currentPassId = useId();
  const newPassId = useId();
  const confirmPassId = useId();

  // ── Form state ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "passkey">("profile");

  // Passkey state
  const [passkeyStatus, setPasskeyStatus] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  const handleRegisterPasskey = async () => {
    setPasskeyLoading(true);
    setPasskeyStatus(null);
    try {
      await webauthnApi.startRegistration();
      setPasskeyStatus("Passkey registered successfully!");
    } catch (err) {
      setPasskeyStatus(err instanceof Error ? err.message : "Registration failed. Ensure your device supports passkeys.");
    } finally {
      setPasskeyLoading(false);
    }
  };

  // ── Hydrate on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // ── Get initials for avatar ───────────────────────────────────────────────
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

  // ── Save profile ──────────────────────────────────────────────────────────
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
      // Update local auth store
      localStorage.setItem("auth-user", JSON.stringify(updated));
      await hydrate();
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
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
      setSuccess("Password changed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/20 pb-4 select-none">
        <button
          onClick={() => router.push("/dashboard")}
          className="h-7 w-7 flex items-center justify-center rounded-sm border border-border bg-background-panel hover:bg-background-subtle/50 text-foreground-subtle hover:text-foreground transition-all cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-serif">
            Portal Settings
          </h1>
          <p className="text-xs text-foreground-subtle font-mono mt-1">
            Manage your profile, credentials, and account preferences.
          </p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
        {/* Avatar & Identity Header */}
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-border/20 bg-background/30">
          <div className="h-16 w-16 rounded-full bg-accent/15 border-2 border-accent/30 text-accent font-bold font-mono text-xl flex items-center justify-center shrink-0 select-none">
            {getInitials(user.fullName)}
          </div>
          <div className="space-y-0.5 min-w-0">
            <h2 className="text-lg font-bold text-foreground font-serif truncate">
              {user.fullName}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-foreground-subtle">
              <span className="flex items-center gap-1.5">
                <Mail size={11} className="text-foreground-subtle shrink-0" />
                {user.email}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck
                  size={11}
                  className={cn(
                    "shrink-0",
                    (user.role === "chief" || user.role === "director") ? "text-accent" : user.role === "officer" ? "text-info" : "text-foreground-subtle"
                  )}
                />
                <span className="capitalize">{user.role}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={11} className="text-foreground-subtle shrink-0" />
                {formatDate(user.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback banners */}
        {(error || success) && (
          <div className="px-6 pt-4">
            {error && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-start gap-2 rounded border border-success/30 bg-success/5 px-3.5 py-2.5 text-xs text-success">
                <CheckCircle size={14} className="mt-0.5 shrink-0" />
                <span>{success}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab Nav */}
        <div className="flex border-b border-border/20 px-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase font-mono border-b-2 transition-colors -mb-[1px]",
              activeTab === "profile"
                ? "border-accent text-accent"
                : "border-transparent text-foreground-subtle hover:text-foreground"
            )}
          >
            <User size={11} className="inline mr-1.5" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={cn(
              "px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase font-mono border-b-2 transition-colors -mb-[1px]",
              activeTab === "password"
                ? "border-accent text-accent"
                : "border-transparent text-foreground-subtle hover:text-foreground"
            )}
          >
            <Lock size={11} className="inline mr-1.5" />
            Password
          </button>
          <button
            onClick={() => setActiveTab("passkey")}
            className={cn(
              "px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase font-mono border-b-2 transition-colors -mb-[1px]",
              activeTab === "passkey"
                ? "border-accent text-accent"
                : "border-transparent text-foreground-subtle hover:text-foreground"
            )}
          >
            <Fingerprint size={11} className="inline mr-1.5" />
            Passkey
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "profile" ? (
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

              {/* Read-only fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                    Email
                  </span>
                  <div className="h-9 px-3 flex items-center rounded-sm border border-border/30 bg-background/50 text-sm text-foreground-muted font-mono select-all">
                    {user.email}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                    Role
                  </span>
                  <div className="h-9 px-3 flex items-center rounded-sm border border-border/30 bg-background/50 text-sm text-foreground-muted capitalize font-mono">
                    <Shield
                      size={13}
                      className={cn(
                        "mr-1.5",
                        (user.role === "chief" || user.role === "director") ? "text-accent" : user.role === "officer" ? "text-info" : "text-foreground-subtle"
                      )}
                    />
                    {user.role}
                  </div>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <span className="text-[9px] font-bold font-mono uppercase text-foreground-subtle block">
                    Member Since
                  </span>
                  <div className="h-9 px-3 flex items-center rounded-sm border border-border/30 bg-background/50 text-sm text-foreground-muted font-mono">
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
                  {isSaving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  Save Changes
                </button>
              </div>
            </form>
          ) : activeTab === "password" ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
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
                    className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-foreground-subtle hover:text-foreground"
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
                      className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-foreground-subtle hover:text-foreground"
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
                  {isSaving ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  Change Password
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground font-serif">Passkey Authentication</h3>
                <p className="text-[10px] text-foreground-subtle font-mono leading-relaxed">
                  Register a passkey to sign in using your device&apos;s biometric sensor (fingerprint, face, or PIN).
                  Once registered, you can skip your password on the login screen.
                </p>
              </div>

              {passkeyStatus && (
                <div className={cn(
                  "flex items-start gap-2 rounded border px-3.5 py-2.5 text-xs",
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
                {passkeyLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                Register Passkey
              </button>

              <div className="pt-2 border-t border-border/10">
                <p className="text-[9px] text-foreground-subtle/70 font-mono leading-relaxed">
                  Passkeys are stored securely on your device and synced via your OS account (iCloud Keychain, Google Password Manager, etc.). Your private key never leaves your device.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
