import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { PageComponentProps } from "./types";
import { configString, getNumber } from "./helpers";
import { ROSELY } from "@/components/chart-colors";
import { cn } from "@/lib/utils";

/**
 * Compact metric tile: a single number plus a delta chip. Value comes from the
 * first aggregate/document (`config.valueField`), delta from `config.deltaField`.
 * When no source data exists, `config.value` / `config.delta` are used directly.
 */
export function MetricTilePageComponent({ config, documents, aggregates }: PageComponentProps) {
  const src = (aggregates?.[0] ?? documents[0] ?? {}) as Record<string, unknown>;
  const valueField = configString(config, "valueField", "value");
  const deltaField = configString(config, "deltaField", "delta");
  const unit = configString(config, "unit", "");
  const label = configString(config, "label", "Metric");

  const value = documents.length || aggregates?.length ? getNumber(src, valueField, getNumber(config ?? {}, "value", 0)) : getNumber(config ?? {}, "value", 0);
  const delta = getNumber(src, deltaField, getNumber(config ?? {}, "delta", 0));

  const up = delta >= 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-rosely-blush bg-card p-5">
      <span className="text-xs font-medium uppercase tracking-wide text-rosely-mist">{label}</span>
      <span className="text-3xl font-semibold text-rosely-night">
        {value.toLocaleString()}
        {unit}
      </span>
      <span
        className={cn("inline-flex items-center gap-1 text-sm")}
        style={{ color: up ? ROSELY.teal : ROSELY.rose }}
      >
        {up ? (
          <ArrowUpRight className="size-4" aria-hidden />
        ) : (
          <ArrowDownRight className="size-4" aria-hidden />
        )}
        {up ? "+" : ""}
        {delta}
        {unit}
      </span>
    </div>
  );
}
