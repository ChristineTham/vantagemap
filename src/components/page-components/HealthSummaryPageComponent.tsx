"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { HEALTH_COLORS, FALLBACK_COLOR } from "@/components/chart-colors";
import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, countBy } from "./helpers";

/**
 * Health distribution donut. Groups documents by a health field
 * (default "health") and colours slices with the shared HEALTH_COLORS.
 */
export function HealthSummaryPageComponent({ config, documents }: PageComponentProps) {
  const healthField = configString(config, "healthField", "health");
  const title = configString(config, "title", "Health distribution");

  const data = Object.entries(countBy(documents, healthField))
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const summary = data.map((d) => `${d.value} ${d.name}`).join(", ");

  return (
    <ComponentShell title={title}>
      {data.length === 0 ? (
        <EmptyState message="No health data available" />
      ) : (
        <figure role="img" aria-label={`Doughnut chart of health distribution: ${summary}.`}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={HEALTH_COLORS[entry.name] ?? FALLBACK_COLOR} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-rosely-dusk">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </figure>
      )}
    </ComponentShell>
  );
}
