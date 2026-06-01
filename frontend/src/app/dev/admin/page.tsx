"use client";

import { useState, useEffect, useId, useCallback } from "react";
import {
  Shield,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Users,
  UserPlus,
  Trash2,
  Edit2,
  Search,
  LogOut,
  Lock,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAdminStore } from "@/store/useAdminStore";
import {
  adminApi,
  AdminUserEntry,
  formatTimestamp,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Admin Login View
// ─────────────────────────────────────────────────────────────────────────────

function AdminLoginView() {
  const usernameId = useId();
  const passwordId = useId();
  const { login, isLoading, error } = useAdminStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-6 selection:bg-accent selection:text-accent-foreground">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full bg-accent/8 blur-[130px]" />
        <div className="absolute top-[25%] -right-[15%] w-[45%] h-[45%] rounded-full bg-info/4 blur-[120px]" />
        <div className="absolute inset-0 scan-grid opacity-[0.01] dark:opacity-[0.02]" />
      </div>

      <div className="relative z-10 w-full max-w-[380px] space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/25 bg-accent-subtle shadow-[0_0_20px_rgba(205,127,50,0.15)]">
              <Shield size={20} className="text-accent" strokeWidth={1.5} />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground font-serif">
              Admin Console
            </h1>
            <p className="font-mono text-[8px] font-bold tracking-[0.25em] text-accent uppercase mt-1">
              Strategic Portal — User Management
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="glass-premium rounded-lg p-6 shadow-xl border border-border/20 space-y-4">
          <div className="flex items-center justify-center gap-1.5 border border-accent/15 bg-accent-subtle/30 px-3 py-1 font-mono text-[8px] font-semibold text-accent tracking-wider uppercase rounded">
            <Shield size={9} />
            Restricted Access
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive"
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor={usernameId}
                className="text-[9px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block"
              >
                Admin Username
              </label>
              <input
                id={usernameId}
                type="text"
                required
                autoFocus
                placeholder="mirza"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="h-10 w-full rounded border border-input-border bg-input-bg px-3.5 font-sans text-sm text-foreground placeholder:text-foreground-subtle/40 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor={passwordId}
                className="text-[9px] font-semibold text-foreground-subtle font-mono uppercase tracking-wider block"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-10 w-full rounded border border-input-border bg-input-bg px-3.5 pr-10 font-sans text-sm text-foreground placeholder:text-foreground-subtle/40 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                  className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-foreground-subtle hover:text-foreground-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded bg-accent text-accent-foreground font-mono text-[10px] font-semibold tracking-[0.2em] uppercase transition-all duration-300 hover:bg-accent-hover active:scale-[0.99] shadow-sm disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                "Authenticate"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-4 text-[8px] font-mono text-foreground-subtle/60 tracking-wider">
            <span className="flex items-center gap-1">
              <Lock size={9} className="text-accent/80" /> SECURE SESSION
            </span>
            <span className="h-2 w-px bg-border/20" />
            <span className="flex items-center gap-1">
              <Shield size={9} className="text-accent/80" /> ADMIN GATEWAY
            </span>
          </div>
          <p className="font-mono text-[8px] text-foreground-subtle/50 tracking-wide">
            Unggul Axiom — Strategic Portal Admin Console
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management Dashboard View
// ─────────────────────────────────────────────────────────────────────────────

function AdminDashboardView() {
  const { username, logout } = useAdminStore();

  // User list state
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUserEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserEntry | null>(null);

  // Form states
  const createEmailId = useId();
  const createPassId = useId();
  const createNameId = useId();
  const editNameId = useId();
  const editPassId = useId();

  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "staff",
  });
  const [editForm, setEditForm] = useState({
    fullName: "",
    role: "staff",
    password: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // ── Fetch users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await adminApi.listUsers();
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  // ── Create user ────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);
    try {
      await adminApi.createUser(createForm);
      setCreateForm({ email: "", password: "", fullName: "", role: "staff" });
      setIsCreateOpen(false);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Edit user ──────────────────────────────────────────────────────────────
  const openEdit = (user: AdminUserEntry) => {
    setEditTarget(user);
    setEditForm({
      fullName: user.fullName,
      role: user.role,
      password: "",
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setFormError(null);
    setFormLoading(true);
    try {
      const payload: { fullName?: string; role?: string; password?: string } = {
        fullName: editForm.fullName.trim(),
        role: editForm.role,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }
      await adminApi.updateUser(editTarget.id, payload);
      setIsEditOpen(false);
      setEditTarget(null);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Delete user ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setFormError(null);
    setFormLoading(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setFormLoading(false);
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chiefCount = users.filter((u) => u.role === "chief").length;
  const directorCount = users.filter((u) => u.role === "director").length;
  const officerCount = users.filter((u) => u.role === "officer").length;
  const staffCount = users.filter((u) => u.role === "staff").length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background text-foreground font-sans selection:bg-accent selection:text-accent-foreground">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[10%] left-[20%] w-[35%] h-[35%] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-info/5 blur-[100px]" />
        <div className="absolute inset-0 scan-grid opacity-[0.015] dark:opacity-[0.03]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/25 bg-accent-subtle shadow-[0_0_20px_rgba(205,127,50,0.15)]">
              <Shield size={18} className="text-accent" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground font-serif">
                Strategic Portal · User Management
              </h1>
              <p className="font-mono text-[9px] text-foreground-subtle">
                Admin Console — authenticated as{" "}
                <span className="text-accent font-bold">{username}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-2 h-8 px-3 rounded border border-destructive/25 text-destructive bg-destructive/5 hover:bg-destructive/15 transition-colors text-[10px] font-bold tracking-wider uppercase font-mono cursor-pointer"
            >
              <LogOut size={11} />
              Terminate
            </button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3">
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">Total</span>
            <div className="text-xl font-bold font-mono text-foreground mt-0.5">{users.length}</div>
          </div>
          <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3">
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-accent">Chief</span>
            <div className="text-xl font-bold font-mono text-accent mt-0.5">{chiefCount}</div>
          </div>
          <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3">
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-accent/80">Directors</span>
            <div className="text-xl font-bold font-mono text-accent/80 mt-0.5">{directorCount}</div>
          </div>
          <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3">
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-info">Officers</span>
            <div className="text-xl font-bold font-mono text-info mt-0.5">{officerCount}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 -mt-2">
          <div className="border border-border/30 rounded-sm bg-background-panel/35 backdrop-blur-sm p-3 flex items-center justify-between">
            <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-foreground-subtle">Staff Members</span>
            <div className="text-lg font-bold font-mono text-foreground-muted">{staffCount}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          <div className="flex items-center gap-2">
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-foreground-subtle">
                <Search size={12} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="h-8 w-56 pl-8 pr-3 rounded border border-input-border bg-input-bg text-xs text-foreground placeholder-foreground-subtle/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent-ring"
              />
            </div>
          </div>
          <button
            onClick={() => {
              setCreateForm({ email: "", password: "", fullName: "", role: "staff" });
              setFormError(null);
              setIsCreateOpen(true);
            }}
            className="btn-shimmer h-8 px-3 rounded text-[11px] font-bold tracking-wider uppercase font-mono flex items-center gap-1.5 shadow-sm transition-all"
          >
            <UserPlus size={12} />
            Create User
          </button>
        </div>

        {/* Error / Loading / Table */}
        {error && (
          <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="border border-border/40 rounded bg-background-panel/40 backdrop-blur-sm overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center space-y-3 font-mono">
              <Loader2 className="mx-auto text-accent animate-spin" size={24} />
              <p className="text-xs text-foreground-subtle uppercase tracking-widest">
                FETCHING USER DIRECTORY...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center space-y-3 font-mono">
              <Users className="mx-auto text-foreground-subtle/40" size={24} />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                No users found
              </h3>
              <p className="text-[10px] text-foreground-subtle max-w-sm mx-auto">
                {searchQuery
                  ? "No users match your search query."
                  : "Create your first user to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left font-mono text-[11px] tabular-nums">
                <thead>
                  <tr className="border-b border-border/30 bg-background-panel/80 text-[10px] font-bold tracking-wider text-foreground-subtle uppercase select-none">
                    <th className="px-4 py-2.5 w-12">#</th>
                    <th className="px-4 py-2.5">Full Name</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5 w-24 text-center">Role</th>
                    <th className="px-4 py-2.5 w-40">Created</th>
                    <th className="px-4 py-2.5 w-32 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {filteredUsers.map((user, idx) => (
                    <tr
                      key={user.id}
                      className="hover:bg-background-subtle/30 transition-colors group"
                    >
                      <td className="px-4 py-2 text-foreground-subtle select-none">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2 text-foreground font-semibold font-sans truncate max-w-[180px]">
                        {user.fullName}
                      </td>
                      <td className="px-4 py-2 text-foreground-muted select-all">
                        {user.email}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={cn(
                            "inline-block px-1.5 py-0.5 rounded-sm text-[8px] font-bold tracking-wider uppercase border",
                            user.role === "chief"
                              ? "bg-accent/15 text-accent border-accent/30"
                              : user.role === "director"
                                ? "bg-accent/10 text-accent border-accent/20"
                                : user.role === "officer"
                                  ? "bg-info/10 text-info border-info/20"
                                  : "bg-background-muted/40 text-foreground-subtle border-border/40"
                          )}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-foreground-muted">
                        {formatTimestamp(user.createdAt)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(user)}
                            className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-border hover:bg-background/40 text-foreground-subtle hover:text-foreground transition-colors cursor-pointer"
                            title="Edit user"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(user);
                              setFormError(null);
                            }}
                            className="h-7 w-7 rounded flex items-center justify-center border border-transparent hover:border-destructive/25 hover:bg-destructive/10 text-foreground-subtle hover:text-destructive transition-colors cursor-pointer"
                            title="Delete user"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer ticker */}
        <div className="w-full bg-background-panel/40 border border-border/30 px-4 py-1.5 rounded-sm flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-foreground-subtle select-none">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>ADMIN CONSOLE: ACTIVE</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <span>USERS: {users.length}</span>
            <span className="text-foreground-subtle/30">|</span>
            <span>STRATEGIC PORTAL MANAGEMENT</span>
          </div>
          <span className="flex items-center gap-1">
            <Lock size={9} className="text-accent" /> SECURE
          </span>
        </div>
      </div>

      {/* ── Create User Modal ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Create New User</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                Add a new user to the Strategic Portal directory.
              </p>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label htmlFor={createNameId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Full Name</label>
                <input
                  id={createNameId}
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor={createEmailId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Email</label>
                <input
                  id={createEmailId}
                  type="email"
                  required
                  placeholder="user@unggulaxiom.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div>
                <label htmlFor={createPassId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Password</label>
                <input
                  id={createPassId}
                  type="password"
                  required
                  placeholder="••••••••"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                  className="h-8 w-full px-2 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                >
                  <option value="staff">Staff</option>
                  <option value="officer">Officer</option>
                  <option value="director">Director</option>
                  <option value="chief">Chief</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50"
                >
                  {formLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Create User"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit User Modal ── */}
      {isEditOpen && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground font-serif">Edit User</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                Editing: <span className="text-accent font-bold">{editTarget.email}</span>
              </p>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label htmlFor={editNameId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Full Name</label>
                <input
                  id={editNameId}
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="h-8 w-full px-2 rounded-sm border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                >
                  <option value="staff">Staff</option>
                  <option value="officer">Officer</option>
                  <option value="director">Director</option>
                  <option value="chief">Chief</option>
                </select>
              </div>
              <div>
                <label htmlFor={editPassId} className="block text-[9px] font-bold font-mono uppercase text-foreground-subtle mb-1">New Password (leave blank to keep)</label>
                <input
                  id={editPassId}
                  type="password"
                  placeholder="••••••••"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                  className="h-8 w-full px-2.5 rounded-sm border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
              </div>
              <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditOpen(false); setEditTarget(null); }}
                  className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-shimmer h-8 px-4 rounded-sm font-mono text-[11px] font-bold uppercase tracking-wider text-accent-foreground disabled:opacity-50"
                >
                  {formLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-sm border border-border/80 bg-background-panel shadow-none p-5 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-destructive font-serif">Delete User</h3>
              <p className="text-[10px] text-foreground-subtle font-mono">
                This action cannot be undone. All files owned by this user will be retained but become ownerless.
              </p>
            </div>

            <div className="p-3 border border-border/20 rounded bg-background/30 font-mono text-[10px] text-foreground space-y-1">
              <div><span className="text-foreground-subtle">Name:</span> {deleteTarget.fullName}</div>
              <div><span className="text-foreground-subtle">Email:</span> {deleteTarget.email}</div>
              <div><span className="text-foreground-subtle">Role:</span> {deleteTarget.role}</div>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 text-[10px] font-bold font-mono">
              <button
                onClick={() => setDeleteTarget(null)}
                className="h-8 px-3 rounded-sm border border-transparent bg-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={formLoading}
                className="h-8 px-4 rounded-sm border border-destructive/35 bg-destructive/10 hover:bg-destructive/20 text-destructive font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Delete User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Entry Point
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { isAuthenticated, hydrate } = useAdminStore();

  useEffect(() => {
    hydrate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) {
    return <AdminLoginView />;
  }

  return <AdminDashboardView />;
}
