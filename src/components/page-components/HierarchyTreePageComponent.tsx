import type { PageComponentProps } from "./types";
import { ComponentShell } from "./Shell";
import { configString, getLabel, getString } from "./helpers";
import { HEALTH_COLORS, FALLBACK_COLOR } from "@/components/chart-colors";

type Node = {
  id: string;
  label: string;
  health: string;
  children: Node[];
};

/**
 * Nested tree grouped by a parent-reference field (default "parentId").
 * Renders a semantic nested list with indentation and an optional health dot.
 */
export function HierarchyTreePageComponent({ config, documents }: PageComponentProps) {
  const parentField = configString(config, "parentField", "parentId");
  const healthField = configString(config, "healthField", "health");
  const title = configString(config, "title", "Hierarchy");

  const byId = new Map<string, Node>();
  for (const row of documents) {
    const id = getString(row, "id");
    if (!id) continue;
    byId.set(id, {
      id,
      label: getLabel(row),
      health: getString(row, healthField, "Unknown"),
      children: [],
    });
  }

  const roots: Node[] = [];
  for (const row of documents) {
    const id = getString(row, "id");
    const node = byId.get(id);
    if (!node) continue;
    const parentId = getString(row, parentField);
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  return (
    <ComponentShell title={title}>
      {roots.length === 0 ? (
        <p className="py-12 text-center text-sm text-rosely-dusk">No hierarchy to display.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {roots.map((n) => (
            <TreeItem key={n.id} node={n} depth={0} />
          ))}
        </ul>
      )}
    </ComponentShell>
  );
}

function TreeItem({ node, depth }: { node: Node; depth: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-rosely-night hover:bg-rosely-petal/40"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span
          className="inline-block size-2 shrink-0 rounded-full"
          style={{ backgroundColor: HEALTH_COLORS[node.health] ?? FALLBACK_COLOR }}
          aria-hidden
        />
        <span>{node.label}</span>
        {node.children.length > 0 && (
          <span className="text-xs text-rosely-mist">({node.children.length})</span>
        )}
      </div>
      {node.children.length > 0 && (
        <ul className="flex flex-col gap-1">
          {node.children.map((c) => (
            <TreeItem key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
