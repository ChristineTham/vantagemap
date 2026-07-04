"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { AXIS_TICK, GRID_STROKE, BAR_PRIMARY } from "@/components/chart-colors";
import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, countBy } from "./helpers";

/**
 * Lifecycle-phase distribution as a horizontal bar chart. Groups by a
 * lifecycle field (default "lifecycle").
 */
export function LifecycleSummaryPageComponent({ config, documents }: PageComponentProps) {
  const field = configString(config, "lifecycleField", "lifecycle");
  const title = configString(config, "title", "Lifecycle distribution");

  const data = Object.entries(countBy(documents, field))
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const summary = data.map((d) => `${d.value} ${d.name}`).join(", ");

  return (
    <ComponentShell title={title}>
      {data.length === 0 ? (
        <EmptyState message="No lifecycle data available" />
      ) : (
        <figure role="img" aria-label={`Bar chart of lifecycle distribution: ${summary}.`}>
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis type="number" tick={{ fontSize: 12, fill: AXIS_TICK }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11, fill: AXIS_TICK }}
              />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={BAR_PRIMARY} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </figure>
      )}
    </ComponentShell>
  );
}
