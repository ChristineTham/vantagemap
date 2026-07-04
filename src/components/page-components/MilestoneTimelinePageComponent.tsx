import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getDate, getLabel, getString } from "./helpers";
import { STATUS_COLORS, FALLBACK_COLOR } from "@/components/chart-colors";

/**
 * Vertical milestone timeline. Each document is a milestone with a date
 * (`config.dateField`, default "date") and status (`config.statusField`).
 * Rendered as a chronologically ordered rail with dots.
 */
export function MilestoneTimelinePageComponent({ config, documents }: PageComponentProps) {
  const dateField = configString(config, "dateField", "date");
  const statusField = configString(config, "statusField", "status");
  const title = configString(config, "title", "Milestones");

  const items = documents
    .map((d) => ({
      label: getLabel(d),
      status: getString(d, statusField, "Not Started"),
      date: getDate(d, dateField),
    }))
    .filter((m) => m.date !== null)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime());

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  return (
    <ComponentShell title={title}>
      {items.length === 0 ? (
        <EmptyState message="No milestones to display" />
      ) : (
        <ol className="relative flex flex-col gap-4 border-l border-rosely-blush pl-6">
          {items.map((m, i) => (
            <li key={i} className="relative">
              <span
                className="absolute -left-[27px] top-1 size-3 rounded-full ring-2 ring-card"
                style={{ backgroundColor: STATUS_COLORS[m.status] ?? FALLBACK_COLOR }}
                aria-hidden
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-rosely-mist">{fmt(m.date!)}</span>
                <span className="text-sm font-medium text-rosely-night">{m.label}</span>
                <span className="text-xs text-rosely-dusk">{m.status}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ComponentShell>
  );
}
