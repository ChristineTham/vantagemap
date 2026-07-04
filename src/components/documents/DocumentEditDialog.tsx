"use client";

/**
 * PLANV2 — Edit a document in a dialog.
 *
 * Pre-fills a form from the current document values, PATCHes changed values to
 * /api/documents/[slug]/[id], surfaces API validation errors, and refreshes the
 * page on success.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DocumentFieldInput,
  isEmptyValue,
  serializeFieldValue,
  toFieldValue,
  type FieldValue,
  type FormFieldConfig,
} from "./document-fields";

interface DocumentEditDialogProps {
  slug: string;
  id: string;
  displayName: string;
  fields: FormFieldConfig[];
  document: Record<string, unknown>;
}

export function DocumentEditDialog({
  slug,
  id,
  displayName,
  fields,
  document,
}: DocumentEditDialogProps) {
  const router = useRouter();
  const editable = fields.filter((f) => f.enabled && f.fieldKey !== "id");

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(editable.map((f) => [f.fieldKey, toFieldValue(f, document[f.fieldKey])]))
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setValue(key: string, value: FieldValue) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): Record<string, string[]> {
    const next: Record<string, string[]> = {};
    for (const field of editable) {
      if (field.required && isEmptyValue(values[field.fieldKey])) {
        next[field.fieldKey] = ["This field is required."];
      }
    }
    return next;
  }

  function buildPayload(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const field of editable) {
      const serialized = serializeFieldValue(field, values[field.fieldKey]);
      // For PATCH, always send required fields; send optionals whenever present.
      if (serialized !== undefined) payload[field.fieldKey] = serialized;
    }
    return payload;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setFormError("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const res = await fetch(`/api/documents/${slug}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message: string =
          body?.error?.message ?? `Failed to update ${displayName.toLowerCase()}.`;
        const details = body?.error?.details as Record<string, string[]> | undefined;
        if (details) setErrors(details);
        setFormError(message);
        setSaving(false);
        return;
      }

      setOpen(false);
      setSaving(false);
      router.refresh();
    } catch {
      setFormError("Network error — please try again.");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" aria-hidden />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {displayName}</DialogTitle>
          <DialogDescription>Update fields and save your changes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-rosely-blush bg-rosely-petal/30 px-4 py-3 text-sm text-rosely-night"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {editable.map((field) => (
              <DocumentFieldInput
                key={field.fieldKey}
                idPrefix="edit"
                field={field}
                value={values[field.fieldKey]}
                errors={errors[field.fieldKey]}
                onChange={(v) => setValue(field.fieldKey, v)}
              />
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
