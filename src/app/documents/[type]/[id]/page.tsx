/**
 * PLANV3 — Universal document detail page.
 *
 * Resolves the document type + record, then renders a name/description header
 * plus every enabled field's value, grouped by the field's configured `group`.
 * Custom fields are included since document-data flattens custom_fields into the
 * row. Provides Edit (dialog) and Delete affordances.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTypeConfigBySlug } from "@/lib/document-registry";
import { getDocumentById } from "@/lib/document-data";
import { TypeIcon } from "@/components/documents/type-icon";
import { DocumentEditDialog } from "@/components/documents/DocumentEditDialog";
import { DocumentDeleteButton } from "@/components/documents/DocumentDeleteButton";
import type { FormFieldConfig } from "@/components/documents/document-fields";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ type: string; id: string }>;
}

/** Human-readable rendering of a stored field value. */
function displayValue(
  raw: unknown,
  options?: { value: string; label?: string }[] | null
): string {
  if (raw == null || raw === "") return "—";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (Array.isArray(raw)) {
    if (raw.length === 0) return "—";
    return raw.map((v) => labelFor(String(v), options)).join(", ");
  }
  return labelFor(String(raw), options);
}

function labelFor(
  value: string,
  options?: { value: string; label?: string }[] | null
): string {
  const match = options?.find((o) => o.value === value);
  return match?.label ?? value;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { type, id } = await params;
  const typeConfig = await getTypeConfigBySlug(type);
  if (!typeConfig || !typeConfig.isActive) notFound();

  const document = await getDocumentById(typeConfig, id);
  if (!document) notFound();

  const name = typeof document.name === "string" ? document.name : "(untitled)";
  const description =
    typeof document.description === "string" ? document.description : null;

  const enabledFields = typeConfig.fields
    .filter((f) => f.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const formFields: FormFieldConfig[] = enabledFields.map((f) => ({
    fieldKey: f.fieldKey,
    label: f.label,
    dataType: f.dataType,
    required: f.required,
    enabled: f.enabled,
    options: f.options ?? null,
    placeholder: f.placeholder,
    helpText: f.helpText,
    group: f.group,
  }));

  // Group enabled fields (excluding name/description, shown in the header) by group.
  const detailFields = enabledFields.filter(
    (f) => f.fieldKey !== "name" && f.fieldKey !== "description"
  );
  const groups = new Map<string, typeof detailFields>();
  for (const field of detailFields) {
    const key = field.group ?? "Details";
    const list = groups.get(key) ?? [];
    list.push(field);
    groups.set(key, list);
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <Link
        href={`/documents/${typeConfig.slug}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-rosely-mist hover:text-rosely-night"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {typeConfig.pluralName}
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-rosely-petal/40 text-rosely-night">
            <TypeIcon name={typeConfig.icon} className="size-5" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-rosely-mist">
              {typeConfig.displayName}
            </p>
            <h1 className="text-2xl font-bold text-rosely-night">{name}</h1>
            {description && (
              <p className="max-w-2xl text-sm text-rosely-dusk">{description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DocumentEditDialog
            slug={typeConfig.slug}
            id={id}
            displayName={typeConfig.displayName}
            fields={formFields}
            document={document}
          />
          <DocumentDeleteButton
            slug={typeConfig.slug}
            id={id}
            displayName={typeConfig.displayName}
            documentName={name}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {[...groups.entries()].map(([groupName, groupFields]) => (
          <section
            key={groupName}
            className="rounded-xl border border-rosely-blush bg-card p-6"
          >
            <h2 className="mb-4 text-sm font-semibold text-rosely-night">{groupName}</h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {groupFields.map((field) => (
                <div key={field.fieldKey} className="flex flex-col gap-1">
                  <dt className="text-xs font-medium text-rosely-mist">{field.label}</dt>
                  <dd className="text-sm text-rosely-night">
                    {displayValue(document[field.fieldKey], field.options)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
