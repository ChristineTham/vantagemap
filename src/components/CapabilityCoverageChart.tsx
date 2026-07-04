"use client";

/**
 * Phase 13.1 — Capability Coverage Chart
 *
 * Displays a horizontal bar chart showing application count per
 * business capability, highlighting uncovered capabilities.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ROSELY, AXIS_TICK, GRID_STROKE } from "@/components/chart-colors";

interface CapabilityEntry {
  id: string;
  name: string;
  level: number | null;
  appCount: number;
  healthScore: number | null;
}

interface CapabilityCoverageChartProps {
  capabilities: CapabilityEntry[];
  uncovered: number;
  avgApps: number;
}

export function CapabilityCoverageChart({
  capabilities,
  uncovered,
  avgApps,
}: CapabilityCoverageChartProps) {
  // Show top 15 capabilities by app count
  const topCaps = capabilities.slice(0, 15).map((c) => ({
    name: c.name.length > 25 ? c.name.slice(0, 22) + "…" : c.name,
    apps: c.appCount,
  }));

  if (capabilities.length === 0) {
    return (
      <div className="rounded-xl border border-rosely-blush bg-card p-5">
        <h3 className="text-sm font-semibold text-rosely-night mb-3">Capability Coverage</h3>
        <p className="text-center text-sm text-rosely-dusk py-8">
          No capability-application relationships defined yet.
        </p>
      </div>
    );
  }

  const coverageSummary = topCaps
    .map((c) => `${c.name}: ${c.apps} application${c.apps === 1 ? "" : "s"}`)
    .join(", ");

  return (
    <div className="rounded-xl border border-rosely-blush bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-rosely-night">Capability Coverage</h3>
          <p className="text-xs text-rosely-dusk mt-0.5">
            Top 15 capabilities by application count — {uncovered} uncovered, {avgApps} avg
          </p>
        </div>
      </div>
      <figure
        role="img"
        aria-label={`Bar chart of application count for the top ${topCaps.length} business capabilities. ${coverageSummary}.`}
      >
        <ResponsiveContainer width="100%" height={Math.max(200, topCaps.length * 28)}>
          <BarChart data={topCaps} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis type="number" tick={{ fontSize: 12, fill: AXIS_TICK }} />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              tick={{ fontSize: 11, fill: AXIS_TICK }}
            />
            <Tooltip
              formatter={(value) => [`${value ?? 0} apps`, "Applications"]}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="apps" radius={[0, 4, 4, 0]}>
              {topCaps.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.apps === 0 ? ROSELY.flamingo : ROSELY.periwinkle}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </figure>
    </div>
  );
}
