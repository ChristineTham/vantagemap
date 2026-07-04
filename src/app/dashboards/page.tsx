import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, Plus, Globe, Users, Lock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listDashboards,
  bucketByVisibility,
  type DashboardSummary,
} from "@/lib/reports-dashboards-api";

export const metadata: Metadata = {
  title: "Dashboards – VantageMap",
  description: "Custom dashboards of widgets, each backed by its own live data source.",
};

export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  const dashboards = (await listDashboards()) ?? [];
  const { system, shared, mine } = bucketByVisibility(dashboards);

  return (
    <div className="p-6 flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-rosely-night">Dashboards</h1>
          <p className="text-sm text-rosely-mist mt-1">
            Composed views of widgets, each with its own data source.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboards/new">
            <Plus className="size-4" aria-hidden />
            New dashboard
          </Link>
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          <DashboardGroup title="System" icon={Globe} dashboards={system} />
          <DashboardGroup title="Shared" icon={Users} dashboards={shared} />
          <DashboardGroup title="Mine" icon={Lock} dashboards={mine} />
        </div>
      )}
    </div>
  );
}

function DashboardGroup({
  title,
  icon: Icon,
  dashboards,
}: {
  title: string;
  icon: typeof Globe;
  dashboards: DashboardSummary[];
}) {
  if (dashboards.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-rosely-plum" aria-hidden />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rosely-dusk">{title}</h2>
        <span className="text-xs text-rosely-mist">({dashboards.length})</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((d) => (
          <Link
            key={d.id}
            href={`/dashboards/${d.slug}`}
            className="group flex flex-col gap-2 rounded-xl border border-rosely-blush bg-card p-4 transition-colors hover:border-rosely-plum/60"
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="size-4 text-rosely-teal" aria-hidden />
              <span className="font-medium text-rosely-night group-hover:text-rosely-plum">
                {d.name}
              </span>
              {d.isDefault && (
                <Star className="size-3.5 fill-rosely-golden text-rosely-golden" aria-label="Default" />
              )}
            </div>
            {d.description && (
              <p className="line-clamp-2 text-xs text-rosely-mist">{d.description}</p>
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
      <LayoutDashboard className="size-8 text-rosely-mist" aria-hidden />
      <p className="text-sm text-rosely-dusk">No dashboards yet.</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/dashboards/new">
          <Plus className="size-4" aria-hidden />
          Create your first dashboard
        </Link>
      </Button>
    </div>
  );
}
