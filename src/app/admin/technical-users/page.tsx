"use client";

/**
 * Phase 10.4 — Technical User / API Token Management
 *
 * Admin page for creating technical users, generating API tokens,
 * setting token expiry, and revoking tokens.
 * Tokens are shown ONCE at creation time.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, Clock, AlertCircle } from "lucide-react";
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
import { Skeleton } from "@/components/Skeleton";

// ── Types ───────────────────────────────────────────────────────────────────

interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

// ── Page Component ──────────────────────────────────────────────────────────

export default function TechnicalUsersPage() {
  const { user, isPending } = useAuthSession();
  const router = useRouter();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tokens");
      if (res.ok) {
        const data = await res.json();
        setTokens(data.data || []);
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
      fetchTokens();
    }
  }, [isPending, user, fetchTokens]);

  if (isPending) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48 rounded" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">API Tokens</h1>
          <p className="mt-1 text-sm text-rosely-mist">
            Manage API tokens for technical integrations and automation
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rosely-mauve"
        >
          <Plus className="size-4" />
          Create Token
        </button>
      </div>

      {/* Show newly created token warning */}
      {newToken && <NewTokenBanner token={newToken} onDismiss={() => setNewToken(null)} />}

      {/* Action error */}
      {actionError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="size-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Token List */}
      <div className="rounded-xl border border-rosely-blush bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rosely-blush text-left text-rosely-mist">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Token Prefix</th>
              <th className="px-4 py-3 font-medium">Expires</th>
              <th className="px-4 py-3 font-medium">Last Used</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rosely-petal">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-rosely-mist">
                  Loading tokens...
                </td>
              </tr>
            ) : tokens.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-rosely-mist">
                  <Key className="mx-auto size-8 text-rosely-blush" />
                  <p className="mt-2">No API tokens created yet</p>
                  <p className="text-xs">
                    Create a token for CI/CD pipelines or external integrations
                  </p>
                </td>
              </tr>
            ) : (
              tokens.map((token) => (
                <TokenRow
                  key={token.id}
                  token={token}
                  onRevoke={() => {
                    setActionError(null);
                    fetchTokens();
                  }}
                  onError={setActionError}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <CreateTokenModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(token) => {
          setNewToken(token);
          fetchTokens();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}

// ── New Token Banner ────────────────────────────────────────────────────────

function NewTokenBanner({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-6 rounded-xl border border-rosely-golden/50 bg-rosely-golden/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="size-5 shrink-0 text-rosely-night" />
        <div className="flex-1">
          <p className="text-sm font-medium text-rosely-night">
            Copy your token now — it won&apos;t be shown again
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-card px-3 py-2 font-mono text-xs text-rosely-night border border-rosely-blush break-all">
              {token}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-rosely-blush p-2 hover:bg-card transition-colors"
              aria-label="Copy token"
            >
              {copied ? (
                <Check className="size-4 text-rosely-teal" />
              ) : (
                <Copy className="size-4 text-rosely-dusk" />
              )}
            </button>
          </div>
          <button
            onClick={onDismiss}
            className="mt-2 text-xs text-rosely-dusk hover:text-rosely-night"
          >
            I&apos;ve copied it — dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Token Row ───────────────────────────────────────────────────────────────

function TokenRow({
  token,
  onRevoke,
  onError,
}: {
  token: ApiToken;
  onRevoke: () => void;
  onError: (message: string) => void;
}) {
  const [revoking, setRevoking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();

  async function handleRevoke() {
    setRevoking(true);
    try {
      const res = await fetch(`/api/admin/tokens/${token.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null);
        onError(data?.error?.message || `Failed to revoke token (${res.status})`);
        return;
      }
      onRevoke();
    } catch {
      onError("An unexpected error occurred while revoking the token.");
    } finally {
      setRevoking(false);
      setConfirmOpen(false);
    }
  }

  return (
    <tr className="hover:bg-rosely-petal/40 transition-colors">
      <td className="px-4 py-3 font-medium text-rosely-night">{token.name}</td>
      <td className="px-4 py-3">
        <code className="rounded bg-rosely-cream px-2 py-0.5 font-mono text-xs text-rosely-dusk">
          {token.prefix}...
        </code>
      </td>
      <td className="px-4 py-3">
        {token.expiresAt ? (
          <span
            className={`flex items-center gap-1 text-xs ${isExpired ? "text-rosely-rose" : "text-rosely-dusk"}`}
          >
            <Clock className="size-3" />
            {isExpired ? "Expired" : new Date(token.expiresAt).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-rosely-mist">Never</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-rosely-dusk">
        {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : "Never"}
      </td>
      <td className="px-4 py-3 text-xs text-rosely-dusk">
        {new Date(token.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={revoking}
          className="rounded-lg p-1.5 text-rosely-rose hover:bg-rosely-rose/10 transition-colors disabled:opacity-50"
          aria-label={`Revoke token ${token.name}`}
        >
          <Trash2 className="size-4" />
        </button>

        <AlertDialog
          open={confirmOpen}
          onOpenChange={(o) => {
            if (!o) setConfirmOpen(false);
          }}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke token</AlertDialogTitle>
              <AlertDialogDescription>
                Revoke token{" "}
                <span className="font-semibold text-rosely-night">{token.name}</span>? Any
                integration using it will immediately stop working. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleRevoke();
                }}
                disabled={revoking}
              >
                {revoking ? "Revoking..." : "Revoke Token"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
}

// ── Create Token Modal ──────────────────────────────────────────────────────

function CreateTokenModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (token: string) => void;
}) {
  const [name, setName] = useState("");
  const [expiryDays, setExpiryDays] = useState("90");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const body: { name: string; expiresInDays?: number } = { name };
      if (expiryDays !== "never") {
        body.expiresInDays = parseInt(expiryDays);
      }

      const res = await fetch("/api/admin/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Failed to create token");
        setCreating(false);
        return;
      }

      const data = await res.json();
      onCreated(data.data.token);
    } catch {
      setError("An unexpected error occurred");
      setCreating(false);
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
          <DialogTitle>Create API Token</DialogTitle>
          <DialogDescription>Generate a new token for technical integrations</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" id="token-error">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-4"
          aria-describedby={error ? "token-error" : undefined}
        >
          <div>
            <Label htmlFor="token-name">Token Name</Label>
            <Input
              id="token-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-required
              aria-invalid={error ? true : undefined}
              placeholder="e.g. CI/CD Pipeline, Import Script"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="token-expiry">Expiration</Label>
            <select
              id="token-expiry"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rosely-blush px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-1 focus:ring-rosely-lilac"
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
              <option value="never">Never expires</option>
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
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-rosely-plum px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rosely-mauve disabled:opacity-50"
            >
              <Key className="size-4" />
              {creating ? "Creating..." : "Create Token"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
