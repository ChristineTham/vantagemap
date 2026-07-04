import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getLabel, getNumber } from "./helpers";
import { scoreColor } from "@/components/chart-colors";

/**
 * Coverage map: for each document, shows a labelled coverage bar (0–100%).
 * `config.coverageField` (default "coverage") holds the percentage. Useful for
 * capability-by-application coverage or objective coverage.
 */
export function CoverageMapPageComponent({ config, documents }: PageComponentProps) {
  const field = configString(config, "coverageField", "coverage");
  const title = configString(config, "title", "Coverage");

  const rows = documents.map((d) => ({
    label: getLabel(d),
    pct: Math.max(0, Math.min(100, getNumber(d, field, 0))),
  }));

  const avg =
    rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : 0;

  return (
    <ComponentShell title={title} description={`Average coverage ${avg}%`}>
      {rows.length === 0 ? (
        <EmptyState message="No coverage data" />
      ) : (
        <figure
          role="img"
          aria-label={`Coverage map across ${rows.length} items, averaging ${avg}%.`}
          className="flex flex-col gap-2"
        >
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 truncate text-rosely-night" title={r.label}>
                {r.label}
              </span>
              <div className="relative h-4 flex-1 rounded bg-rosely-petal/40">
                <div
                  className="h-4 rounded"
                  style={{ width: `${r.pct}%`, backgroundColor: scoreColor(r.pct) }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs text-rosely-dusk">{r.pct}%</span>
            </div>
          ))}
        </figure>
      )}
    </ComponentShell>
  );
}
