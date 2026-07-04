"use client";

import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getDate, getLabel, getString } from "./helpers";
import { STATUS_COLORS, FALLBACK_COLOR } from "@/components/chart-colors";

type Bar = {
  label: string;
  status: string;
  start: number;
  end: number;
};

/**
 * Gantt-style roadmap: one horizontal bar per document spanning its
 * start/end dates. `config.startField` (default "startDate"),
 * `config.endField` (default "endDate"), `config.statusField` (default "status").
 */
export function RoadmapTimelinePageComponent({ config, documents }: PageComponentProps) {
  const startField = configString(config, "startField", "startDate");
  const endField = configString(config, "endField", "endDate");
  const statusField = configString(config, "statusField", "status");
  const title = configString(config, "title", "Roadmap timeline");

  const bars: Bar[] = documents
    .map((d) => {
      const s = getDate(d, startField);
      const e = getDate(d, endField);
      if (!s || !e) return null;
      return {
        label: getLabel(d),
        status: getString(d, statusField, "Not Started"),
        start: s.getTime(),
        end: Math.max(e.getTime(), s.getTime()),
      };
    })
    .filter((b): b is Bar => b !== null);

  if (bars.length === 0) {
    return (
      <ComponentShell title={title}>
        <EmptyState message="No dated initiatives to display" />
      </ComponentShell>
    );
  }

  const min = Math.min(...bars.map((b) => b.start));
  const max = Math.max(...bars.map((b) => b.end));
  const span = Math.max(1, max - min);
  const fmt = (t: number) =>
    new Date(t).toLocaleDateString(undefined, { month: "short", year: "numeric" });

  const summary = `${bars.length} initiatives from ${fmt(min)} to ${fmt(max)}`;

  return (
    <ComponentShell title={title}>
      <figure role="img" aria-label={`Roadmap Gantt: ${summary}.`} className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-rosely-mist">
          <span>{fmt(min)}</span>
          <span>{fmt(max)}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {bars.map((b, i) => {
            const left = ((b.start - min) / span) * 100;
            const width = Math.max(2, ((b.end - b.start) / span) * 100);
            return (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 truncate text-rosely-night" title={b.label}>
                  {b.label}
                </span>
                <div className="relative h-5 flex-1 rounded bg-rosely-petal/40">
                  <div
                    className="absolute top-0 h-5 rounded"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: STATUS_COLORS[b.status] ?? FALLBACK_COLOR,
                    }}
                    title={`${b.status}: ${fmt(b.start)} – ${fmt(b.end)}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </figure>
    </ComponentShell>
  );
}
