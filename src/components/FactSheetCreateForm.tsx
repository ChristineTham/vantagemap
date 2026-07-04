"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { cn, clientAuthHeaders } from "@/lib/utils";
import type { FactSheetConfig, FieldDefinition } from "@/lib/fact-sheet-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FactSheetCreateFormProps {
  config: FactSheetConfig;
}

export function FactSheetCreateForm({ config }: FactSheetCreateFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const data: Record<string, string> = {};
    for (const field of config.fields) {
      data[field.key] = "";
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
      // Build payload: only send non-empty fields
      const payload: Record<string, unknown> = {};
      for (const field of config.fields) {
        const value = formData[field.key];
        if (value !== "") {
          payload[field.key] = field.type === "number" ? Number(value) : value;
        }
      }

      const res = await fetch(config.apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...clientAuthHeaders() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (body?.error?.details) {
          const messages = Object.entries(body.error.details)
            .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
            .join("; ");
          throw new Error(messages);
        }
        throw new Error(body?.error?.message ?? `Failed to create (${res.status})`);
      }

      const body = await res.json();
      const newId = body.data?.id;

      if (newId) {
        router.push(`/${config.slug}/${newId}`);
      } else {
        router.push(`/${config.slug}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  // Group fields for rendering
  const fieldGroups = new Map<string, FieldDefinition[]>();
  for (const field of config.fields) {
    const group = field.group ?? "Other";
    if (!fieldGroups.has(group)) fieldGroups.set(group, []);
    fieldGroups.get(group)!.push(field);
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-rosely-mist">
        <Link
          href={`/${config.slug}`}
          className="inline-flex items-center gap-1 hover:text-rosely-night transition-colors"
        >
          <ArrowLeft className="size-4" />
          {config.pluralName}
        </Link>
        <span>/</span>
        <span className="text-rosely-night font-medium">New</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-rosely-night">Create {config.displayName}</h1>
        <p className="text-sm text-rosely-mist mt-1">
          Fill in the details below to create a new {config.displayName.toLowerCase()} fact sheet.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6"
        aria-describedby={error ? "create-form-error" : undefined}
      >
        {error && (
          <Alert variant="destructive" id="create-form-error">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {Array.from(fieldGroups.entries()).map(([group, fields]) => (
          <fieldset
            key={group}
            className="rounded-xl border border-rosely-blush bg-card p-5 flex flex-col gap-4"
          >
            <legend className="text-sm font-semibold text-rosely-night px-1">{group}</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map((field) => (
                <CreateFormField
                  key={field.key}
                  field={field}
                  value={formData[field.key] ?? ""}
                  onChange={(value) => handleChange(field.key, value)}
                />
              ))}
            </div>
          </fieldset>
        ))}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            href={`/${config.slug}`}
            className="rounded-lg border border-rosely-blush px-4 py-2 text-sm font-medium text-rosely-dusk hover:bg-rosely-petal transition-colors"
          >
            Cancel
          </Link>
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
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {saving ? "Creating…" : `Create ${config.displayName}`}
          </button>
        </div>
      </form>
    </>
  );
}

// ── Form Field Component ────────────────────────────────────────────────────

function CreateFormField({
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
  const fieldId = `create-field-${field.key}`;
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
