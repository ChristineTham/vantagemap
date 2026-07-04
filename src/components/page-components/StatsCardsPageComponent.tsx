import type { PageComponentProps } from "./types";
import { ComponentShell } from "./Shell";
import { configString, countBy } from "./helpers";

/**
 * Count cards: a total plus one card per distinct value of a status field.
 * `config.statusField` selects the grouping field (default "status").
 */
export function StatsCardsPageComponent({
  config,
  documents,
  typeConfig,
}: PageComponentProps) {
  const statusField = configString(config, "statusField", "status");
  const title = configString(config, "title", `${typeConfig?.displayName ?? "Records"} summary`);
  const byStatus = countBy(documents, statusField);
  const total = documents.length;

  const entries = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <ComponentShell title={title}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total" value={total} emphasis />
        {entries.map(([name, count]) => (
          <StatCard key={name} label={name} value={count} />
        ))}
      </div>
    </ComponentShell>
  );
}

function StatCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-rosely-blush bg-background p-4">
      <span
        className={
          emphasis
            ? "text-2xl font-semibold text-rosely-night"
            : "text-2xl font-semibold text-rosely-dusk"
        }
      >
        {value.toLocaleString()}
      </span>
      <span className="text-xs text-rosely-mist">{label}</span>
    </div>
  );
}
