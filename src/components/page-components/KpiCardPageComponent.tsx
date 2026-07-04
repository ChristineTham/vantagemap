import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { PageComponentProps } from "./types";
import { ComponentShell } from "./Shell";
import { configString, getNumber } from "./helpers";
import { ROSELY } from "@/components/chart-colors";

/**
 * KPI card: current value against a target, with a trend direction and
 * progress bar. Reads the first document, using `config.valueField` /
 * `config.targetField` / `config.trendField` (defaults value/target/trend).
 */
export function KpiCardPageComponent({ config, documents, aggregates }: PageComponentProps) {
  const src = (aggregates?.[0] ?? documents[0] ?? {}) as Record<string, unknown>;
  const valueField = configString(config, "valueField", "value");
  const targetField = configString(config, "targetField", "target");
  const trendField = configString(config, "trendField", "trend");
  const unit = configString(config, "unit", "");
  const title = configString(config, "title", "KPI");

  const value = getNumber(src, valueField, 0);
  const target = getNumber(src, targetField, 0);
  const trend = getNumber(src, trendField, 0);
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? ROSELY.teal : trend < 0 ? ROSELY.rose : ROSELY.mist;

  return (
    <ComponentShell title={title}>
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-rosely-night">
            {value.toLocaleString()}
            {unit}
          </span>
          {target > 0 && (
            <span className="text-sm text-rosely-mist">
              / {target.toLocaleString()}
              {unit}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm" style={{ color: trendColor }}>
          <TrendIcon className="size-4" aria-hidden />
          <span>
            {trend > 0 ? "+" : ""}
            {trend}
            {unit} vs previous
          </span>
        </div>
        {target > 0 && (
          <div
            className="h-2 rounded-full bg-rosely-petal/40"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${pct}% of target`}
          >
            <div
              className="h-2 rounded-full"
              style={{ width: `${pct}%`, backgroundColor: ROSELY.teal }}
            />
          </div>
        )}
      </div>
    </ComponentShell>
  );
}
