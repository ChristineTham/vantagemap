import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Layers, AppWindow, Target, Radar, GanttChart, AlertTriangle } from "lucide-react";
import {
  getCapabilities,
  getApplications,
  getObjectives,
  getInitiatives,
  getITComponents,
  getTimeDistribution,
  getSixRDistribution,
  getObsolescenceRisk,
  getPortfolioHealth,
} from "@/lib/data";
import type { HealthStatus } from "@/lib/types";
import {
  DashboardChartsLazy as DashboardCharts,
  ReportingChartsLazy as ReportingCharts,
} from "@/components/LazyCharts";
import { auth } from "@/lib/auth-server";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "VantageMap — Enterprise Architecture Platform",
  description:
    "Map business capabilities to applications, align technology with strategy, and govern your portfolio with clarity.",
};

export default async function HomePage() {
  // Server-side auth check — show landing page for unauthenticated visitors
  let session = null;
  try {
    session = await auth.api.getSession({
      headers: await headers(),
    });
  } catch {
    // Auth check failed — treat as unauthenticated
  }

  if (!session) {
    return <LandingPage />;
  }

  const [capabilities, applications, objectives, initiatives, itComponents] = await Promise.all([
    getCapabilities(),
    getApplications(),
    getObjectives(),
    getInitiatives(),
    getITComponents(),
  ]);

  // Fetch Phase 13 report data in parallel
  const [timeReport, sixRReport, obsolescenceReport, portfolioReport] = await Promise.all([
    getTimeDistribution(),
    getSixRDistribution(),
    getObsolescenceRisk(),
    getPortfolioHealth(),
  ]);

  // Compute health distribution across applications
  const healthDist = computeHealthDistribution(applications.map((a) => a.health));

  // Compute initiative status distribution
  const statusDist = {
    "Not Started": initiatives.filter((i) => i.status === "Not Started").length,
    "In Progress": initiatives.filter((i) => i.status === "In Progress").length,
    Completed: initiatives.filter((i) => i.status === "Completed").length,
    "On Hold": initiatives.filter((i) => i.status === "On Hold").length,
    Cancelled: initiatives.filter((i) => i.status === "Cancelled").length,
  };

  const criticalApps = applications.filter((a) => a.health === "Critical" || a.health === "Poor");

  return (
    <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-rosely-night">Dashboard</h1>
        <p className="text-sm text-rosely-mist mt-1">
          Enterprise architecture overview — capabilities, applications, strategy, and roadmap.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Capabilities"
          count={capabilities.length}
          icon={<Layers className="size-5 text-rosely-plum" />}
          href="/capabilities"
        />
        <SummaryCard
          title="Applications"
          count={applications.length}
          icon={<AppWindow className="size-5 text-rosely-cornflower" />}
          href="/applications"
        />
        <SummaryCard
          title="Objectives"
          count={objectives.length}
          icon={<Target className="size-5 text-rosely-teal" />}
          href="/strategy"
        />
        <SummaryCard
          title="Initiatives"
          count={initiatives.length}
          icon={<GanttChart className="size-5 text-rosely-golden" />}
          href="/roadmap"
        />
        <SummaryCard
          title="Tech Components"
          count={itComponents.length}
          icon={<Radar className="size-5 text-rosely-lilac" />}
          href="/radar"
        />
      </div>

      {/* Charts */}
      <DashboardCharts healthDist={healthDist} statusDist={statusDist} />

      {/* Phase 13 — Reporting & Analytics */}
      <div>
        <h2 className="text-lg font-semibold text-rosely-night mb-4">Reporting & Analytics</h2>
        <ReportingCharts
          timeDistribution={timeReport.distribution}
          timeTotal={timeReport.total}
          timeClassified={timeReport.classified}
          sixRDistribution={sixRReport.distribution}
          sixRTotal={sixRReport.total}
          sixRClassified={sixRReport.classified}
          portfolioHealthScore={portfolioReport.overallScore}
          obsolescenceRiskSummary={obsolescenceReport.summary}
        />
      </div>

      {/* Attention Needed */}
      {criticalApps.length > 0 && (
        <div className="rounded-xl border border-rosely-flamingo/30 bg-rosely-flamingo/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-rosely-flamingo" />
            <h2 className="text-sm font-semibold text-rosely-night">Attention Needed</h2>
          </div>
          <div className="flex flex-col gap-2">
            {criticalApps.slice(0, 5).map((app) => (
              <div key={app.id} className="flex items-center justify-between text-sm">
                <span className="text-rosely-night">{app.name}</span>
                <span className="text-xs text-rosely-rose font-medium">{app.health}</span>
              </div>
            ))}
            {criticalApps.length > 5 && (
              <Link href="/applications" className="text-xs text-rosely-plum hover:underline">
                +{criticalApps.length - 5} more
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard
          title="Business Capabilities"
          description="Hierarchical capability map with health indicators"
          href="/capabilities"
          icon={<Layers className="size-5 text-rosely-plum" />}
        />
        <NavCard
          title="Application Portfolio"
          description="Filterable table with fit scores and lifecycle"
          href="/applications"
          icon={<AppWindow className="size-5 text-rosely-cornflower" />}
        />
        <NavCard
          title="Strategy Map"
          description="Balanced Scorecard objectives by perspective"
          href="/strategy"
          icon={<Target className="size-5 text-rosely-teal" />}
        />
        <NavCard
          title="Technology Radar"
          description="Technology landscape with quadrants and rings"
          href="/radar"
          icon={<Radar className="size-5 text-rosely-lilac" />}
        />
        <NavCard
          title="Strategic Roadmap"
          description="Initiative timeline with status and milestones"
          href="/roadmap"
          icon={<GanttChart className="size-5 text-rosely-golden" />}
        />
      </div>
    </div>
  );
}

// ── Helper Functions ────────────────────────────────────────────────────────

function computeHealthDistribution(healthValues: (HealthStatus | null)[]): Record<string, number> {
  const dist: Record<string, number> = {
    Excellent: 0,
    Good: 0,
    Fair: 0,
    Poor: 0,
    Critical: 0,
    Unknown: 0,
  };
  for (const h of healthValues) {
    if (h && h in dist) dist[h]++;
    else dist["Unknown"]++;
  }
  return dist;
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function SummaryCard({
  title,
  count,
  icon,
  href,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-rosely-blush bg-white p-4 hover:border-rosely-lilac hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        {icon}
        <span className="text-2xl font-bold text-rosely-night">{count}</span>
      </div>
      <p className="mt-2 text-xs text-rosely-mist">{title}</p>
    </Link>
  );
}

function NavCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-rosely-blush bg-white p-5 hover:border-rosely-lilac hover:shadow-sm transition-all"
    >
      <div className="mt-0.5">{icon}</div>
      <div>
        <h2 className="text-sm font-semibold text-rosely-night">{title}</h2>
        <p className="mt-0.5 text-xs text-rosely-mist">{description}</p>
      </div>
    </Link>
  );
}
