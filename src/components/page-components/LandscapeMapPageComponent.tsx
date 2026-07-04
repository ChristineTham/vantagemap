import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getLabel, getString } from "./helpers";
import { HEALTH_COLORS, FALLBACK_COLOR } from "@/components/chart-colors";

/**
 * Landscape map: tiled heat cells grouped into swim-lanes by a grouping field
 * (default "domain"). Each tile is a document, coloured by its health field.
 * Mirrors the classic EA "application landscape" view.
 */
export function LandscapeMapPageComponent({ config, documents }: PageComponentProps) {
  const groupField = configString(config, "groupField", "domain");
  const healthField = configString(config, "healthField", "health");
  const title = configString(config, "title", "Landscape");

  const lanes = new Map<string, Record<string, unknown>[]>();
  for (const d of documents) {
    const g = getString(d, groupField, "Uncategorised") || "Uncategorised";
    if (!lanes.has(g)) lanes.set(g, []);
    lanes.get(g)!.push(d);
  }

  return (
    <ComponentShell title={title} description={`${documents.length} items across ${lanes.size} groups`}>
      {documents.length === 0 ? (
        <EmptyState message="No items to map" />
      ) : (
        <figure
          role="img"
          aria-label={`Landscape heat map of ${documents.length} items across ${lanes.size} groups.`}
          className="flex flex-col gap-4"
        >
          {Array.from(lanes.entries()).map(([lane, items]) => (
            <div key={lane} className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-rosely-mist">
                {lane}
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {items.map((d, i) => {
                  const health = getString(d, healthField, "Unknown");
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-1 rounded-md border border-rosely-blush p-2 text-xs"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${
                          HEALTH_COLORS[health] ?? FALLBACK_COLOR
                        } 18%, var(--card))`,
                      }}
                      title={`${getLabel(d)} · ${health}`}
                    >
                      <span className="truncate font-medium text-rosely-night">{getLabel(d)}</span>
                      <span className="text-rosely-dusk">{health}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </figure>
      )}
    </ComponentShell>
  );
}
