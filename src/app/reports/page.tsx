import type { Metadata } from "next";
import { BarChart3, ShieldAlert, Activity, Layers } from "lucide-react";
import {
  getTimeDistribution,
  getSixRDistribution,
  getObsolescenceRisk,
  getPortfolioHealth,
  getCapabilityCoverage,
} from "@/lib/data";
import { ObsolescenceTable } from "@/components/ObsolescenceTable";
import {
  ReportingChartsLazy as ReportingCharts,
  CapabilityCoverageChartLazy as CapabilityCoverageChart,
  RoadmapImpactSectionLazy as RoadmapImpactSection,
  DataQualitySectionLazy as DataQualitySection,
  AdoptionSectionLazy as AdoptionSection,
} from "@/components/LazyCharts";
import {
  getRoadmapImpact,
  getDataQualityMetrics,
  getAdoptionMetrics,
} from "@/lib/reports-extended";

export const metadata: Metadata = {
  title: "Reports – VantageMap",
  description:
    "Enterprise architecture reporting and analytics: TIME, 6R, obsolescence risk, portfolio health.",
};

// Reports are authenticated and query live data (including direct DB
// aggregations), so this page must be rendered on demand rather than
// statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [
    timeReport,
    sixRReport,
    obsolescenceReport,
    portfolioReport,
    coverageReport,
    roadmapImpact,
    dataQuality,
    adoption,
  ] = await Promise.all([
    getTimeDistribution(),
    getSixRDistribution(),
    getObsolescenceRisk(),
    getPortfolioHealth(),
    getCapabilityCoverage(),
    getRoadmapImpact(),
    getDataQualityMetrics(),
    getAdoptionMetrics(),
  ]);

  return (
    <div className="p-6 flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-rosely-night">Reports & Analytics</h1>
        <p className="text-sm text-rosely-mist mt-1">
          Portfolio analysis, rationalization insights, and risk monitoring.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Portfolio Health"
          value={`${portfolioReport.overallScore}/100`}
          icon={<Activity className="size-5 text-rosely-teal" />}
          subtitle={`${portfolioReport.trends.appsWithCriticalHealth} critical apps`}
        />
        <StatCard
          title="TIME Classified"
          value={`${timeReport.classified}/${timeReport.total}`}
          icon={<BarChart3 className="size-5 text-rosely-cornflower" />}
          subtitle={`${timeReport.unclassified} need review`}
        />
        <StatCard
          title="Obsolescence Risks"
          value={`${obsolescenceReport.summary.critical + obsolescenceReport.summary.high}`}
          icon={<ShieldAlert className="size-5 text-rosely-rose" />}
          subtitle={`${obsolescenceReport.pastEolCount} past EOL`}
        />
        <StatCard
          title="Capability Coverage"
          value={`${coverageReport.avgAppsPerCapability} avg`}
          icon={<Layers className="size-5 text-rosely-plum" />}
          subtitle={`${coverageReport.uncoveredCapabilities} uncovered`}
        />
      </div>

      {/* Main Charts */}
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

      {/* TIME Recommendations */}
      {timeReport.recommendations.length > 0 && (
        <div className="rounded-xl border border-rosely-blush bg-card p-5">
          <h3 className="text-sm font-semibold text-rosely-night mb-3">
            Suggested TIME Classifications
          </h3>
          <p className="text-xs text-rosely-mist mb-4">
            Based on technical and functional fit scores. Review and apply via the application edit
            page.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rosely-blush text-left">
                  <th className="pb-2 font-medium text-rosely-dusk">Application</th>
                  <th className="pb-2 font-medium text-rosely-dusk">Tech Fit</th>
                  <th className="pb-2 font-medium text-rosely-dusk">Func Fit</th>
                  <th className="pb-2 font-medium text-rosely-dusk">Suggested</th>
                  <th className="pb-2 font-medium text-rosely-dusk">Reason</th>
                </tr>
              </thead>
              <tbody>
                {timeReport.recommendations.slice(0, 10).map((rec) => (
                  <tr key={rec.appId} className="border-b border-rosely-blush/50">
                    <td className="py-2 text-rosely-night">{rec.appName}</td>
                    <td className="py-2 text-rosely-dusk">{rec.technicalFit ?? "—"}</td>
                    <td className="py-2 text-rosely-dusk">{rec.functionalFit ?? "—"}</td>
                    <td className="py-2">
                      <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-rosely-lilac/20 text-rosely-plum">
                        {rec.suggestedClassification}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-rosely-mist">{rec.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Obsolescence Risk Table */}
      <ObsolescenceTable items={obsolescenceReport.items} />

      {/* Capability Coverage */}
      <CapabilityCoverageChart
        capabilities={coverageReport.capabilities}
        uncovered={coverageReport.uncoveredCapabilities}
        avgApps={coverageReport.avgAppsPerCapability}
      />

      {/* Portfolio Health Detail */}
      <div className="rounded-xl border border-rosely-blush bg-card p-5">
        <h3 className="text-sm font-semibold text-rosely-night mb-4">Portfolio Health Breakdown</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DimensionCard
            title="Avg Technical Fit"
            value={`${portfolioReport.dimensions.fitScoreAvg.technical}/5`}
          />
          <DimensionCard
            title="Avg Functional Fit"
            value={`${portfolioReport.dimensions.fitScoreAvg.functional}/5`}
          />
          <DimensionCard
            title="Apps in Phase Out"
            value={String(portfolioReport.trends.appsInPhaseOut)}
            alert={portfolioReport.trends.appsInPhaseOut > 0}
          />
          <DimensionCard
            title="Apps in End of Life"
            value={String(portfolioReport.trends.appsInEndOfLife)}
            alert={portfolioReport.trends.appsInEndOfLife > 0}
          />
        </div>
      </div>

      {/* 13.5 — Roadmap Impact Analysis */}
      <RoadmapImpactSection data={roadmapImpact} />

      {/* 13.6 — Data Quality Metrics */}
      <DataQualitySection data={dataQuality} />

      {/* 13.7 — Adoption Metrics */}
      <AdoptionSection data={adoption} />
    </div>
  );
}

// ── Sub-Components ──────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-xl font-bold text-rosely-night">{value}</span>
      </div>
      <p className="text-xs font-medium text-rosely-dusk">{title}</p>
      <p className="text-xs text-rosely-mist mt-0.5">{subtitle}</p>
    </div>
  );
}

function DimensionCard({ title, value, alert }: { title: string; value: string; alert?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3 ${alert ? "border-rosely-flamingo/40 bg-rosely-flamingo/5" : "border-rosely-blush"}`}
    >
      <p className="text-xs text-rosely-mist">{title}</p>
      <p className={`text-lg font-bold mt-1 ${alert ? "text-rosely-rose" : "text-rosely-night"}`}>
        {value}
      </p>
    </div>
  );
}
