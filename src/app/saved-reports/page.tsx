import type { Metadata } from "next";
import Link from "next/link";
import { FileBarChart, Plus, Globe, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listSavedReports,
  bucketByVisibility,
  type SavedReportSummary,
} from "@/lib/reports-dashboards-api";

export const metadata: Metadata = {
  title: "Saved Reports – VantageMap",
  description: "Custom saved reports built on the page-component library and data-source engine.",
};

export const dynamic = "force-dynamic";

export default async function SavedReportsPage() {
  const reports = (await listSavedReports()) ?? [];
  const { system, shared, mine } = bucketByVisibility(reports);

  return (
    <div className="p-6 flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">Saved Reports</h1>
          <p className="text-sm text-rosely-mist mt-1">
            Reusable reports composed from live data sources and page components.
          </p>
        </div>
        <Button asChild>
          <Link href="/saved-reports/new">
            <Plus className="size-4" aria-hidden />
            New report
          </Link>
        </Button>
      </div>

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          <ReportGroup title="System" icon={Globe} reports={system} />
          <ReportGroup title="Shared" icon={Users} reports={shared} />
          <ReportGroup title="Mine" icon={Lock} reports={mine} />
        </div>
      )}
    </div>
  );
}

function ReportGroup({
  title,
  icon: Icon,
  reports,
}: {
  title: string;
  icon: typeof Globe;
  reports: SavedReportSummary[];
}) {
  if (reports.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-rosely-plum" aria-hidden />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rosely-dusk">{title}</h2>
        <span className="text-xs text-rosely-mist">({reports.length})</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link
            key={r.id}
            href={`/saved-reports/${r.slug}`}
            className="group flex flex-col gap-2 rounded-xl border border-rosely-blush bg-card p-4 transition-colors hover:border-rosely-plum/60"
          >
            <div className="flex items-center gap-2">
              <FileBarChart className="size-4 text-rosely-teal" aria-hidden />
              <span className="font-medium text-rosely-night group-hover:text-rosely-plum">
                {r.name}
              </span>
            </div>
            {r.description && (
              <p className="line-clamp-2 text-xs text-rosely-mist">{r.description}</p>
            )}
            {r.category && (
              <span className="mt-auto w-fit rounded-full bg-rosely-lilac/20 px-2 py-0.5 text-xs font-medium text-rosely-plum">
                {r.category}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-rosely-blush bg-card p-10 text-center">
      <FileBarChart className="size-8 text-rosely-mist" aria-hidden />
      <p className="text-sm text-rosely-dusk">No saved reports yet.</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/saved-reports/new">
          <Plus className="size-4" aria-hidden />
          Create your first report
        </Link>
      </Button>
    </div>
  );
}
