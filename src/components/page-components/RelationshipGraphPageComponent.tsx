import type { PageComponentProps } from "./types";
import { ComponentShell, EmptyState } from "./Shell";
import { configString, getLabel, getString } from "./helpers";
import { ArrowRight } from "lucide-react";

/**
 * Simple relationship / edge list. Each document is treated as an edge with a
 * source and target field (default "sourceId" / "targetId"), labelled by an
 * optional relationship-type field. Node labels are resolved from
 * `joined.nodes` (a map of id → record) when available.
 */
export function RelationshipGraphPageComponent({
  config,
  documents,
  joined,
}: PageComponentProps) {
  const sourceField = configString(config, "sourceField", "sourceId");
  const targetField = configString(config, "targetField", "targetId");
  const typeField = configString(config, "typeField", "relationType");
  const title = configString(config, "title", "Relationships");

  const nodeMap = (joined?.nodes as Record<string, Record<string, unknown>>) ?? {};
  const nameFor = (id: string) => {
    const node = nodeMap[id];
    return node ? getLabel(node) : id || "—";
  };

  const edges = documents.map((d) => ({
    source: nameFor(getString(d, sourceField)),
    target: nameFor(getString(d, targetField)),
    type: getString(d, typeField, "related to"),
  }));

  return (
    <ComponentShell title={title} description={`${edges.length} connections`}>
      {edges.length === 0 ? (
        <EmptyState message="No relationships to display" />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {edges.map((e, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center gap-2 rounded-md border border-rosely-blush bg-background px-3 py-2 text-sm"
            >
              <span className="font-medium text-rosely-night">{e.source}</span>
              <span className="inline-flex items-center gap-1 text-xs text-rosely-mist">
                <ArrowRight className="size-3" />
                {e.type}
                <ArrowRight className="size-3" />
              </span>
              <span className="font-medium text-rosely-night">{e.target}</span>
            </li>
          ))}
        </ul>
      )}
    </ComponentShell>
  );
}
