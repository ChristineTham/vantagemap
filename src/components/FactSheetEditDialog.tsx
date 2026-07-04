"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2 } from "lucide-react";
import { cn, clientAuthHeaders } from "@/lib/utils";
import type { FactSheetConfig, FieldDefinition } from "@/lib/fact-sheet-config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FactSheetEditDialogProps {
  entity: Record<string, unknown>;
  config: FactSheetConfig;
  entityId: string;
  onClose: () => void;
}

export function FactSheetEditDialog({
  entity,
  config,
  entityId,
  onClose,
}: FactSheetEditDialogProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const data: Record<string, string> = {};
    for (const field of config.fields) {
      const value = entity[field.key];
      data[field.key] = value != null ? String(value) : "";
    }
    return data;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {};
      for (const field of config.fields) {
        const newVal = formData[field.key] || null;
        const oldVal = entity[field.key] ?? null;
        if (newVal !== oldVal && !(newVal === null && oldVal === null)) {
          payload[field.key] = newVal === "" ? null : newVal;
        }
      }

      if (Object.keys(payload).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`${config.apiPath}/${entityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...clientAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Failed to update (${res.status})`);
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const fieldGroups = new Map<string, FieldDefinition[]>();
  for (const field of config.fields) {
    const group = field.group ?? "Other";
    if (!fieldGroups.has(group)) fieldGroups.set(group, []);
    fieldGroups.get(group)!.push(field);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-rosely-blush bg-card px-6 py-4 rounded-t-xl">
          <DialogTitle className="text-lg font-semibold text-rosely-night">
            Edit {config.displayName}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="p-6 flex flex-col gap-6"
          aria-describedby={error ? "edit-form-error" : undefined}
        >
          {error && (
            <Alert variant="destructive" id="edit-form-error">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {Array.from(fieldGroups.entries()).map(([group, fields]) => (
            <fieldset key={group} className="flex flex-col gap-4">
              <legend className="text-sm font-semibold text-rosely-night">{group}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <FormField
                    key={field.key}
                    field={field}
                    value={formData[field.key] ?? ""}
                    onChange={(value) => handleChange(field.key, value)}
                  />
                ))}
              </div>
            </fieldset>
          ))}

          <DialogFooter className="pt-4 border-t border-rosely-blush">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-rosely-blush px-4 py-2 text-sm font-medium text-rosely-dusk hover:bg-rosely-petal transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors",
                saving
                  ? "bg-rosely-plum/60 cursor-not-allowed"
                  : "bg-rosely-plum hover:bg-rosely-plum/90"
              )}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Form Field Component ──────────────────────────────────────────────────────────────────────────

function FormField({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const baseInputClass = cn(
    "w-full rounded-lg border border-rosely-blush bg-card px-3 py-2 text-sm text-rosely-night",
    "placeholder:text-rosely-mist",
    "focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30",
    "transition-colors"
  );

  const isFullWidth = field.type === "textarea" || field.type === "url";
  const fieldId = `edit-field-${field.key}`;
  const helpId = field.helpText ? `${fieldId}-help` : undefined;

  return (
    <div className={cn(isFullWidth && "sm:col-span-2")}>
      <label htmlFor={fieldId} className="block text-xs font-medium text-rosely-dusk mb-1">
        {field.label}
        {field.required && (
          <span className="text-rosely-rose ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {field.type === "select" ? (
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseInputClass}
          required={field.required}
          aria-required={field.required || undefined}
          aria-describedby={helpId}
        >
          <option value="">— Select —</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={baseInputClass}
          required={field.required}
          aria-required={field.required || undefined}
          aria-describedby={helpId}
        />
      ) : (
        <input
          id={fieldId}
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : field.type === "url"
                  ? "url"
                  : "text"
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseInputClass}
          required={field.required}
          aria-required={field.required || undefined}
          aria-describedby={helpId}
        />
      )}

      {field.helpText && (
        <p id={helpId} className="mt-1 text-xs text-rosely-mist">
          {field.helpText}
        </p>
      )}
    </div>
  );
}
