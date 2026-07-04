"use client";

import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import { ROSELY, FALLBACK_COLOR } from "@/components/chart-colors";
import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, countBy } from "./helpers";

const PALETTE = [
  ROSELY.periwinkle,
  ROSELY.teal,
  ROSELY.lilac,
  ROSELY.golden,
  ROSELY.cornflower,
  ROSELY.flamingo,
];

/**
 * Treemap of document counts grouped by a category field
 * (default "category"). Rectangle area is proportional to count.
 */
export function TreemapPageComponent({ config, documents }: PageComponentProps) {
  const field = configString(config, "groupField", "category");
  const title = configString(config, "title", "Composition");

  const data = Object.entries(countBy(documents, field))
    .filter(([, v]) => v > 0)
    .map(([name, size], i) => ({ name, size, fill: PALETTE[i % PALETTE.length] ?? FALLBACK_COLOR }));

  const summary = data.map((d) => `${d.name} ${d.size}`).join(", ");

  return (
    <ComponentShell title={title}>
      {data.length === 0 ? (
        <EmptyState message="No data to display" />
      ) : (
        <figure role="img" aria-label={`Treemap of ${field}: ${summary}.`}>
          <ResponsiveContainer width="100%" height={280}>
            <Treemap
              data={data}
              dataKey="size"
              nameKey="name"
              stroke="var(--rosely6)"
              isAnimationActive={false}
            >
              <Tooltip />
            </Treemap>
          </ResponsiveContainer>
        </figure>
      )}
    </ComponentShell>
  );
}
