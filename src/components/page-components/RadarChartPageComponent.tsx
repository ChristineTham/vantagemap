"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { AXIS_TICK, GRID_STROKE, ROSELY, FALLBACK_COLOR } from "@/components/chart-colors";
import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getLabel, getString } from "./helpers";

const RINGS = ["Adopt", "Trial", "Assess", "Hold"];
const RING_RADIUS: Record<string, number> = { Adopt: 1, Trial: 2, Assess: 3, Hold: 4 };
const QUADRANT_COLORS = [ROSELY.teal, ROSELY.periwinkle, ROSELY.golden, ROSELY.lilac];

/**
 * Technology Radar as a polar-style scatter. Items are placed by ring
 * (Adopt/Trial/Assess/Hold, radial distance) and quadrant (angular sector).
 * `config.ringField` (default "ring"), `config.quadrantField` (default "quadrant").
 */
export function RadarChartPageComponent({ config, documents }: PageComponentProps) {
  const ringField = configString(config, "ringField", "ring");
  const quadrantField = configString(config, "quadrantField", "quadrant");
  const title = configString(config, "title", "Technology radar");

  const quadrants = Array.from(
    new Set(documents.map((d) => getString(d, quadrantField, "General") || "General"))
  );

  const points = documents.map((d, i) => {
    const ring = getString(d, ringField, "Assess");
    const quadrant = getString(d, quadrantField, "General") || "General";
    const qIndex = Math.max(0, quadrants.indexOf(quadrant));
    // angle spread within a quadrant sector
    const baseAngle = (qIndex / Math.max(1, quadrants.length)) * 2 * Math.PI;
    const jitter = ((i % 5) / 5) * (Math.PI / (quadrants.length * 2));
    const angle = baseAngle + jitter + Math.PI / (quadrants.length * 2);
    const r = RING_RADIUS[ring] ?? 3;
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      label: getLabel(d),
      ring,
      quadrant,
      qIndex,
    };
  });

  const summary = RINGS.map(
    (ring) => `${points.filter((p) => p.ring === ring).length} ${ring}`
  ).join(", ");

  return (
    <ComponentShell title={title} description="Adopt · Trial · Assess · Hold">
      {points.length === 0 ? (
        <EmptyState message="No radar entries available" />
      ) : (
        <figure role="img" aria-label={`Technology radar scatter: ${summary}.`}>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis
                type="number"
                dataKey="x"
                domain={[-4.5, 4.5]}
                hide
                tick={{ fill: AXIS_TICK }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[-4.5, 4.5]}
                hide
                tick={{ fill: AXIS_TICK }}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                cursor={{ stroke: GRID_STROKE }}
                formatter={(_v, _n, item) => {
                  const p = item?.payload as { label: string; ring: string } | undefined;
                  return p ? [`${p.ring}`, p.label] : ["", ""];
                }}
              />
              <Scatter data={points}>
                {points.map((p, i) => (
                  <Cell
                    key={i}
                    fill={QUADRANT_COLORS[p.qIndex % QUADRANT_COLORS.length] ?? FALLBACK_COLOR}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </figure>
      )}
    </ComponentShell>
  );
}
