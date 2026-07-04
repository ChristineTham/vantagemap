"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { AXIS_TICK, GRID_STROKE, scoreColor } from "@/components/chart-colors";
import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getLabel, getNumber } from "./helpers";

/**
 * Portfolio bubble matrix: each document plotted by two numeric fields
 * (`config.xField` / `config.yField`), bubble sized by `config.sizeField`.
 * Bubble colour follows the y-value via the shared score gradient.
 */
export function PortfolioMatrixPageComponent({ config, documents }: PageComponentProps) {
  const xField = configString(config, "xField", "cost");
  const yField = configString(config, "yField", "value");
  const sizeField = configString(config, "sizeField", "size");
  const title = configString(config, "title", "Portfolio matrix");

  const points = documents.map((d) => ({
    x: getNumber(d, xField, 0),
    y: getNumber(d, yField, 0),
    z: getNumber(d, sizeField, 1),
    label: getLabel(d),
  }));

  const summary = `${points.length} items plotted by ${xField} and ${yField}`;

  return (
    <ComponentShell title={title} description={`${xField} × ${yField}`}>
      {points.length === 0 ? (
        <EmptyState message="No portfolio data" />
      ) : (
        <figure role="img" aria-label={`Bubble matrix: ${summary}.`}>
          <ResponsiveContainer width="100%" height={320}>
            <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis
                type="number"
                dataKey="x"
                name={xField}
                tick={{ fontSize: 11, fill: AXIS_TICK }}
                label={{ value: xField, position: "insideBottom", offset: -12, fill: AXIS_TICK }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={yField}
                tick={{ fontSize: 11, fill: AXIS_TICK }}
              />
              <ZAxis type="number" dataKey="z" range={[60, 400]} name={sizeField} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                formatter={(v, n, item) => {
                  const p = item?.payload as { label: string } | undefined;
                  return [String(v), p ? p.label : String(n)];
                }}
              />
              <Scatter data={points}>
                {points.map((p, i) => (
                  <Cell key={i} fillOpacity={0.7} fill={scoreColor(p.y)} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </figure>
      )}
    </ComponentShell>
  );
}
