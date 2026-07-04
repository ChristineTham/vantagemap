import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { getDashboard } from "@/lib/reports-dashboards-api";
import { RenderComponent, widthToColSpan } from "@/components/reports/RenderComponent";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const dashboard = await getDashboard(slug);
  return {
    title: dashboard ? `${dashboard.name} – VantageMap` : "Dashboard – VantageMap",
    description: dashboard?.description ?? "Dashboard",
  };
}

export default async function DashboardPage({ params }: PageProps) {
  const { slug } = await params;
  const dashboard = await getDashboard(slug);
  if (!dashboard) notFound();

  const widgets = [...dashboard.widgets].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboards"
          className="flex w-fit items-center gap-1.5 text-sm text-rosely-mist hover:text-rosely-plum"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboards
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-rosely-night">{dashboard.name}</h1>
          {dashboard.isDefault && (
            <Star className="size-5 fill-rosely-golden text-rosely-golden" aria-label="Default dashboard" />
          )}
        </div>
        {dashboard.description && (
          <p className="text-sm text-rosely-mist">{dashboard.description}</p>
        )}
      </div>

      {widgets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-rosely-blush bg-card p-6 text-sm text-rosely-mist">
          This dashboard has no widgets configured.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {widgets.map((w) => (
            <div key={w.id} className={`col-span-1 ${widthToColSpan(w.width)}`}>
              {w.title && (
                <h2 className="mb-2 text-sm font-semibold text-rosely-dusk">{w.title}</h2>
              )}
              <RenderComponent componentKey={w.componentKey} config={w.config} data={w.data} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
