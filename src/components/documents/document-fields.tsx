"use client";

/**
 * PLANV3 — Shared building blocks for dynamic document forms.
 *
 * A single field-input renderer (one control per dataType) plus value helpers,
 * used by both the create form and the edit dialog so the two stay in sync.
 */

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FormFieldConfig {
  fieldKey: string;
  label: string;
  dataType: string;
  required: boolean;
  enabled: boolean;
  options?: { value: string; label?: string }[] | null;
  placeholder?: string | null;
  helpText?: string | null;
  group?: string | null;
}

export type FieldValue = string | boolean | string[];

/** Initial (empty) value for a field, typed by its dataType. */
export function initialFieldValue(field: FormFieldConfig): FieldValue {
  if (field.dataType === "boolean") return false;
  if (field.dataType === "multi_select") return [];
  return "";
}

/** Coerce an existing document value into a form-control value. */
export function toFieldValue(field: FormFieldConfig, raw: unknown): FieldValue {
  if (field.dataType === "boolean") return Boolean(raw);
  if (field.dataType === "multi_select") {
    return Array.isArray(raw) ? raw.map(String) : [];
  }
  if (field.dataType === "date" || field.dataType === "datetime") {
    if (typeof raw === "string") {
      // Trim ISO strings to the value shape <input type=date|datetime-local> expects.
      return field.dataType === "date" ? raw.slice(0, 10) : raw.slice(0, 16);
    }
    return "";
  }
  if (raw == null) return "";
  return typeof raw === "string" ? raw : String(raw);
}

/** Whether a form value counts as empty for required-field validation. */
export function isEmptyValue(value: FieldValue): boolean {
  return (
    value === "" || value == null || (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Serialise a single field's form value into a JSON payload value.
 * Returns `undefined` when an optional field should be omitted entirely.
 */
export function serializeFieldValue(
  field: FormFieldConfig,
  value: FieldValue
): unknown {
  if (field.dataType === "boolean") return Boolean(value);
  if (field.dataType === "multi_select") {
    const arr = value as string[];
    return arr.length > 0 || field.required ? arr : undefined;
  }
  if (field.dataType === "number" || field.dataType === "integer") {
    if (value === "" || value == null) return field.required ? value : undefined;
    return Number(value);
  }
  if (value === "" || value == null) return field.required ? value : undefined;
  return value;
}

function selectClass(invalid: boolean): string {
  return cn(
    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    invalid && "border-destructive"
  );
}

export function DocumentFieldInput({
  field,
  value,
  errors,
  onChange,
  idPrefix = "field",
}: {
  field: FormFieldConfig;
  value: FieldValue;
  errors?: string[];
  onChange: (value: FieldValue) => void;
  idPrefix?: string;
}) {
  const id = `${idPrefix}-${field.fieldKey}`;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const invalid = Boolean(errors && errors.length > 0);
  const describedBy =
    [field.helpText ? helpId : null, invalid ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const fullWidth = field.dataType === "textarea";
  const options = field.options ?? [];

  const common = {
    id,
    name: field.fieldKey,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    required: field.required,
  } as const;

  function renderControl() {
    switch (field.dataType) {
      case "textarea":
        return (
          <Textarea
            {...common}
            value={value as string}
            placeholder={field.placeholder ?? undefined}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
          />
        );

      case "boolean":
        return (
          <label className="flex items-center gap-2 text-sm text-rosely-night">
            <input
              id={id}
              name={field.fieldKey}
              type="checkbox"
              checked={Boolean(value)}
              aria-describedby={describedBy}
              onChange={(e) => onChange(e.target.checked)}
              className="size-4 rounded border-rosely-blush text-rosely-night focus:ring-2 focus:ring-ring"
            />
            <span>{field.placeholder ?? "Yes"}</span>
          </label>
        );

      case "single_select":
        return (
          <select
            {...common}
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
            className={selectClass(invalid)}
          >
            <option value="">Select…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label ?? o.value}
              </option>
            ))}
          </select>
        );

      case "multi_select":
        return (
          <select
            {...common}
            multiple
            value={value as string[]}
            onChange={(e) =>
              onChange(Array.from(e.target.selectedOptions, (o) => o.value))
            }
            className={cn(selectClass(invalid), "h-auto min-h-24")}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label ?? o.value}
              </option>
            ))}
          </select>
        );

      case "number":
      case "integer":
        return (
          <Input
            {...common}
            type="number"
            step={field.dataType === "integer" ? 1 : "any"}
            value={value as string}
            placeholder={field.placeholder ?? undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "date":
        return (
          <Input
            {...common}
            type="date"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "datetime":
        return (
          <Input
            {...common}
            type="datetime-local"
            value={value as string}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "email":
        return (
          <Input
            {...common}
            type="email"
            value={value as string}
            placeholder={field.placeholder ?? undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "url":
        return (
          <Input
            {...common}
            type="url"
            value={value as string}
            placeholder={field.placeholder ?? "https://…"}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "text":
      case "reference":
      default:
        return (
          <Input
            {...common}
            type="text"
            value={value as string}
            placeholder={field.placeholder ?? undefined}
            onChange={(e) => onChange(e.target.value)}
          />
        );
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", fullWidth && "sm:col-span-2")}>
      <Label htmlFor={id}>
        {field.label}
        {field.required && (
          <span className="ml-1 text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>

      {renderControl()}

      {field.helpText && (
        <p id={helpId} className="text-xs text-rosely-mist">
          {field.helpText}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="text-xs text-destructive">
          {errors!.join(" ")}
        </p>
      )}
    </div>
  );
}
