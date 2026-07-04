import { getLabel, getString } from "./helpers";
import { EmptyState } from "./Shell";

/**
 * Shared presentational grid for categorical classifications (TIME, 6R, …).
 * Renders one bucket per category with the matching documents listed inside.
 */
export function ClassificationGrid({
  documents,
  field,
  categories,
  colors,
}: {
  documents: Record<string, unknown>[];
  field: string;
  categories: string[];
  colors: Record<string, string>;
}) {
  if (documents.length === 0) {
    return <EmptyState message="No records to classify" />;
  }

  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const cat of categories) buckets.set(cat, []);
  for (const d of documents) {
    const cat = getString(d, field, "Unclassified") || "Unclassified";
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(d);
  }

  const summary = Array.from(buckets.entries())
    .map(([cat, items]) => `${items.length} ${cat}`)
    .join(", ");

  return (
    <figure
      role="img"
      aria-label={`Classification by ${field}: ${summary}.`}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {Array.from(buckets.entries()).map(([cat, items]) => (
        <div key={cat} className="rounded-lg border border-rosely-blush bg-background p-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: colors[cat] ?? "var(--rosely3)" }}
              aria-hidden
            />
            <span className="text-sm font-medium text-rosely-night">{cat}</span>
            <span className="text-xs text-rosely-mist">({items.length})</span>
          </div>
          <ul className="flex flex-col gap-0.5">
            {items.slice(0, 8).map((d, i) => (
              <li key={i} className="truncate text-xs text-rosely-dusk">
                {getLabel(d)}
              </li>
            ))}
            {items.length > 8 && (
              <li className="text-xs text-rosely-mist">+{items.length - 8} more</li>
            )}
          </ul>
        </div>
      ))}
    </figure>
  );
}
