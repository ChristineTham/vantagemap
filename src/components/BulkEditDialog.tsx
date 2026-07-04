"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckSquare, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface BulkEditDialogProps {
  selectedIds: string[];
  entityType: string;
  onClose: () => void;
  onComplete: () => void;
}

export function BulkEditDialog({
  selectedIds,
  entityType,
  onClose,
  onComplete,
}: BulkEditDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"update" | "delete">("update");
  const [lifecycle, setLifecycle] = useState("");
  const [health, setHealth] = useState("");
  const [owner, setOwner] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const lifecycleOptions = ["Plan", "Phase In", "Active", "Phase Out", "End of Life"];
  const healthOptions = ["Excellent", "Good", "Fair", "Poor", "Critical"];

  const handleBulkUpdate = async () => {
    setSaving(true);
    setError(null);

    try {
      const fields: Record<string, string> = {};
      if (lifecycle) fields.lifecycle = lifecycle;
      if (health) fields.health = health;
      if (owner) fields.owner = owner;

      if (Object.keys(fields).length === 0) {
        setError("Please select at least one field to update.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: selectedIds.map((id) => ({ id, type: entityType })),
          fields,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Bulk update failed (${res.status})`);
      }

      router.refresh();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/bulk?action=delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: selectedIds.map((id) => ({ id, type: entityType })),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Bulk delete failed (${res.status})`);
      }

      router.refresh();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="flex-row items-center gap-2 border-b border-rosely-blush px-6 py-4 space-y-0">
          <CheckSquare className="size-5 text-rosely-plum shrink-0" />
          <DialogTitle className="text-lg font-semibold text-rosely-night">
            Bulk Action ({selectedIds.length} selected)
          </DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="border-b border-rosely-blush px-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setMode("update")}
              className={cn(
                "py-2 text-sm font-medium border-b-2 transition-colors",
                mode === "update"
                  ? "border-rosely-plum text-rosely-plum"
                  : "border-transparent text-rosely-mist hover:text-rosely-night"
              )}
            >
              <Pencil className="inline size-4 mr-1" />
              Update
            </button>
            <button
              onClick={() => setMode("delete")}
              className={cn(
                "py-2 text-sm font-medium border-b-2 transition-colors",
                mode === "delete"
                  ? "border-rosely-rose text-rosely-rose"
                  : "border-transparent text-rosely-mist hover:text-rosely-night"
              )}
            >
              <Trash2 className="inline size-4 mr-1" />
              Delete
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === "update" && (
            <>
              <p className="text-sm text-rosely-dusk">
                Update fields for {selectedIds.length} selected items. Only fields with a value will
                be changed.
              </p>

              <div className="flex flex-col gap-3">
                <div>
                  <label
                    htmlFor="bulk-lifecycle"
                    className="block text-xs font-medium text-rosely-dusk mb-1"
                  >
                    Lifecycle Phase
                  </label>
                  <select
                    id="bulk-lifecycle"
                    value={lifecycle}
                    onChange={(e) => setLifecycle(e.target.value)}
                    className="w-full rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30"
                  >
                    <option value="">— No change —</option>
                    {lifecycleOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="bulk-health"
                    className="block text-xs font-medium text-rosely-dusk mb-1"
                  >
                    Health Status
                  </label>
                  <select
                    id="bulk-health"
                    value={health}
                    onChange={(e) => setHealth(e.target.value)}
                    className="w-full rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30"
                  >
                    <option value="">— No change —</option>
                    {healthOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="bulk-owner"
                    className="block text-xs font-medium text-rosely-dusk mb-1"
                  >
                    Owner
                  </label>
                  <input
                    id="bulk-owner"
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="Leave empty for no change"
                    className="w-full rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night placeholder:text-rosely-mist focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30"
                  />
                </div>
              </div>
            </>
          )}

          {mode === "delete" && (
            <>
              <p className="text-sm text-rosely-dusk">
                This will permanently delete{" "}
                <span className="font-semibold text-rosely-night">{selectedIds.length}</span> items
                and their relationships. This cannot be undone.
              </p>
              <label className="flex items-center gap-2 text-sm text-rosely-dusk">
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                  className="rounded border-rosely-blush text-rosely-plum focus:ring-rosely-lilac"
                />
                I confirm I want to delete these items
              </label>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-rosely-blush px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-rosely-blush px-4 py-2 text-sm font-medium text-rosely-dusk hover:bg-rosely-petal transition-colors"
          >
            Cancel
          </button>
          {mode === "update" && (
            <button
              onClick={handleBulkUpdate}
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                saving
                  ? "bg-rosely-plum/60 cursor-not-allowed"
                  : "bg-rosely-plum hover:bg-rosely-plum/90"
              )}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Updating…" : "Update Selected"}
            </button>
          )}
          {mode === "delete" && (
            <button
              onClick={handleBulkDelete}
              disabled={!confirmDelete || saving}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                confirmDelete && !saving
                  ? "bg-rosely-rose hover:bg-rosely-rose/90"
                  : "bg-rosely-rose/40 cursor-not-allowed"
              )}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {saving ? "Deleting…" : "Delete Selected"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
