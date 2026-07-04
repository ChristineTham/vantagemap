"use client";

/**
 * PLANV3 Phase 4 — Document type configuration: list.
 *
 * Admin-only. Lists every configured document type (including inactive ones)
 * with its display name, machine key, field count, and active status. Provides
 * a "New type" action (dialog → POST /api/admin/document-types) and links each
 * row through to the type editor at /admin/document-types/[id].
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Boxes, Plus, Loader2, AlertCircle, Pencil } from "lucide-react";
import { useAuthSession } from "@/components/AuthSessionProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/Skeleton";

// ── Types ───────────────────────────────────────────────────────────────────

interface DocumentTypeRow {
  id: string;
  typeKey: string;
  slug: string;
  displayName: string;
  pluralName: string | null;
  icon: string | null;
  isHierarchical: boolean;
  isActive: boolean;
  fieldCount?: number;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DocumentTypesPage() {
  const { user, isPending } = useAuthSession();
  const router = useRouter();
  const [types, setTypes] = useState<DocumentTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const fetchTypes = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/document-types");
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || `Failed to load document types (${res.status})`);
        setLoading(false);
        return;
      }
      const rows: DocumentTypeRow[] = body.data || [];
      // Fetch field counts in parallel (best-effort; falls back to undefined).
      const withCounts = await Promise.all(
        rows.map(async (t) => {
          try {
            const fr = await fetch(`/api/admin/document-types/${t.id}/fields`);
            if (!fr.ok) return t;
            const fb = await fr.json().catch(() => null);
            return { ...t, fieldCount: Array.isArray(fb?.data) ? fb.data.length : undefined };
          } catch {
            return t;
          }
        })
      );
      setTypes(withCounts);
    } catch {
      setError("An unexpected error occurred while loading document types.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isPending && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTypes();
    }
  }, [isPending, user, fetchTypes]);

  if (isPending) return <ListSkeleton />;
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">Document Types</h1>
          <p className="mt-1 text-sm text-rosely-mist">
            Configure the meta-model — the fact-sheet types, their fields, and hierarchy.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4" />
          New type
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-xl border border-rosely-blush bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-rosely-blush text-left text-rosely-mist">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Fields</th>
              <th className="px-4 py-3 font-medium">Hierarchy</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-rosely-petal">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-rosely-mist">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                  <p className="mt-2">Loading document types…</p>
                </td>
              </tr>
            ) : types.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-rosely-mist">
                  <Boxes className="mx-auto size-8 text-rosely-blush" />
                  <p className="mt-2">No document types configured yet.</p>
                </td>
              </tr>
            ) : (
              types.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-rosely-petal/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/document-types/${t.id}`}
                      className="font-medium text-rosely-night hover:text-rosely-plum"
                    >
                      {t.displayName}
                    </Link>
                    {t.pluralName && (
                      <p className="text-xs text-rosely-mist">{t.pluralName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-rosely-petal px-1.5 py-0.5 text-xs text-rosely-dusk">
                      {t.typeKey}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-rosely-dusk">
                    {t.fieldCount === undefined ? "—" : t.fieldCount}
                  </td>
                  <td className="px-4 py-3">
                    {t.isHierarchical ? (
                      <Badge variant="info">Hierarchical</Badge>
                    ) : (
                      <span className="text-rosely-mist">Flat</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/document-types/${t.id}`}>
                        <Pencil className="size-4" />
                        Edit
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateTypeDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(created) => {
          setShowCreate(false);
          router.push(`/admin/document-types/${created.id}`);
        }}
      />
    </div>
  );
}

// ── Create dialog ───────────────────────────────────────────────────────────

function CreateTypeDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (row: DocumentTypeRow) => void;
}) {
  const [typeKey, setTypeKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pluralName, setPluralName] = useState("");
  const [icon, setIcon] = useState("FileText");
  const [description, setDescription] = useState("");
  const [isHierarchical, setIsHierarchical] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTypeKey("");
    setDisplayName("");
    setPluralName("");
    setIcon("FileText");
    setDescription("");
    setIsHierarchical(false);
    setError(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/document-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeKey: typeKey.trim(),
          displayName: displayName.trim(),
          pluralName: pluralName.trim() || undefined,
          icon: icon.trim() || undefined,
          description: description.trim() || undefined,
          isHierarchical,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || `Failed to create type (${res.status})`);
        setSaving(false);
        return;
      }
      reset();
      onCreated(body.data as DocumentTypeRow);
    } catch {
      setError("An unexpected error occurred while creating the type.");
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New document type</DialogTitle>
          <DialogDescription>
            Create a new fact-sheet type. Name and Description fields are added automatically.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dt-key">Machine key</Label>
            <Input
              id="dt-key"
              value={typeKey}
              onChange={(e) => setTypeKey(e.target.value)}
              required
              placeholder="capability"
              autoComplete="off"
            />
            <p className="text-xs text-rosely-mist">
              Letters, numbers, underscores. Starts with a letter. Immutable once created.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dt-name">Display name</Label>
            <Input
              id="dt-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              placeholder="Capability"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dt-plural">Plural name</Label>
            <Input
              id="dt-plural"
              value={pluralName}
              onChange={(e) => setPluralName(e.target.value)}
              placeholder="Capabilities (defaults to name + s)"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dt-icon">Icon (Lucide name)</Label>
            <Input
              id="dt-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="FileText"
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dt-desc">Description</Label>
            <Textarea
              id="dt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this type."
              rows={2}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-rosely-night">
            <input
              type="checkbox"
              checked={isHierarchical}
              onChange={(e) => setIsHierarchical(e.target.checked)}
              className="size-4 accent-rosely-plum"
            />
            Hierarchical (documents can have a parent)
          </label>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Creating…" : "Create type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────────

function ListSkeleton() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-56 rounded" />
      <Skeleton className="mt-6 h-96 w-full rounded-xl" />
    </div>
  );
}
