/**
 * PLANV2 — Dynamic document create page.
 *
 * Resolves the document type by slug and renders a create form built from the
 * type's enabled field configuration.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTypeConfigBySlug } from "@/lib/document-registry";
import {
  DocumentCreateForm,
  type FormFieldConfig,
} from "@/components/documents/DocumentCreateForm";
import { TypeIcon } from "@/components/documents/type-icon";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ type: string }>;
}

export default async function DocumentCreatePage({ params }: PageProps) {
  const { type } = await params;
  const typeConfig = await getTypeConfigBySlug(type);
  if (!typeConfig || !typeConfig.isActive) notFound();

  const fields: FormFieldConfig[] = typeConfig.fields
    .filter((f) => f.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((f) => ({
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link
          href={`/documents/${typeConfig.slug}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-rosely-mist hover:text-rosely-night"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {typeConfig.pluralName}
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-rosely-petal/40 text-rosely-night">
            <TypeIcon name={typeConfig.icon} className="size-5" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold text-rosely-night">New {typeConfig.displayName}</h1>
        </div>
      </div>

      <div className="rounded-xl border border-rosely-blush bg-card p-6">
        <DocumentCreateForm
          slug={typeConfig.slug}
          displayName={typeConfig.displayName}
          fields={fields}
        />
      </div>
    </div>
  );
}
