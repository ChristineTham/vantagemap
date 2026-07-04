/**
 * PLANV3 — Dynamic document list page.
 *
 * Resolves a document type by URL slug, loads its documents and configured
 * page-component layout, and renders each component through the shared
 * PageComponentRenderer. Falls back to a sensible default layout
 * (stats cards + data table) when no page components are configured.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getTypeConfigBySlug, getPageComponents } from "@/lib/document-registry";
import { getDocumentsByType } from "@/lib/document-data";
import { PageComponentRenderer } from "@/components/page-components";
import { TypeIcon } from "@/components/documents/type-icon";
import { Button } from "@/components/ui/button";

// Authenticated, per-request data — never statically cache.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ type: string }>;
}

/** Map a config `width` value ("full"/"half"/"third"/"quarter" or a 1–12 number) to a grid span. */
function widthToSpan(width: string | number | null | undefined): string {
  const map: Record<string, string> = {
    full: "col-span-12",
    half: "col-span-12 lg:col-span-6",
    third: "col-span-12 md:col-span-4",
    quarter: "col-span-12 sm:col-span-6 lg:col-span-3",
  };
  if (typeof width === "string" && map[width]) return map[width];
  const n = typeof width === "number" ? width : Number(width);
  if (Number.isFinite(n) && n >= 1 && n <= 12) {
    return `col-span-12 lg:col-span-${Math.round(n)}`;
  }
  return "col-span-12";
}

export default async function DocumentListPage({ params }: PageProps) {
  const { type } = await params;
  const typeConfig = await getTypeConfigBySlug(type);
  if (!typeConfig || !typeConfig.isActive) notFound();

  const [documents, pageComponents] = await Promise.all([
    getDocumentsByType(typeConfig),
    getPageComponents(typeConfig.id),
  ]);

  // Fall back to a default layout when nothing is configured.
  const layout =
    pageComponents.filter((c) => c.enabled).length > 0
      ? pageComponents.filter((c) => c.enabled)
      : [
          { id: "default-stats", componentKey: "statsCards", config: null, width: "full" },
          { id: "default-table", componentKey: "dataTable", config: null, width: "full" },
        ];

  const rendererTypeConfig = {
    typeKey: typeConfig.typeKey,
    displayName: typeConfig.displayName,
    slug: typeConfig.slug,
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-rosely-petal/40 text-rosely-night">
            <TypeIcon name={typeConfig.icon} className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-rosely-night">{typeConfig.pluralName}</h1>
            <p className="mt-1 text-sm text-rosely-mist">
              {documents.length} {documents.length === 1 ? typeConfig.displayName : typeConfig.pluralName}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/documents/${typeConfig.slug}/new`}>
            <Plus className="size-4" aria-hidden />
            New {typeConfig.displayName}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {layout.map((component) => (
          <div key={component.id} className={widthToSpan(component.width)}>
            <PageComponentRenderer
              componentKey={component.componentKey}
              config={component.config ?? undefined}
              documents={documents}
              typeConfig={rendererTypeConfig}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
