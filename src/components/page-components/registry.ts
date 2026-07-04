/**
 * Page-component registry.
 *
 * Maps a stable `componentKey` string to the React component that renders it,
 * plus a metadata list used by pickers/palettes. Chart-heavy components are
 * `"use client"` and load Recharts on the client; they are referenced here by
 * static import and resolved lazily at render time via the LazyCharts pattern
 * where a component is chart-only (see `charts.ts`).
 */

import type { PageComponent, PageComponentMeta } from "./types";

// Non-chart (server-friendly) components
import { StatsCardsPageComponent } from "./StatsCardsPageComponent";
import { DataTablePageComponent } from "./DataTablePageComponent";
import { HierarchyTreePageComponent } from "./HierarchyTreePageComponent";
import { RelationshipGraphPageComponent } from "./RelationshipGraphPageComponent";
import { MatrixViewPageComponent } from "./MatrixViewPageComponent";
import { CoverageMapPageComponent } from "./CoverageMapPageComponent";
import { TimeClassificationPageComponent } from "./TimeClassificationPageComponent";
import { SixRClassificationPageComponent } from "./SixRClassificationPageComponent";
import { CreateButtonPageComponent } from "./CreateButtonPageComponent";
import { KpiCardPageComponent } from "./KpiCardPageComponent";
import { MetricTilePageComponent } from "./MetricTilePageComponent";
import { LandscapeMapPageComponent } from "./LandscapeMapPageComponent";
import { CircleMapPageComponent } from "./CircleMapPageComponent";
import { MilestoneTimelinePageComponent } from "./MilestoneTimelinePageComponent";
import { RoadmapTimelinePageComponent } from "./RoadmapTimelinePageComponent";

// Client / chart + interactive components
import { HealthSummaryPageComponent } from "./HealthSummaryPageComponent";
import { LifecycleSummaryPageComponent } from "./LifecycleSummaryPageComponent";
import { RadarChartPageComponent } from "./RadarChartPageComponent";
import { TreemapPageComponent } from "./TreemapPageComponent";
import { PortfolioMatrixPageComponent } from "./PortfolioMatrixPageComponent";
import { FilterBarPageComponent } from "./FilterBarPageComponent";
import { DecisionsLogPageComponent } from "./DecisionsLogPageComponent";

export const PAGE_COMPONENT_REGISTRY: Record<string, PageComponent> = {
  statsCards: StatsCardsPageComponent,
  dataTable: DataTablePageComponent,
  hierarchyTree: HierarchyTreePageComponent,
  healthSummary: HealthSummaryPageComponent,
  lifecycleSummary: LifecycleSummaryPageComponent,
  radarChart: RadarChartPageComponent,
  roadmapTimeline: RoadmapTimelinePageComponent,
  treemap: TreemapPageComponent,
  relationshipGraph: RelationshipGraphPageComponent,
  matrixView: MatrixViewPageComponent,
  coverageMap: CoverageMapPageComponent,
  timeClassification: TimeClassificationPageComponent,
  sixRClassification: SixRClassificationPageComponent,
  filterBar: FilterBarPageComponent,
  createButton: CreateButtonPageComponent,
  kpiCard: KpiCardPageComponent,
  metricTile: MetricTilePageComponent,
  landscapeMap: LandscapeMapPageComponent,
  portfolioMatrix: PortfolioMatrixPageComponent,
  circleMap: CircleMapPageComponent,
  milestoneTimeline: MilestoneTimelinePageComponent,
  decisionsLog: DecisionsLogPageComponent,
};

export const PAGE_COMPONENT_META: PageComponentMeta[] = [
  { key: "statsCards", name: "Stats Cards", description: "Count cards — total plus a card per status value.", defaultWidth: 12 },
  { key: "dataTable", name: "Data Table", description: "Configurable, sortable columns table.", defaultWidth: 12 },
  { key: "hierarchyTree", name: "Hierarchy Tree", description: "Nested tree grouped by a parent reference.", defaultWidth: 6 },
  { key: "healthSummary", name: "Health Summary", description: "Donut of health-status distribution.", defaultWidth: 6 },
  { key: "lifecycleSummary", name: "Lifecycle Summary", description: "Bar chart of lifecycle-phase distribution.", defaultWidth: 6 },
  { key: "radarChart", name: "Technology Radar", description: "Ring/quadrant scatter (Adopt/Trial/Assess/Hold).", defaultWidth: 6 },
  { key: "roadmapTimeline", name: "Roadmap Timeline", description: "Gantt-style start/end bars per initiative.", defaultWidth: 12 },
  { key: "treemap", name: "Treemap", description: "Area-proportional composition by category.", defaultWidth: 6 },
  { key: "relationshipGraph", name: "Relationship Graph", description: "Source→target edge list of relationships.", defaultWidth: 6 },
  { key: "matrixView", name: "Matrix View", description: "Row × column count heatmap.", defaultWidth: 6 },
  { key: "coverageMap", name: "Coverage Map", description: "Per-item coverage bars (0–100%).", defaultWidth: 6 },
  { key: "timeClassification", name: "TIME Classification", description: "Tolerate/Invest/Migrate/Eliminate buckets.", defaultWidth: 6 },
  { key: "sixRClassification", name: "6R Classification", description: "Cloud-migration 6R buckets.", defaultWidth: 6 },
  { key: "filterBar", name: "Filter Bar", description: "Search + facet chips with match count.", defaultWidth: 12 },
  { key: "createButton", name: "Create Button", description: "Action linking to the create route.", defaultWidth: 3 },
  { key: "kpiCard", name: "KPI Card", description: "Value vs target with trend and progress.", defaultWidth: 4 },
  { key: "metricTile", name: "Metric Tile", description: "A single number with a delta chip.", defaultWidth: 3 },
  { key: "landscapeMap", name: "Landscape Map", description: "Tiled heat cells grouped into swim-lanes.", defaultWidth: 12 },
  { key: "portfolioMatrix", name: "Portfolio Matrix", description: "Bubble chart across two numeric fields.", defaultWidth: 6 },
  { key: "circleMap", name: "Circle Map", description: "Radial packing of category counts.", defaultWidth: 6 },
  { key: "milestoneTimeline", name: "Milestone Timeline", description: "Chronological milestone rail.", defaultWidth: 6 },
  { key: "decisionsLog", name: "Decisions Log", description: "Filterable list of architectural decisions.", defaultWidth: 6 },
];
