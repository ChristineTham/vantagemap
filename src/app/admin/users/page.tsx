"use client";

/**
 * Phase 10.3 — User Administration Page
 *
 * Admin-only page for listing users, inviting by email,
 * changing roles, and archiving users.
 * User status lifecycle: Active → Archived (and reverse).
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Shield,
  Archive,
  RotateCcw,
  Mail,
  AlertCircle,
} from "lucide-react";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/Skeleton";

// ── Types ───────────────────────────────────────────────────────────────────

interface UserRecord {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  createdAt: string;
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user, isPending } = useAuthSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Pending confirmations (archive a user, or promote to Admin)
  const [pendingArchive, setPendingArchive] = useState<UserRecord | null>(null);
  const [pendingPromote, setPendingPromote] = useState<UserRecord | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search[name]", searchQuery);
      if (statusFilter !== "all") params.set("filter[status]", statusFilter);
      params.set("pageSize", "50");

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch {
      // silently fail — UI shows empty state
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (!isPending && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers();
    }
  }, [isPending, user, fetchUsers]);

  const handleChangeRole = useCallback(
    async (userId: string, role: string) => {
      setActionError(null);
      const err = await changeRole(userId, role);
      if (err) {
        setActionError(err);
      } else {
        fetchUsers();
      }
    },
    [fetchUsers]
  );

  const handleToggleArchive = useCallback(
    async (userId: string, currentStatus: string) => {
      setActionError(null);
      const err = await toggleArchive(userId, currentStatus);
      if (err) {
        setActionError(err);
      } else {
        fetchUsers();
      }
    },
    [fetchUsers]
  );

  if (isPending) {
    return <AdminLoadingSkeleton />;
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">User Management</h1>
          <p className="mt-1 text-sm text-rosely-mist">
            Manage workspace users, invite new members, and assign roles
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rosely-mauve"
        >
          <UserPlus className="size-4" />
          Invite User
        </button>
      </div>

      {/* Action error */}
      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-rosely-mist" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            aria-label="Search users by name or email"
            className="w-full rounded-lg border border-rosely-blush py-2 pl-10 pr-3 text-sm text-rosely-night placeholder:text-rosely-mist focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="rounded-lg border border-rosely-blush px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Invited">Invited</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* User Table */}
      <div className="rounded-xl border border-rosely-blush bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rosely-blush text-left text-rosely-mist">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rosely-petal">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-rosely-mist">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-rosely-mist">
                  <Users className="mx-auto size-8 text-rosely-blush" />
                  <p className="mt-2">No users found</p>
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-rosely-petal/40 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-rosely-night">{u.name}</p>
                      <p className="text-xs text-rosely-mist">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <UserStatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3 text-rosely-dusk">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="rounded-lg p-1 text-rosely-mist hover:bg-rosely-petal hover:text-rosely-night"
                          aria-label={`Actions for ${u.name}`}
                        >
                          <MoreVertical className="size-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleChangeRole(u.id, "Viewer")}>
                          <Shield className="size-4" />
                          Set as Viewer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleChangeRole(u.id, "Member")}>
                          <Shield className="size-4" />
                          Set as Member
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPendingPromote(u)}>
                          <Shield className="size-4" />
                          Set as Admin
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            u.status === "Archived"
                              ? handleToggleArchive(u.id, u.status)
                              : setPendingArchive(u)
                          }
                          className="text-rosely-rose"
                        >
                          {u.status === "Archived" ? (
                            <>
                              <RotateCcw className="size-4" />
                              Restore User
                            </>
                          ) : (
                            <>
                              <Archive className="size-4" />
                              Archive User
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      <InviteUserModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvited={fetchUsers}
      />

      {/* Confirm archive */}
      <AlertDialog
        open={pendingArchive !== null}
        onOpenChange={(open) => {
          if (!open) setPendingArchive(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive user</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive{" "}
              <span className="font-semibold text-rosely-night">{pendingArchive?.name}</span>? They
              will lose access until restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingArchive) {
                  handleToggleArchive(pendingArchive.id, pendingArchive.status);
                }
                setPendingArchive(null);
              }}
            >
              Archive User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm promote to Admin */}
      <AlertDialog
        open={pendingPromote !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPromote(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Promote to Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to make{" "}
              <span className="font-semibold text-rosely-night">{pendingPromote?.name}</span> an
              Admin? Admins can manage all users, roles, and workspace settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingPromote) {
                  handleChangeRole(pendingPromote.id, "Admin");
                }
                setPendingPromote(null);
              }}
            >
              Set as Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── User Status Badge ───────────────────────────────────────────────────────

function UserStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: "bg-rosely-teal/20 text-rosely-teal",
    Invited: "bg-rosely-periwinkle/20 text-rosely-periwinkle",
    Requested: "bg-rosely-golden/20 text-rosely-night",
    Archived: "bg-rosely-mist/20 text-rosely-mist",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] || "bg-rosely-petal text-rosely-dusk"}`}
    >
      {status}
    </span>
  );
}

// ── Role Badge ──────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    Admin: "bg-rosely-plum/20 text-rosely-plum",
    Member: "bg-rosely-lilac/20 text-rosely-mauve",
    Viewer: "bg-rosely-petal text-rosely-dusk",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[role] || "bg-rosely-petal text-rosely-dusk"}`}
    >
      {role}
    </span>
  );
}

// ── Action helpers ─────────────────────────────────────────────────────────

/** Returns an error message string on failure, or null on success. */
async function changeRole(userId: string, role: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return data?.error?.message || `Failed to change role (${res.status})`;
    }
    return null;
  } catch {
    return "An unexpected error occurred while changing the role.";
  }
}

/** Returns an error message string on failure, or null on success. */
async function toggleArchive(userId: string, currentStatus: string): Promise<string | null> {
  const newStatus = currentStatus === "Archived" ? "Active" : "Archived";
  try {
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      return data?.error?.message || `Failed to update status (${res.status})`;
    }
    return null;
  } catch {
    return "An unexpected error occurred while updating the user status.";
  }
}

// ── Invite Modal ────────────────────────────────────────────────────────────

function InviteUserModal({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Failed to send invitation");
        setSending(false);
        return;
      }

      onInvited();
      onClose();
    } catch {
      setError("An unexpected error occurred");
      setSending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new workspace member
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" id="invite-error">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-4"
          aria-describedby={error ? "invite-error" : undefined}
        >
          <div>
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required
              aria-invalid={error ? true : undefined}
              placeholder="colleague@company.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rosely-blush px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
            >
              <option value="Viewer">Viewer</option>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-rosely-blush px-4 py-2 text-sm font-medium text-rosely-dusk hover:bg-rosely-petal transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rosely-mauve disabled:opacity-50"
            >
              <Mail className="size-4" />
              {sending ? "Sending..." : "Send Invite"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Loading Skeleton ────────────────────────────────────────────────────────

function AdminLoadingSkeleton() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-48 rounded" />
      <Skeleton className="mt-6 h-96 w-full rounded-xl" />
    </div>
  );
}
