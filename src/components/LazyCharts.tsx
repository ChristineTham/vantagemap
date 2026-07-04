"use client";
/**
 * Lazy-loaded chart wrappers.
 * `ssr: false` is only valid inside Client Components in Next.js 16,
 * so these dynamic imports live here rather than in page.tsx.
 */
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardChartsLazy = dynamic(
  () => import("@/components/DashboardCharts").then((m) => m.DashboardCharts),
  {
    ssr: false,
    loading: () => <Skeleton className="h-60" />,
  }
);

export const ReportingChartsLazy = dynamic(
  () => import("@/components/ReportingCharts").then((m) => m.ReportingCharts),
  {
    ssr: false,
    loading: () => <Skeleton className="h-60" />,
  }
);

export const CapabilityCoverageChartLazy = dynamic(
  () => import("@/components/CapabilityCoverageChart").then((m) => m.CapabilityCoverageChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-60" />,
  }
);

// ── Phase 13.5–13.7 extended report sections ────────────────────────────────

export const RoadmapImpactSectionLazy = dynamic(
  () => import("@/components/ReportsExtended").then((m) => m.RoadmapImpactSection),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80" />,
  }
);

export const DataQualitySectionLazy = dynamic(
  () => import("@/components/ReportsExtended").then((m) => m.DataQualitySection),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80" />,
  }
);

export const AdoptionSectionLazy = dynamic(
  () => import("@/components/ReportsExtended").then((m) => m.AdoptionSection),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80" />,
  }
);
