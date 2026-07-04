"use client";

/**
 * Phase 10.5 — Role Assignment and Permissions UI
 *
 * Admin page displaying:
 *   1. Effective permissions matrix (role → operation grid)
 *   2. Current role assignments for all workspace members
 *   3. Ability to change roles inline
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shield, Check, X, Info } from "lucide-react";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Skeleton } from "@/components/Skeleton";

// ── Types ───────────────────────────────────────────────────────────────────

interface UserRole {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ── Permission Matrix (mirrors src/lib/rbac.ts) ─────────────────────────────

const OPERATIONS = [
  { key: "view", label: "View Inventory", description: "View all fact sheets and details" },
  { key: "create", label: "Create Fact Sheets", description: "Create new entities" },
  { key: "edit", label: "Edit Fact Sheets", description: "Modify existing entities" },
  { key: "delete", label: "Delete Fact Sheets", description: "Remove entities permanently" },
  { key: "manage_users", label: "Manage Users", description: "Invite, archive, and assign roles" },
  {
    key: "manage_workspace",
    label: "Manage Workspace",
    description: "Configure workspace settings",
  },
  { key: "view_audit", label: "View Audit Logs", description: "Access audit trail" },
] as const;

const ROLES = ["Viewer", "Member", "Admin"] as const;

const PERMISSION_MATRIX: Record<string, string[]> = {
  view: ["Viewer", "Member", "Admin"],
  create: ["Member", "Admin"],
  edit: ["Member", "Admin"],
  delete: ["Admin"],
  manage_users: ["Admin"],
  manage_workspace: ["Admin"],
  view_audit: ["Admin"],
};

// ── Page Component ──────────────────────────────────────────────────────────

export default function RolesPage() {
  const { user, isPending } = useAuthSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users?pageSize=100");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUsers();
    }
  }, [isPending, user, fetchUsers]);

  if (isPending) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48 rounded" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-rosely-night">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-rosely-mist">
          View the permission matrix and manage role assignments
        </p>
      </div>

      {/* Permission Matrix */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-rosely-night">Permission Matrix</h2>
        <div className="overflow-x-auto rounded-xl border border-rosely-blush bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rosely-blush">
                <th className="px-4 py-3 text-left font-medium text-rosely-mist">Operation</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-4 py-3 text-center font-medium text-rosely-mist">
                    {role}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rosely-petal">
              {OPERATIONS.map((op) => (
                <tr key={op.key} className="hover:bg-rosely-petal/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-rosely-night">{op.label}</span>
                      <span className="group relative">
                        <Info className="h-3.5 w-3.5 text-rosely-mist" />
                        <span className="absolute bottom-full left-0 mb-1 hidden rounded bg-rosely-night px-2 py-1 text-xs text-white group-hover:block whitespace-nowrap">
                          {op.description}
                        </span>
                      </span>
                    </div>
                  </td>
                  {ROLES.map((role) => (
                    <td key={role} className="px-4 py-3 text-center">
                      {PERMISSION_MATRIX[op.key]?.includes(role) ? (
                        <Check className="mx-auto size-4 text-rosely-teal" />
                      ) : (
                        <X className="mx-auto size-4 text-rosely-rose/50" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Assignments */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-rosely-night">Current Assignments</h2>
        <div className="rounded-xl border border-rosely-blush bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rosely-blush text-left text-rosely-mist">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rosely-petal">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-rosely-mist">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-rosely-mist">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((u) => <RoleAssignmentRow key={u.id} user={u} onChanged={fetchUsers} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Role Assignment Row ─────────────────────────────────────────────────────

function RoleAssignmentRow({ user: u, onChanged }: { user: UserRole; onChanged: () => void }) {
  const [changing, setChanging] = useState(false);

  async function handleRoleChange(newRole: string) {
    if (newRole === u.role) return;
    setChanging(true);
    try {
      await fetch(`/api/admin/users/${u.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      onChanged();
    } catch {
      // silently fail
    } finally {
      setChanging(false);
    }
  }

  return (
    <tr className="hover:bg-rosely-petal/40 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-rosely-night">{u.name}</p>
          <p className="text-xs text-rosely-mist">{u.email}</p>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1 text-sm">
          <Shield className="h-3.5 w-3.5 text-rosely-plum" />
          {u.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <select
          value={u.role}
          onChange={(e) => handleRoleChange(e.target.value)}
          disabled={changing}
          aria-label={`Change role for ${u.name}`}
          className="rounded-lg border border-rosely-blush px-3 py-1.5 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac disabled:opacity-50"
        >
          <option value="Viewer">Viewer</option>
          <option value="Member">Member</option>
          <option value="Admin">Admin</option>
        </select>
      </td>
    </tr>
  );
}
