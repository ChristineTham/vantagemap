import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { getSavedReport } from "@/lib/reports-dashboards-api";
import { RenderComponent } from "@/components/reports/RenderComponent";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = await getSavedReport(slug);
  return {
    title: report ? `${report.name} – VantageMap` : "Report – VantageMap",
    description: report?.description ?? "Saved report",
  };
}

export default async function SavedReportPage({ params }: PageProps) {
  const { slug } = await params;
  const report = await getSavedReport(slug);
  if (!report) notFound();

  const components = [...report.components]
    .filter((c) => c.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-2">
        <Link
          href="/saved-reports"
          className="flex w-fit items-center gap-1.5 text-sm text-rosely-mist hover:text-rosely-plum"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Saved reports
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">{report.name}</h1>
          {report.description && (
            <p className="text-sm text-rosely-mist mt-1">{report.description}</p>
          )}
        </div>
      </div>

      {report.data === null && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-dashed border-rosely-blush bg-card p-4 text-sm text-rosely-dusk"
        >
          <AlertTriangle className="size-4 shrink-0 text-rosely-golden" aria-hidden />
          <span>This report&rsquo;s data source could not be executed. It may be stale or invalid.</span>
        </div>
      )}

      {components.length === 0 ? (
        <p className="rounded-xl border border-dashed border-rosely-blush bg-card p-6 text-sm text-rosely-mist">
          This report has no components configured.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {components.map((c) => (
            <RenderComponent
              key={c.id}
              componentKey={c.componentKey}
              config={c.config}
              data={report.data}
            />
          ))}
        </div>
      )}
    </div>
  );
}
