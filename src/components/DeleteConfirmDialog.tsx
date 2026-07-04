"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn, clientAuthHeaders } from "@/lib/utils";
import type { FactSheetConfig } from "@/lib/fact-sheet-config";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface DeleteConfirmDialogProps {
  entityName: string;
  entityType: string;
  config: FactSheetConfig;
  entityId: string;
  onClose: () => void;
}

export function DeleteConfirmDialog({
  entityName,
  entityType,
  config,
  entityId,
  onClose,
}: DeleteConfirmDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const canDelete = confirmText === entityName;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`${config.apiPath}/${entityId}`, {
        method: "DELETE",
        headers: { ...clientAuthHeaders() },
      });

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Failed to delete (${res.status})`);
      }

      router.push(`/${config.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setDeleting(false);
    }
  };

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-rosely-rose" />
            Delete {entityType}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-4">
              {error && (
                <Alert variant="destructive" id="delete-error">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <p className="text-sm text-rosely-dusk">
                This action cannot be undone. This will permanently delete{" "}
                <span className="font-semibold text-rosely-night">{entityName}</span> and all its
                associated relationships.
              </p>
              <div>
                <label
                  htmlFor="delete-confirm-input"
                  className="block text-xs font-medium text-rosely-dusk mb-1"
                >
                  Type <span className="font-mono font-semibold">{entityName}</span> to confirm
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "delete-error" : undefined}
                  className={cn(
                    "w-full rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night",
                    "placeholder:text-rosely-mist",
                    "focus:border-rosely-rose focus:outline-none focus:ring-2 focus:ring-rosely-rose/30",
                    "transition-colors"
                  )}
                  placeholder={entityName}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
              canDelete && !deleting
                ? "bg-rosely-rose hover:bg-rosely-rose/90"
                : "bg-rosely-rose/40 cursor-not-allowed"
            )}
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
