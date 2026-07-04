import type { PageComponentProps } from "./types";
import { ComponentShell } from "./Shell";
import { ClassificationGrid } from "./ClassificationGrid";
import { configString } from "./helpers";
import { TIME_COLORS } from "@/components/chart-colors";

const TIME_CATEGORIES = ["Tolerate", "Invest", "Migrate", "Eliminate"];

/**
 * TIME rationalisation buckets (Tolerate / Invest / Migrate / Eliminate).
 * `config.timeField` (default "timeClassification").
 */
export function TimeClassificationPageComponent({ config, documents }: PageComponentProps) {
  const field = configString(config, "timeField", "timeClassification");
  const title = configString(config, "title", "TIME classification");
  return (
    <ComponentShell title={title}>
      <ClassificationGrid
        documents={documents}
        field={field}
        categories={TIME_CATEGORIES}
        colors={TIME_COLORS}
      />
    </ComponentShell>
  );
}
