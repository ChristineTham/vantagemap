"use client";

/**
 * PLANV3 Phase 4/14 — Reusable config-change impact confirmation dialog.
 *
 * Given a proposed meta-model `change` and its parameters, this dialog:
 *   1. Calls POST /api/admin/config/impact to compute the impact.
 *   2. Renders the returned message, warnings, and data-handling options
 *      (defaulting to the option flagged `isDefault`).
 *   3. Requires a type-to-confirm entry when the impact `requiresTypeConfirm`.
 *   4. On confirm, calls POST /api/admin/config/apply with the chosen
 *      `dataHandling` plus the original change parameters, then reports success.
 *
 * It is fully self-contained: pass the change descriptor and confirmation
 * word, receive an `onApplied` callback when the apply succeeds.
 */

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ImpactOption {
  key: string;
  label: string;
  destructive: boolean;
  isDefault: boolean;
}

export interface ImpactResult {
  change: string;
  severity: "safe" | "warning" | "destructive";
  message: string;
  options: ImpactOption[];
  warnings: string[];
  requiresTypeConfirm: boolean;
}

/** The change descriptor forwarded to both /impact and /apply. */
export interface ConfigChangeRequest {
  change: string;
  typeKey?: string;
  fieldKey?: string;
  newLabel?: string;
  newTypeKey?: string;
  newFieldKey?: string;
  rule?: {
    sourceTypeKey: string;
    targetTypeKey: string;
    relationshipType: string;
  };
}

export interface ConfigImpactDialogProps {
  /** The change to analyse, or null to keep the dialog closed. */
  request: ConfigChangeRequest | null;
  /** Human title for the confirmation dialog. */
  title: string;
  /**
   * The word the user must type verbatim to confirm a `requiresTypeConfirm`
   * change (usually the typeKey or fieldKey being destroyed).
   */
  confirmWord?: string;
  /** Called after a successful apply. */
  onApplied: () => void;
  /** Called when the dialog is dismissed without applying. */
  onCancel: () => void;
}

const severityVariant: Record<ImpactResult["severity"], "success" | "warning" | "destructive"> = {
  safe: "success",
  warning: "warning",
  destructive: "destructive",
};

// ── Component ───────────────────────────────────────────────────────────────

export function ConfigImpactDialog({
  request,
  title,
  confirmWord,
  onApplied,
  onCancel,
}: ConfigImpactDialogProps) {
  const [impact, setImpact] = useState<ImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [typedConfirm, setTypedConfirm] = useState("");

  const open = request !== null;

  const loadImpact = useCallback(async (req: ConfigChangeRequest) => {
    setLoading(true);
    setError(null);
    setImpact(null);
    setTypedConfirm("");
    try {
      const res = await fetch("/api/admin/config/impact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || `Failed to analyse impact (${res.status})`);
        return;
      }
      const result = body.data as ImpactResult;
      setImpact(result);
      const preferred =
        result.options.find((o) => o.isDefault) ?? result.options[0] ?? null;
      setSelectedOption(preferred ? preferred.key : "");
    } catch {
      setError("An unexpected error occurred while analysing the impact.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (request) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadImpact(request);
    }
  }, [request, loadImpact]);

  const handleApply = useCallback(async () => {
    if (!request || !impact) return;
    setApplying(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        ...request,
        dataHandling: selectedOption || "retain",
      };
      const res = await fetch("/api/admin/config/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error?.message || `Failed to apply change (${res.status})`);
        setApplying(false);
        return;
      }
      onApplied();
    } catch {
      setError("An unexpected error occurred while applying the change.");
      setApplying(false);
    }
  }, [request, impact, selectedOption, onApplied]);

  const needsTypeConfirm = impact?.requiresTypeConfirm === true && !!confirmWord;
  const typeConfirmOk = !needsTypeConfirm || typedConfirm === confirmWord;
  const canApply = !!impact && !applying && !loading && typeConfirmOk;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !applying) onCancel();
      }}
    >
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {title}
            {impact && (
              <Badge variant={severityVariant[impact.severity]} className="capitalize">
                {impact.severity}
              </Badge>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-3">
              {loading && (
                <span className="flex items-center gap-2 text-rosely-mist">
                  <Loader2 className="size-4 animate-spin" />
                  Analysing impact…
                </span>
              )}
              {impact && <span className="text-rosely-dusk">{impact.message}</span>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {impact && (
          <div className="flex flex-col gap-4">
            {impact.warnings.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-lg border border-rosely-golden/40 bg-rosely-golden/10 p-3 text-sm text-rosely-night">
                {impact.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rosely-golden" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}

            {impact.options.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium text-rosely-night">
                  How should existing data be handled?
                </legend>
                {impact.options.map((opt) => (
                  <label
                    key={opt.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      selectedOption === opt.key
                        ? "border-rosely-lilac bg-rosely-lilac/10"
                        : "border-rosely-blush hover:bg-rosely-petal/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="config-data-handling"
                      value={opt.key}
                      checked={selectedOption === opt.key}
                      onChange={() => setSelectedOption(opt.key)}
                      className="mt-0.5 size-4 accent-rosely-plum"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-medium text-rosely-night">{opt.label}</span>
                      {opt.destructive && (
                        <span className="text-xs text-rosely-rose">Destructive — data is deleted.</span>
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>
            )}

            {needsTypeConfirm && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="config-type-confirm">
                  Type{" "}
                  <span className="font-mono font-semibold text-rosely-night">{confirmWord}</span>{" "}
                  to confirm
                </Label>
                <Input
                  id="config-type-confirm"
                  value={typedConfirm}
                  onChange={(e) => setTypedConfirm(e.target.value)}
                  placeholder={confirmWord}
                  autoComplete="off"
                  aria-invalid={typedConfirm.length > 0 && !typeConfirmOk ? true : undefined}
                />
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={applying}>
            Cancel
          </Button>
          <Button
            variant={impact?.severity === "destructive" ? "destructive" : "default"}
            onClick={handleApply}
            disabled={!canApply}
          >
            {applying && <Loader2 className="size-4 animate-spin" />}
            {applying ? "Applying…" : "Confirm & apply"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
