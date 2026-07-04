"use client";

/**
 * PLANV2 — Dynamic document create form.
 *
 * Renders one input per enabled field from a type's field configuration,
 * driven by each field's dataType. Validates required fields client-side,
 * POSTs to /api/documents/[slug], surfaces API validation errors from the
 * standard { error: { message, details } } envelope, and routes to the newly
 * created document on success.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DocumentFieldInput,
  initialFieldValue,
  isEmptyValue,
  serializeFieldValue,
  type FieldValue,
  type FormFieldConfig,
} from "./document-fields";

export type { FormFieldConfig } from "./document-fields";

interface DocumentCreateFormProps {
  slug: string;
  displayName: string;
  fields: FormFieldConfig[];
}

export function DocumentCreateForm({ slug, displayName, fields }: DocumentCreateFormProps) {
  const router = useRouter();
  const editable = fields.filter((f) => f.enabled && f.fieldKey !== "id");

  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(editable.map((f) => [f.fieldKey, initialFieldValue(f)]))
  );
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    setSubmitting(true);

    try {
      const res = await fetch(`/api/documents/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message: string =
          body?.error?.message ?? `Failed to create ${displayName.toLowerCase()}.`;
        const details = body?.error?.details as Record<string, string[]> | undefined;
        if (details) setErrors(details);
        setFormError(message);
        setSubmitting(false);
        return;
      }

      const body = await res.json();
      const id = body?.data?.id as string | undefined;
      router.push(id ? `/documents/${slug}/${id}` : `/documents/${slug}`);
      router.refresh();
    } catch {
      setFormError("Network error — please try again.");
      setSubmitting(false);
    }
  }

  return (
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
            field={field}
            value={values[field.fieldKey]}
            errors={errors[field.fieldKey]}
            onChange={(v) => setValue(field.fieldKey, v)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Create {displayName}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
